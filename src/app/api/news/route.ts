import { NextResponse } from "next/server";

export const runtime = "edge";
export const revalidate = 0;

const API_KEY = "c73c0a7a16508d65d05d53766593037e632e9062";

// ── Types ────────────────────────────────────────────────────────────────────

interface SentimentInfo { score: number; label: string; color: string }

interface NewsItem {
  id: number;
  title: string;
  published_at: string;
  url: string;
  domain: string;
  source: string;
  currencies: string[];
  votes: { positive: number; negative: number; important: number; comments: number };
  sentiment: SentimentInfo;
}

interface CPPost {
  id: number;
  title: string;
  published_at: string;
  url: string;
  domain: string;
  votes: { positive: number; negative: number; important: number; liked: number; disliked: number; lol: number; toxic: number; saved: number; comments: number };
  source: { title: string; domain: string };
  currencies?: Array<{ code: string; title: string; slug: string }>;
  kind: string;
}

interface CPResponse { results: CPPost[] }

// ── Sentiment helpers ─────────────────────────────────────────────────────────

const POSITIVE_WORDS = ["bullish", "surge", "rally", "breakout", "ath", "gain", "rise", "moon", "adoption", "partnership", "launch", "upgrade", "pump", "soar", "recover", "high", "growth", "buy", "support", "approval"];
const NEGATIVE_WORDS = ["bearish", "crash", "dump", "drop", "hack", "ban", "lawsuit", "fear", "correction", "warning", "scam", "fall", "decline", "sell", "plunge", "collapse", "risk", "concern", "loss", "short"];

function keywordSentiment(title: string): SentimentInfo {
  const t = title.toLowerCase();
  const pos = POSITIVE_WORDS.filter((w) => t.includes(w)).length;
  const neg = NEGATIVE_WORDS.filter((w) => t.includes(w)).length;
  if (pos > neg) return { score: 65 + Math.min(pos * 5, 20), label: "Bullish", color: "#00C896" };
  if (neg > pos) return { score: 35 - Math.min(neg * 5, 20), label: "Bearish", color: "#FF3B5C" };
  return { score: 50, label: "Neutral", color: "#F5C518" };
}

function votesSentiment(votes: CPPost["votes"]): SentimentInfo {
  const pos = (votes.positive ?? 0) + (votes.liked ?? 0) + (votes.important ?? 0);
  const neg = (votes.negative ?? 0) + (votes.disliked ?? 0) + (votes.toxic ?? 0);
  const total = pos + neg;
  if (total === 0) return { score: 50, label: "Neutral", color: "#F5C518" };
  const score = Math.round((pos / total) * 100);
  if (score >= 70) return { score, label: "Bullish", color: "#00C896" };
  if (score >= 55) return { score, label: "Slightly Bullish", color: "#AACC00" };
  if (score >= 45) return { score, label: "Neutral", color: "#F5C518" };
  if (score >= 30) return { score, label: "Slightly Bearish", color: "#FF8C42" };
  return { score, label: "Bearish", color: "#FF3B5C" };
}

function detectCoins(title: string): string[] {
  const t = title.toUpperCase();
  const coins: string[] = [];
  if (t.includes("BITCOIN") || t.includes(" BTC")) coins.push("BTC");
  if (t.includes("ETHEREUM") || t.includes(" ETH")) coins.push("ETH");
  if (t.includes("SOLANA") || t.includes(" SOL")) coins.push("SOL");
  if (t.includes("RIPPLE") || t.includes(" XRP")) coins.push("XRP");
  if (t.includes("CARDANO") || t.includes(" ADA")) coins.push("ADA");
  if (t.includes("DOGECOIN") || t.includes(" DOGE")) coins.push("DOGE");
  return coins;
}

// ── CryptoPanic (free tier) ───────────────────────────────────────────────────

async function fetchCryptoPanic(filter: string, currencies?: string): Promise<CPPost[]> {
  try {
    const params = new URLSearchParams({
      auth_token: API_KEY,
      public: "true",
      filter,
      kind: "news",
    });
    if (currencies) params.set("currencies", currencies);

    // Try free endpoint first, then v1
    for (const base of [
      "https://cryptopanic.com/api/free/v1/posts/",
      "https://cryptopanic.com/api/v1/posts/",
    ]) {
      try {
        const res = await fetch(`${base}?${params}`, { cache: "no-store" });
        console.log(`CryptoPanic ${base} status:`, res.status);
        if (!res.ok) continue;
        const json: CPResponse = await res.json();
        console.log(`CryptoPanic results count:`, json.results?.length ?? 0);
        if (json.results && json.results.length > 0) return json.results;
      } catch (err) {
        console.log(`CryptoPanic fetch error:`, err);
      }
    }
    return [];
  } catch {
    return [];
  }
}

function mapCPPost(p: CPPost): NewsItem {
  return {
    id: p.id,
    title: p.title,
    published_at: p.published_at,
    url: p.url,
    domain: p.source?.domain ?? p.domain ?? "",
    source: p.source?.title ?? p.domain ?? "",
    currencies: p.currencies?.map((c) => c.code) ?? [],
    votes: {
      positive: p.votes.positive ?? 0,
      negative: p.votes.negative ?? 0,
      important: p.votes.important ?? 0,
      comments: p.votes.comments ?? 0,
    },
    sentiment: votesSentiment(p.votes),
  };
}

