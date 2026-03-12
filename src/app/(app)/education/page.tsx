"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = "guide" | "strategy" | "pattern" | "glossary";

interface Article {
  id: string;
  title: string;
  category: Category;
  content: string | null;
  excerpt: string | null;
  read_time: number;
  published: boolean;
  created_at: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CAT_COLOR: Record<Category, string> = {
  guide: "#0066FF",
  strategy: "#00C896",
  pattern: "#F59E0B",
  glossary: "#8892A4",
};

const TABS = ["ALL", "GUIDES", "STRATEGIES", "PATTERNS", "GLOSSARY"] as const;
type Tab = (typeof TABS)[number];

const TAB_CAT: Partial<Record<Tab, Category>> = {
  GUIDES: "guide",
  STRATEGIES: "strategy",
  PATTERNS: "pattern",
  GLOSSARY: "glossary",
};

// ── Glossary ──────────────────────────────────────────────────────────────────

const GLOSSARY = [
  { term: "ATH", definition: "All-Time High — the highest price ever reached by an asset.", letter: "A" },
  { term: "ATL", definition: "All-Time Low — the lowest price ever reached by an asset.", letter: "A" },
  { term: "BUIDL", definition: "A misspelling of 'build', used to describe the act of building crypto projects regardless of market conditions.", letter: "B" },
  { term: "Bull Market", definition: "A market condition where prices are rising or expected to rise.", letter: "B" },
  { term: "Bear Market", definition: "A market condition where prices are falling or expected to fall.", letter: "B" },
  { term: "DCA", definition: "Dollar Cost Averaging — investing fixed amounts at regular intervals to reduce impact of volatility.", letter: "D" },
  { term: "DeFi", definition: "Decentralized Finance — financial services built on blockchain without traditional intermediaries.", letter: "D" },
  { term: "DYOR", definition: "Do Your Own Research — always research before investing.", letter: "D" },
  { term: "FOMO", definition: "Fear Of Missing Out — buying due to fear of missing a price increase.", letter: "F" },
  { term: "FUD", definition: "Fear, Uncertainty, Doubt — negative information spread to drive prices down.", letter: "F" },
  { term: "Gas", definition: "Fee paid to execute transactions on a blockchain network.", letter: "G" },
  { term: "HODL", definition: "Hold On for Dear Life — long-term holding strategy regardless of volatility.", letter: "H" },
  { term: "Leverage", definition: "Using borrowed capital to increase potential returns (and risks).", letter: "L" },
  { term: "Liquidation", definition: "When a leveraged position is forcibly closed due to insufficient margin.", letter: "L" },
  { term: "Long", definition: "Betting that an asset's price will increase.", letter: "L" },
  { term: "Market Cap", definition: "Total value of all coins in circulation (price × supply).", letter: "M" },
  { term: "Moon", definition: "When a cryptocurrency's price rises dramatically.", letter: "M" },
  { term: "NFT", definition: "Non-Fungible Token — unique digital asset on a blockchain.", letter: "N" },
  { term: "Order Book", definition: "List of buy and sell orders for an asset at various price levels.", letter: "O" },
  { term: "PnL", definition: "Profit and Loss — the realized or unrealized gains/losses on a trade.", letter: "P" },
  { term: "Pump and Dump", definition: "Artificially inflating price then selling — illegal market manipulation.", letter: "P" },
  { term: "Rekt", definition: "Suffering significant losses in a trade.", letter: "R" },
  { term: "ROI", definition: "Return on Investment — percentage gain or loss on an investment.", letter: "R" },
  { term: "Short", definition: "Betting that an asset's price will decrease.", letter: "S" },
  { term: "Slippage", definition: "Difference between expected and actual execution price.", letter: "S" },
  { term: "Stablecoin", definition: "Cryptocurrency pegged to a stable asset like USD.", letter: "S" },
  { term: "Stop Loss", definition: "Order to sell when price reaches a set level to limit losses.", letter: "S" },
  { term: "Take Profit", definition: "Order to sell when price reaches a target to lock in gains.", letter: "T" },
  { term: "Volatility", definition: "Degree of price variation over time — high volatility = big swings.", letter: "V" },
  { term: "Whale", definition: "An entity holding a large enough amount of crypto to influence market prices.", letter: "W" },
];

const LETTERS = Array.from(new Set(GLOSSARY.map((g) => g.letter))).sort();

// ── Chart Pattern SVGs ────────────────────────────────────────────────────────

function HeadShouldersSVG() {
  return (
    <svg viewBox="0 0 120 60" style={{ width: "100%", height: 60 }}>
      <polyline points="5,55 20,40 30,48 45,20 60,48 75,30 90,48 105,40 115,55"
        fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinejoin="round" />
      <line x1="15" y1="43" x2="105" y2="43" stroke="#FF3B5C" strokeWidth="1" strokeDasharray="3,2" opacity="0.6" />
    </svg>
  );
}

function BullFlagSVG() {
  return (
    <svg viewBox="0 0 120 60" style={{ width: "100%", height: 60 }}>
      <polyline points="5,55 35,15" fill="none" stroke="#00C896" strokeWidth="2" />
      <polyline points="35,15 50,22 40,28 55,34 45,40 60,46"
        fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinejoin="round" />
      <polyline points="60,46 90,10" fill="none" stroke="#00C896" strokeWidth="2" strokeDasharray="4,2" />
    </svg>
  );
}

function DoubleBottomSVG() {
  return (
    <svg viewBox="0 0 120 60" style={{ width: "100%", height: 60 }}>
      <polyline points="5,15 25,50 45,25 65,50 85,15 110,10"
        fill="none" stroke="#00C896" strokeWidth="2" strokeLinejoin="round" />
      <line x1="5" y1="25" x2="110" y2="25" stroke="#0066FF" strokeWidth="1" strokeDasharray="3,2" opacity="0.5" />
    </svg>
  );
}

function TriangleSVG() {
  return (
    <svg viewBox="0 0 120 60" style={{ width: "100%", height: 60 }}>
      <line x1="5" y1="15" x2="110" y2="28" stroke="#F59E0B" strokeWidth="2" />
      <line x1="5" y1="50" x2="110" y2="35" stroke="#F59E0B" strokeWidth="2" />
      <line x1="110" y1="28" x2="110" y2="35" stroke="#0066FF" strokeWidth="1.5" strokeDasharray="3,2" />
      <polyline points="5,50 20,35 35,44 50,30 65,38 80,28 95,32 110,28"
        fill="none" stroke="#8892A4" strokeWidth="1.5" strokeLinejoin="round" opacity="0.5" />
    </svg>
  );
}

function BullishEngulfingSVG() {
  return (
    <svg viewBox="0 0 120 60" style={{ width: "100%", height: 60 }}>
      {/* Bearish candle */}
      <rect x="35" y="20" width="18" height="22" fill="#FF3B5C" rx="1" />
      <line x1="44" y1="14" x2="44" y2="20" stroke="#FF3B5C" strokeWidth="1.5" />
      <line x1="44" y1="42" x2="44" y2="48" stroke="#FF3B5C" strokeWidth="1.5" />
      {/* Bullish engulfing candle */}
      <rect x="60" y="14" width="22" height="34" fill="#00C896" rx="1" />
      <line x1="71" y1="8" x2="71" y2="14" stroke="#00C896" strokeWidth="1.5" />
      <line x1="71" y1="48" x2="71" y2="54" stroke="#00C896" strokeWidth="1.5" />
    </svg>
  );
}

const PATTERNS = [
  { name: "Head and Shoulders", type: "Reversal", typeColor: "#FF3B5C", desc: "Bearish reversal pattern with three peaks — the middle being highest.", Svg: HeadShouldersSVG },
  { name: "Bull Flag", type: "Continuation", typeColor: "#00C896", desc: "Uptrend followed by a consolidation channel before resuming upward.", Svg: BullFlagSVG },
  { name: "Double Bottom", type: "Reversal", typeColor: "#00C896", desc: "W-shaped pattern signaling bullish reversal after two equal lows.", Svg: DoubleBottomSVG },
  { name: "Triangle", type: "Continuation", typeColor: "#F59E0B", desc: "Converging price action — breakout direction indicates next trend.", Svg: TriangleSVG },
  { name: "Bullish Engulfing", type: "Reversal", typeColor: "#00C896", desc: "A large green candle fully engulfs the prior red candle — strong buy signal.", Svg: BullishEngulfingSVG },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function CategoryBadge({ cat }: { cat: Category }) {
  const color = CAT_COLOR[cat];
  const label = cat.charAt(0).toUpperCase() + cat.slice(1);
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 3,
      fontSize: "0.65rem",
      fontWeight: 700,
      background: `${color}18`,
      color,
      border: `1px solid ${color}30`,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
    }}>
      {label}
    </span>
  );
}

