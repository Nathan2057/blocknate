"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";

interface SentimentInfo {
  score: number;
  label: string;
  color: string;
}

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

interface NewsData {
  hot: NewsItem[];
  rising: NewsItem[];
  btc: NewsItem[];
  eth: NewsItem[];
  marketSentiment: SentimentInfo;
  sentimentBreakdown: { total: number; bullish: number; neutral: number; bearish: number };
  source?: string;
  timestamp: string;
  error?: string;
}

function timeAgo(dateStr: string) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "";
  }
}

function SentimentBadge({ sentiment }: { sentiment: SentimentInfo }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 3,
      fontSize: "0.65rem",
      fontWeight: 700,
      background: `${sentiment.color}18`,
      color: sentiment.color,
      border: `1px solid ${sentiment.color}30`,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
    }}>
      {sentiment.label}
    </span>
  );
}

function CurrencyTag({ code }: { code: string }) {
  return (
    <span style={{
      padding: "1px 6px",
      borderRadius: 2,
      fontSize: "0.6rem",
      fontWeight: 700,
      background: "#0066FF18",
      color: "#0066FF",
      border: "1px solid #0066FF30",
    }}>
      {code}
    </span>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        textDecoration: "none",
        background: "#0C1018",
        border: "1px solid #1C2236",
        borderLeft: `3px solid ${item.sentiment.color}`,
        borderRadius: 4,
        padding: "14px 16px",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#E8ECF4", fontSize: "0.88rem", fontWeight: 600, lineHeight: 1.4, marginBottom: 6 }}>
            {item.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <SentimentBadge sentiment={item.sentiment} />
            {item.currencies.slice(0, 3).map((c) => <CurrencyTag key={c} code={c} />)}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#4A5568", fontSize: "0.7rem" }}>{item.source}</span>
          <span style={{ color: "#2A3448", fontSize: "0.7rem" }}>•</span>
          <span style={{ color: "#4A5568", fontSize: "0.7rem" }}>{timeAgo(item.published_at)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {item.votes.positive > 0 && (
            <span style={{ color: "#00C896", fontSize: "0.68rem" }}>▲ {item.votes.positive}</span>
          )}
          {item.votes.negative > 0 && (
            <span style={{ color: "#FF3B5C", fontSize: "0.68rem" }}>▼ {item.votes.negative}</span>
          )}
          {item.votes.comments > 0 && (
            <span style={{ color: "#4A5568", fontSize: "0.68rem" }}>💬 {item.votes.comments}</span>
          )}
        </div>
      </div>
    </a>
  );
}

function SidebarNewsItem({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        textDecoration: "none",
        padding: "10px 14px",
        borderBottom: "1px solid #1C223640",
      }}
    >
      <div style={{ color: "#E8ECF4", fontSize: "0.8rem", fontWeight: 500, lineHeight: 1.4, marginBottom: 5 }}>
        {item.title}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <SentimentBadge sentiment={item.sentiment} />
        <span style={{ color: "#4A5568", fontSize: "0.65rem" }}>{timeAgo(item.published_at)}</span>
      </div>
    </a>
  );
}

const TABS = ["Hot", "Rising", "BTC", "ETH"] as const;
type Tab = (typeof TABS)[number];