// ── RSS fallback ──────────────────────────────────────────────────────────────

const RSS_FEEDS: Array<{ name: string; domain: string; url: string }> = [
  { name: "CoinTelegraph", domain: "cointelegraph.com", url: "https://cointelegraph.com/rss" },
  { name: "CoinDesk", domain: "coindesk.com", url: "https://feeds.feedburner.com/CoinDesk" },
  { name: "Decrypt", domain: "decrypt.co", url: "https://decrypt.co/feed" },
  { name: "Bitcoin Magazine", domain: "bitcoinmagazine.com", url: "https://bitcoinmagazine.com/.rss/full/" },
];

function extractTag(xml: string, tag: string): string {
  // Handle CDATA
  const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i");
  const cdataMatch = xml.match(cdataRe);
  if (cdataMatch) return cdataMatch[1].trim();
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(re);
  return match ? match[1].replace(/<[^>]+>/g, "").trim() : "";
}

async function fetchRSS(feed: typeof RSS_FEEDS[0]): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml, */*" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const text = await res.text();

    const itemRe = /<item[\s>]([\s\S]*?)<\/item>/gi;
    const items: NewsItem[] = [];
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = itemRe.exec(text)) !== null && items.length < 10) {
      const chunk = match[1];
      const title = extractTag(chunk, "title");
      const link = extractTag(chunk, "link") || extractTag(chunk, "guid");
      const pubDate = extractTag(chunk, "pubDate");
      if (!title || !link) continue;

      let published_at: string;
      try {
        published_at = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
      } catch {
        published_at = new Date().toISOString();
      }

      items.push({
        id: Date.now() + idx++,
        title,
        published_at,
        url: link,
        domain: feed.domain,
        source: feed.name,
        currencies: detectCoins(title),
        votes: { positive: 0, negative: 0, important: 0, comments: 0 },
        sentiment: keywordSentiment(title),
      });
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchAllRSS(): Promise<NewsItem[]> {
  const results = await Promise.all(RSS_FEEDS.map(fetchRSS));
  const all = results.flat();
  // Deduplicate by title similarity, sort by date
  const seen = new Set<string>();
  return all
    .filter((item) => {
      const key = item.title.slice(0, 60).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
}

// ── Sentiment aggregation ─────────────────────────────────────────────────────

function aggregateSentiment(items: NewsItem[]) {
  const breakdown = items.reduce(
    (acc, item) => {
      acc.total++;
      if (item.sentiment.score >= 55) acc.bullish++;
      else if (item.sentiment.score < 45) acc.bearish++;
      else acc.neutral++;
      return acc;
    },
    { total: 0, bullish: 0, neutral: 0, bearish: 0 }
  );

  const marketSentiment: SentimentInfo =
    breakdown.total === 0
      ? { label: "Neutral", color: "#F5C518", score: 50 }
      : breakdown.bullish > breakdown.bearish
      ? { label: "Bullish", color: "#00C896", score: Math.round((breakdown.bullish / breakdown.total) * 100) }
      : breakdown.bearish > breakdown.bullish
      ? { label: "Bearish", color: "#FF3B5C", score: Math.round((breakdown.bearish / breakdown.total) * 100) }
      : { label: "Neutral", color: "#F5C518", score: 50 };

  return { marketSentiment, sentimentBreakdown: breakdown };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // Try CryptoPanic first
    const [cpHot, cpRising, cpBtc, cpEth] = await Promise.all([
      fetchCryptoPanic("hot"),
      fetchCryptoPanic("rising"),
      fetchCryptoPanic("hot", "BTC"),
      fetchCryptoPanic("hot", "ETH"),
    ]);

    const useCryptoPanic = cpHot.length > 0;
    console.log("Using CryptoPanic:", useCryptoPanic, "hot count:", cpHot.length);

    let hot: NewsItem[], rising: NewsItem[], btc: NewsItem[], eth: NewsItem[];

    if (useCryptoPanic) {
      hot = cpHot.map(mapCPPost);
      rising = cpRising.map(mapCPPost);
      btc = cpBtc.map(mapCPPost);
      eth = cpEth.map(mapCPPost);
    } else {
      // RSS fallback
      console.log("Falling back to RSS feeds");
      const rssItems = await fetchAllRSS();
      hot = rssItems;
      rising = [...rssItems].sort(() => Math.random() - 0.5).slice(0, 10);
      btc = rssItems.filter((i) => i.currencies.includes("BTC"));
      eth = rssItems.filter((i) => i.currencies.includes("ETH"));
    }

    const { marketSentiment, sentimentBreakdown } = aggregateSentiment(hot);

    return NextResponse.json(
      {
        hot,
        rising,
        btc,
        eth,
        marketSentiment,
        sentimentBreakdown,
        source: useCryptoPanic ? "cryptopanic" : "rss",
        timestamp: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