function ArticleCard({ article, onClick }: { article: Article; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const color = CAT_COLOR[article.category];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#0C1018",
        border: "1px solid #1C2236",
        borderTop: `3px solid ${color}`,
        borderRadius: 4,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        transform: hovered ? "translateY(-3px)" : "none",
        boxShadow: hovered ? "0 8px 24px rgba(0,102,255,0.15)" : "none",
        transition: "transform 200ms, box-shadow 200ms",
      }}
    >
      {/* Header */}
      <div style={{ padding: "14px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <CategoryBadge cat={article.category} />
        <span style={{ color: "#4A5568", fontSize: "0.65rem" }}>{article.read_time} min read</span>
      </div>

      {/* Body */}
      <div style={{ padding: "10px 16px", flex: 1 }}>
        <div style={{ color: "#E8ECF4", fontWeight: 600, fontSize: "0.95rem", lineHeight: 1.4, marginBottom: 8 }}>
          {article.title}
        </div>
        {article.excerpt && (
          <div style={{
            color: "#8892A4",
            fontSize: "0.8rem",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {article.excerpt}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "10px 16px",
        borderTop: "1px solid #1C2236",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{ color: "#0066FF", fontSize: "0.78rem", fontWeight: 600 }}>
          📖 Read Article
        </span>
        <span style={{ color: "#4A5568", fontSize: "0.68rem" }}>
          {new Date(article.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>
    </div>
  );
}

function renderContent(content: string) {
  if (!content) return <p style={{ color: "#8892A4" }}>Content coming soon...</p>;

  const lines = content.split("\n");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />;

        if (line.startsWith("## ")) return (
          <h2 key={i} style={{ color: "#FFFFFF", fontSize: "1.1rem", fontWeight: 700, marginTop: 20, marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #1C2236" }}>
            {line.replace("## ", "")}
          </h2>
        );

        if (line.startsWith("✅") || line.startsWith("❌")) {
          const isPos = line.startsWith("✅");
          return (
            <div key={i} style={{ padding: "7px 12px", borderRadius: 3, background: isPos ? "rgba(0,200,150,0.07)" : "rgba(255,59,92,0.07)", borderLeft: `2px solid ${isPos ? "#00C896" : "#FF3B5C"}`, color: "#CBD5E1", fontSize: "0.86rem", lineHeight: 1.6 }}>
              {line}
            </div>
          );
        }

        if (line.startsWith("- ")) return (
          <div key={i} style={{ display: "flex", gap: 8, paddingLeft: 8, color: "#8892A4", fontSize: "0.88rem", lineHeight: 1.7 }}>
            <span style={{ color: "#0066FF", flexShrink: 0, marginTop: 2 }}>•</span>
            <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, "<strong style=\"color:#e2e8f0\">$1</strong>") }} />
          </div>
        );

        if (/^\d+\./.test(line)) return (
          <div key={i} style={{ display: "flex", gap: 8, paddingLeft: 8, color: "#8892A4", fontSize: "0.88rem", lineHeight: 1.7 }}>
            <span style={{ color: "#0066FF", flexShrink: 0, fontWeight: 700, minWidth: 20 }}>
              {line.match(/^\d+/)?.[0]}.
            </span>
            <span dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s*/, "").replace(/\*\*(.*?)\*\*/g, "<strong style=\"color:#e2e8f0\">$1</strong>") }} />
          </div>
        );

        if (line.startsWith("**") && line.endsWith("**")) return (
          <p key={i} style={{ color: "#FFFFFF", fontWeight: 600, fontSize: "0.92rem", marginTop: 10, marginBottom: 4 }}>
            {line.replace(/\*\*/g, "")}
          </p>
        );

        return (
          <p key={i} style={{ color: "#8892A4", lineHeight: 1.8, fontSize: "0.88rem" }}
            dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<strong style=\"color:#e2e8f0\">$1</strong>") }} />
        );
      })}
    </div>
  );
}