export default function NewsPage() {
  const [data, setData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Hot");
  const [sentimentFilter, setSentimentFilter] = useState<"all" | "bullish" | "bearish" | "neutral">("all");

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/news")
      .then((r) => r.json())
      .then((d: NewsData) => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load news"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tabItems: NewsItem[] = data
    ? activeTab === "Hot"
      ? data.hot
      : activeTab === "Rising"
      ? data.rising
      : activeTab === "BTC"
      ? data.btc
      : data.eth
    : [];

  const filtered = tabItems.filter((item) => {
    if (sentimentFilter === "all") return true;
    const score = item.sentiment.score;
    if (sentimentFilter === "bullish") return score >= 55;
    if (sentimentFilter === "bearish") return score < 45;
    return score >= 45 && score < 55;
  });

  const ms = data?.marketSentiment;
  const sb = data?.sentimentBreakdown;

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#E8ECF4", fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>
            News &amp; Sentiment
          </h1>
          {data?.source && (
            <div style={{ color: "#4A5568", fontSize: "0.65rem", marginTop: 3 }}>
              Source: {data.source === "cryptopanic" ? "CryptoPanic" : "RSS Feeds (CoinTelegraph, CoinDesk, Decrypt)"}
            </div>
          )}
        </div>
        <button
          onClick={load}
          style={{
            background: "#0C1018",
            border: "1px solid #1C2236",
            borderRadius: 4,
            color: "#8892A4",
            fontSize: "0.75rem",
            padding: "6px 14px",
            cursor: "pointer",
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Sentiment overview cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderLeft: `3px solid ${ms?.color ?? "#0066FF"}`, borderRadius: 4, padding: 16 }}>
          <div style={{ color: "#8892A4", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Market Mood</div>
          {loading ? (
            <div style={{ height: 32, background: "#1C2236", borderRadius: 3 }} />
          ) : (
            <>
              <div style={{ fontSize: "1.6rem", fontWeight: 900, color: ms?.color ?? "#8892A4" }}>{ms?.label}</div>
              <div style={{ color: "#4A5568", fontSize: "0.7rem", marginTop: 4 }}>Based on recent news</div>
            </>
          )}
        </div>

        {[
          { label: "Bullish Articles", key: "bullish" as const, color: "#00C896" },
          { label: "Neutral Articles", key: "neutral" as const, color: "#F5C518" },
          { label: "Bearish Articles", key: "bearish" as const, color: "#FF3B5C" },
        ].map(({ label, key, color }) => (
          <div key={key} style={{ background: "#0C1018", border: "1px solid #1C2236", borderLeft: `3px solid ${color}`, borderRadius: 4, padding: 16 }}>
            <div style={{ color: "#8892A4", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{label}</div>
            {loading ? (
              <div style={{ height: 32, background: "#1C2236", borderRadius: 3 }} />
            ) : (
              <>
                <div style={{ fontSize: "1.6rem", fontWeight: 900, color }}>{sb?.[key] ?? 0}</div>
                <div style={{ color: "#4A5568", fontSize: "0.7rem", marginTop: 4 }}>
                  {sb && sb.total > 0 ? `${Math.round((sb[key] / sb.total) * 100)}% of total` : "—"}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Sentiment bar */}
      {!loading && sb && sb.total > 0 && (
        <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, padding: 16, marginBottom: 20 }}>
          <div style={{ color: "#8892A4", fontSize: "0.72rem", marginBottom: 8 }}>Sentiment Distribution</div>
          <div style={{ display: "flex", height: 12, borderRadius: 3, overflow: "hidden", gap: 2 }}>
            <div style={{ width: `${(sb.bullish / sb.total) * 100}%`, background: "#00C896", borderRadius: 2 }} />
            <div style={{ width: `${(sb.neutral / sb.total) * 100}%`, background: "#F5C518", borderRadius: 2 }} />
            <div style={{ width: `${(sb.bearish / sb.total) * 100}%`, background: "#FF3B5C", borderRadius: 2 }} />
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
            {[{ label: "Bullish", color: "#00C896", count: sb.bullish }, { label: "Neutral", color: "#F5C518", count: sb.neutral }, { label: "Bearish", color: "#FF3B5C", count: sb.bearish }].map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                <span style={{ color: "#8892A4", fontSize: "0.7rem" }}>{s.label}: <strong style={{ color: "#E8ECF4" }}>{s.count}</strong></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
        {/* Main column */}
        <div>
          {/* Tab bar + sentiment filter */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 4,
                    border: "1px solid",
                    borderColor: activeTab === tab ? "#0066FF" : "#1C2236",
                    background: activeTab === tab ? "#0066FF18" : "#0C1018",
                    color: activeTab === tab ? "#0066FF" : "#8892A4",
                    fontSize: "0.78rem",
                    fontWeight: activeTab === tab ? 700 : 400,
                    cursor: "pointer",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {(["all", "bullish", "neutral", "bearish"] as const).map((f) => {
                const colors: Record<string, string> = { all: "#8892A4", bullish: "#00C896", neutral: "#F5C518", bearish: "#FF3B5C" };
                return (
                  <button
                    key={f}
                    onClick={() => setSentimentFilter(f)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: sentimentFilter === f ? colors[f] : "#1C2236",
                      background: sentimentFilter === f ? `${colors[f]}18` : "#0C1018",
                      color: sentimentFilter === f ? colors[f] : "#4A5568",
                      fontSize: "0.68rem",
                      fontWeight: sentimentFilter === f ? 700 : 400,
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          {/* News list */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height: 100, background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, padding: "14px 16px" }}>
                  <div style={{ height: 16, width: "80%", background: "#1C2236", borderRadius: 3, marginBottom: 10 }} />
                  <div style={{ height: 12, width: "50%", background: "#1C2236", borderRadius: 3, marginBottom: 8 }} />
                  <div style={{ height: 10, width: "30%", background: "#1C2236", borderRadius: 3 }} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div style={{ background: "#0C1018", border: "1px solid #FF3B5C40", borderLeft: "3px solid #FF3B5C", borderRadius: 4, padding: 32, textAlign: "center" }}>
              <div style={{ color: "#FF3B5C", fontWeight: 700, fontSize: "0.9rem", marginBottom: 8 }}>Failed to load news</div>
              <div style={{ color: "#4A5568", fontSize: "0.78rem", marginBottom: 20 }}>{error}</div>
              <button
                onClick={load}
                style={{ background: "#0066FF", border: "none", borderRadius: 4, color: "#fff", fontSize: "0.8rem", padding: "8px 20px", cursor: "pointer", fontWeight: 600 }}
              >
                Try Again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, padding: 40, textAlign: "center" }}>
              <div style={{ color: "#4A5568", fontSize: "0.85rem", marginBottom: 12 }}>No articles found for the selected filter.</div>
              <button
                onClick={() => setSentimentFilter("all")}
                style={{ background: "transparent", border: "1px solid #1C2236", borderRadius: 3, color: "#8892A4", fontSize: "0.75rem", padding: "6px 14px", cursor: "pointer" }}
              >
                Show All
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Trending */}
          <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ background: "#080C14", borderBottom: "1px solid #1C2236", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 14, background: "#F5C518", borderRadius: 2 }} />
              <span style={{ color: "#E8ECF4", fontWeight: 700, fontSize: "0.82rem" }}>Trending Now</span>
            </div>
            {loading ? (
              <div style={{ padding: 14 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ height: 60, background: "#1C2236", borderRadius: 3, marginBottom: 8 }} />
                ))}
              </div>
            ) : (
              (data?.rising ?? []).slice(0, 5).map((item) => (
                <SidebarNewsItem key={item.id} item={item} />
              ))
            )}
          </div>

          {/* BTC */}
          <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ background: "#080C14", borderBottom: "1px solid #1C2236", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 14, background: "#FF8C42", borderRadius: 2 }} />
              <span style={{ color: "#E8ECF4", fontWeight: 700, fontSize: "0.82rem" }}>Bitcoin News</span>
            </div>
            {loading ? (
              <div style={{ padding: 14 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ height: 60, background: "#1C2236", borderRadius: 3, marginBottom: 8 }} />
                ))}
              </div>
            ) : (
              (data?.btc ?? []).slice(0, 4).map((item) => (
                <SidebarNewsItem key={item.id} item={item} />
              ))
            )}
          </div>

          {/* ETH */}
          <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ background: "#080C14", borderBottom: "1px solid #1C2236", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 14, background: "#627EEA", borderRadius: 2 }} />
              <span style={{ color: "#E8ECF4", fontWeight: 700, fontSize: "0.82rem" }}>Ethereum News</span>
            </div>
            {loading ? (
              <div style={{ padding: 14 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ height: 60, background: "#1C2236", borderRadius: 3, marginBottom: 8 }} />
                ))}
              </div>
            ) : (
              (data?.eth ?? []).slice(0, 4).map((item) => (
                <SidebarNewsItem key={item.id} item={item} />
              ))
            )}
          </div>

          {/* Sentiment score */}
          {!loading && ms && (
            <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderLeft: `3px solid ${ms.color}`, borderRadius: 4, padding: 16 }}>
              <div style={{ color: "#8892A4", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Sentiment Score</div>
              <div style={{ position: "relative", height: 8, background: "#1C2236", borderRadius: 4, marginBottom: 12, overflow: "hidden" }}>
                <div style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: `${ms.score}%`,
                  background: "linear-gradient(to right, #FF3B5C, #F5C518, #00C896)",
                  borderRadius: 4,
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: ms.color, fontWeight: 900, fontSize: "1.4rem" }}>{ms.score}</span>
                <span style={{
                  background: `${ms.color}18`,
                  color: ms.color,
                  border: `1px solid ${ms.color}30`,
                  borderRadius: 3,
                  padding: "3px 10px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}>
                  {ms.label}
                </span>
              </div>
              <div style={{ color: "#4A5568", fontSize: "0.68rem", marginTop: 8 }}>
                Scored from {sb?.total ?? 0} articles
              </div>
            </div>
          )}

          {/* Tips */}
          <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderLeft: "3px solid #0066FF", borderRadius: 4, padding: 16 }}>
            <div style={{ color: "#E8ECF4", fontWeight: 700, fontSize: "0.82rem", marginBottom: 10 }}>News Trading Tips</div>
            <ul style={{ color: "#8892A4", fontSize: "0.75rem", lineHeight: 1.8, margin: 0, paddingLeft: 16 }}>
              <li>High-impact news drives short-term volatility — not always trend-changing</li>
              <li>Bullish news in a downtrend = dead cat bounce risk</li>
              <li>Wait for price confirmation before entering on news</li>
              <li>Watch multiple sources — one outlet can be misleading</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
