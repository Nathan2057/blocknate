import { NextResponse } from "next/server";

export const runtime = "edge";
export const revalidate = 0;

const API_KEY = "c73c0a7a16508d65d05d53766593037e632e9062";
const BASE = "https://cryptopanic.com/api/v1/posts/";

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

interface CPResponse {
  results: CPPost[];
}

function calcSentiment(votes: CPPost["votes"]) {
  const pos = (votes.positive ?? 0) + (votes.liked ?? 0) + (votes.important ?? 0);
  const neg = (votes.negative ?? 0) + (votes.disliked ?? 0) + (votes.toxic ?? 0);
  const total = pos + neg;
  if (total === 0) return { score: 50, label: "Neutral", color: "#8892A4" };
  const score = Math.round((pos / total) * 100);
  if (score >= 70) return { score, label: "Bullish", color: "#00C896" };
  if (score >= 55) return { score, label: "Slightly Bullish", color: "#AACC00" };
  if (score >= 45) return { score, label: "Neutral", color: "#F5C518" };
  if (score >= 30) return { score, label: "Slightly Bearish", color: "#FF8C42" };
  return { score, label: "Bearish", color: "#FF3B5C" };
}

async function fetchCategory(filter: string, currencies?: string): Promise<CPPost[]> {
  try {
    const params = new URLSearchParams({
      auth_token: API_KEY,
      public: "true",
      filter,
      kind: "news",
    });
    if (currencies) params.set("currencies", currencies);
    const res = await fetch(`${BASE}?${params}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json: CPResponse = await res.json();
    return json.results ?? [];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const [hot, rising, btc, eth] = await Promise.all([
      fetchCategory("hot"),
      fetchCategory("rising"),
      fetchCategory("hot", "BTC"),
      fetchCategory("hot", "ETH"),
    ]);

    const mapPost = (p: CPPost) => {
      const sentiment = calcSentiment(p.votes);
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
        sentiment,
      };
    }

    // Overall sentiment from hot posts
    const allVotes = hot.reduce(
      (acc, p) => {
        const s = calcSentiment(p.votes);
        acc.total++;
        if (s.score >= 55) acc.bullish++;
        else if (s.score < 45) acc.bearish++;
        else acc.neutral++;
        return acc;
      },
      { total: 0, bullish: 0, neutral: 0, bearish: 0 }
    );

    const marketSentiment = allVotes.total > 0
      ? allVotes.bullish > allVotes.bearish
        ? { label: "Bullish", color: "#00C896", score: Math.round((allVotes.bullish / allVotes.total) * 100) }
        : allVotes.bearish > allVotes.bullish
        ? { label: "Bearish", color: "#FF3B5C", score: Math.round((allVotes.bearish / allVotes.total) * 100) }
        : { label: "Neutral", color: "#F5C518", score: 50 }
      : { label: "Neutral", color: "#F5C518", score: 50 };

    return NextResponse.json(
      {
        hot: hot.map(mapPost),
        rising: rising.map(mapPost),
        btc: btc.map(mapPost),
        eth: eth.map(mapPost),
        marketSentiment,
        sentimentBreakdown: allVotes,
        timestamp: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