function ArticleModal({ article, onClose }: { article: Article; onClose: () => void }) {
  const color = CAT_COLOR[article.category];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0C1018",
          border: "1px solid #1C2236",
          borderTop: `3px solid ${color}`,
          borderRadius: 4,
          maxWidth: 720,
          width: "100%",
          maxHeight: "82vh",
          overflowY: "auto",
          padding: 36,
          position: "relative",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "#1C2236", border: "none", borderRadius: 3,
            color: "#8892A4", cursor: "pointer", padding: "4px 10px",
            fontSize: "0.85rem",
          }}
        >
          ✕
        </button>

        {/* Meta */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <CategoryBadge cat={article.category} />
          <span style={{ color: "#4A5568", fontSize: "0.72rem" }}>{article.read_time} min read</span>
        </div>

        {/* Title */}
        <h2 style={{ color: "#E8ECF4", fontSize: "1.5rem", fontWeight: 700, margin: "0 0 24px", lineHeight: 1.3, paddingRight: 32 }}>
          {article.title}
        </h2>

        {/* Content */}
        <div style={{ borderTop: "1px solid #1C2236", paddingTop: 20 }}>
          {renderContent(article.content ?? "")}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #1C2236", paddingTop: 16, marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #1C2236",
              borderRadius: 3,
              color: "#8892A4",
              cursor: "pointer",
              padding: "7px 16px",
              fontSize: "0.78rem",
            }}
          >
            ← Back to Articles
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EducationPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("ALL");
  const [search, setSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [activeLetter, setActiveLetter] = useState<string>("ALL");

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    const query = supabase
      .from("articles")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });
    Promise.resolve(query).then(({ data }) => {
      if (data) setArticles(data as Article[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = articles;
    if (activeTab !== "ALL") {
      const cat = TAB_CAT[activeTab];
      list = list.filter((a) => a.category === cat);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q) || (a.excerpt ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [articles, activeTab, search]);

  const counts = useMemo(() => ({
    total: articles.length,
    guide: articles.filter((a) => a.category === "guide").length,
    strategy: articles.filter((a) => a.category === "strategy").length,
    pattern: articles.filter((a) => a.category === "pattern").length,
  }), [articles]);

  const glossaryFiltered = activeLetter === "ALL"
    ? GLOSSARY
    : GLOSSARY.filter((g) => g.letter === activeLetter);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      {/* Modal */}
      {selectedArticle && (
        <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#E8ECF4", fontSize: "1.3rem", fontWeight: 700, margin: "0 0 6px" }}>
          Education Hub
        </h1>
        <p style={{ color: "#8892A4", fontSize: "0.83rem", margin: "0 0 16px" }}>
          Master crypto trading with professional guides, strategies and pattern recognition
        </p>
        {/* Search */}
        <input
          type="text"
          placeholder="Search articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: "#0C1018",
            border: "1px solid #1C2236",
            borderRadius: 4,
            color: "#E8ECF4",
            fontSize: "0.85rem",
            padding: "9px 14px",
            width: "100%",
            maxWidth: 420,
            outline: "none",
          }}
        />
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Articles", value: counts.total, color: "#0066FF" },
          { label: "Guides", value: counts.guide, color: "#0066FF" },
          { label: "Strategies", value: counts.strategy, color: "#00C896" },
          { label: "Patterns", value: counts.pattern, color: "#F59E0B" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "#0C1018", border: "1px solid #1C2236", borderLeft: `3px solid ${color}`, borderRadius: 4, padding: "12px 16px" }}>
            <div style={{ color: "#8892A4", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
            <div style={{ color: "#E8ECF4", fontWeight: 700, fontSize: "1.3rem" }}>{loading ? "—" : value}</div>
          </div>
        ))}
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "7px 16px",
              borderRadius: 4,
              border: "1px solid",
              borderColor: activeTab === tab ? "#0066FF" : "#1C2236",
              background: activeTab === tab ? "#0066FF" : "#0C1018",
              color: activeTab === tab ? "#fff" : "#8892A4",
              fontSize: "0.78rem",
              fontWeight: activeTab === tab ? 700 : 400,
              cursor: "pointer",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Articles grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 180, background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, padding: 16 }}>
              <div style={{ height: 12, width: "40%", background: "#1C2236", borderRadius: 3, marginBottom: 12 }} />
              <div style={{ height: 16, width: "90%", background: "#1C2236", borderRadius: 3, marginBottom: 8 }} />
              <div style={{ height: 12, width: "70%", background: "#1C2236", borderRadius: 3 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, padding: 48, textAlign: "center", marginBottom: 32 }}>
          <div style={{ color: "#4A5568", fontSize: "0.85rem" }}>
            {articles.length === 0
              ? "No articles published yet. Add articles in Supabase to get started."
              : "No articles match your search or filter."}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
          {filtered.map((article) => (
            <ArticleCard key={article.id} article={article} onClick={() => setSelectedArticle(article)} />
          ))}
        </div>
      )}

      {/* Chart Pattern Library */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 3, height: 18, background: "#F59E0B", borderRadius: 2 }} />
            <h2 style={{ color: "#E8ECF4", fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Chart Pattern Library</h2>
          </div>
          <p style={{ color: "#8892A4", fontSize: "0.8rem", margin: "0 0 0 13px" }}>
            Visual guide to the most important crypto chart patterns
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {PATTERNS.map((p) => (
            <div key={p.name} style={{ background: "#0C1018", border: "1px solid #1C2236", borderTop: "3px solid #F59E0B", borderRadius: 4, padding: 16 }}>
              {/* SVG chart */}
              <div style={{ background: "#080C14", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
                <p.Svg />
              </div>
              <div style={{ color: "#E8ECF4", fontWeight: 600, fontSize: "0.82rem", marginBottom: 6 }}>{p.name}</div>
              <div style={{ marginBottom: 6 }}>
                <span style={{
                  padding: "2px 7px",
                  borderRadius: 3,
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  background: `${p.typeColor}18`,
                  color: p.typeColor,
                  border: `1px solid ${p.typeColor}30`,
                }}>
                  {p.type}
                </span>
              </div>
              <p style={{ color: "#8892A4", fontSize: "0.72rem", lineHeight: 1.5, margin: 0 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Glossary */}
      <div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 3, height: 18, background: "#0066FF", borderRadius: 2 }} />
            <h2 style={{ color: "#E8ECF4", fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Trading Glossary</h2>
          </div>
          <p style={{ color: "#8892A4", fontSize: "0.8rem", margin: "0 0 16px 13px" }}>
            Essential terms every crypto trader should know
          </p>
          {/* Letter filter */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {["ALL", ...LETTERS].map((l) => (
              <button
                key={l}
                onClick={() => setActiveLetter(l)}
                style={{
                  padding: "3px 9px",
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: activeLetter === l ? "#0066FF" : "#1C2236",
                  background: activeLetter === l ? "#0066FF18" : "#0C1018",
                  color: activeLetter === l ? "#0066FF" : "#4A5568",
                  fontSize: "0.72rem",
                  fontWeight: activeLetter === l ? 700 : 400,
                  cursor: "pointer",
                  minWidth: 32,
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
          {glossaryFiltered.map((g) => (
            <div key={g.term} style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{
                width: 32, height: 32, borderRadius: 3, flexShrink: 0,
                background: "#0066FF18", color: "#0066FF",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.85rem", fontWeight: 900,
              }}>
                {g.letter}
              </div>
              <div>
                <div style={{ color: "#E8ECF4", fontWeight: 700, fontSize: "0.85rem", marginBottom: 3 }}>{g.term}</div>
                <div style={{ color: "#8892A4", fontSize: "0.75rem", lineHeight: 1.5 }}>{g.definition}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
