"use client";

import { useEffect, useRef, useState } from "react";

interface GlobalData {
  data: {
    market_cap_percentage: Record<string, number>;
    total_market_cap: { usd: number };
  };
}

function StatCard({
  label,
  value,
  sub,
  accent,
  desc,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  desc: string;
}) {
  return (
    <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderLeft: `3px solid ${accent}`, borderRadius: 4, padding: 20 }}>
      <div style={{ color: "#8892A4", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ color: accent, fontSize: "2.2rem", fontWeight: 900, lineHeight: 1, marginBottom: 4 }}>
        {value}
      </div>
      {sub && <div style={{ color: "#8892A4", fontSize: "0.75rem", marginBottom: 8 }}>{sub}</div>}
      <div style={{ color: "#4A5568", fontSize: "0.72rem", lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

export default function BTCDominancePage() {
  const [globalData, setGlobalData] = useState<GlobalData | null>(null);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/global")
      .then((r) => r.json())
      .then((d: GlobalData) => setGlobalData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.height = "100%";
    wrapper.style.width = "100%";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "CRYPTOCAP:BTC.D",
      interval: "W",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "3",
      locale: "en",
      backgroundColor: "#0C1018",
      gridColor: "#1C2236",
      allow_symbol_change: false,
      calendar: false,
      hide_top_toolbar: false,
      support_host: "https://www.tradingview.com",
    });

    wrapper.appendChild(widgetDiv);
    wrapper.appendChild(script);
    chart.appendChild(wrapper);

    return () => {
      chart.innerHTML = "";
    };
  }, []);

  const pct = globalData?.data?.market_cap_percentage ?? {};
  const btcDom = pct.btc?.toFixed(1) ?? "—";
  const ethDom = pct.eth?.toFixed(1) ?? "—";
  const othersDom = pct.btc != null && pct.eth != null
    ? (100 - pct.btc - pct.eth).toFixed(1)
    : "—";

  // Interpret dominance
  const btcVal = parseFloat(btcDom);
  let signal = "Neutral";
  let signalColor = "#F5C518";
  if (!isNaN(btcVal)) {
    if (btcVal > 55) { signal = "Bitcoin Season"; signalColor = "#FF8C42"; }
    else if (btcVal < 45) { signal = "Altcoin Season"; signalColor = "#00C896"; }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <h1 style={{ color: "#E8ECF4", fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>BTC Dominance</h1>
        {!loading && (
          <span style={{ background: `${signalColor}20`, color: signalColor, border: `1px solid ${signalColor}40`, borderRadius: 20, padding: "3px 12px", fontSize: "0.75rem", fontWeight: 700 }}>
            {signal}
          </span>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} style={{ height: 120, background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4 }} />
          ))
        ) : (
          <>
            <StatCard
              label="BTC Dominance"
              value={`${btcDom}%`}
              accent="#F7931A"
              desc="Bitcoin's share of total crypto market cap"
            />
            <StatCard
              label="ETH Dominance"
              value={`${ethDom}%`}
              accent="#627EEA"
              desc="Ethereum's share of total crypto market cap"
            />
            <StatCard
              label="Others"
              value={`${othersDom}%`}
              accent="#00C896"
              desc="All altcoins combined (excl. BTC & ETH)"
            />
          </>
        )}
      </div>

      {/* TradingView chart */}
      <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, overflow: "hidden", marginBottom: 20, height: 500 }}>
        <div style={{ background: "#080C14", borderBottom: "1px solid #1C2236", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#E8ECF4", fontWeight: 700, fontSize: "0.88rem" }}>CRYPTOCAP:BTC.D</span>
          <span style={{ color: "#4A5568", fontSize: "0.72rem" }}>Weekly</span>
          <span style={{ background: "rgba(0,102,255,0.1)", border: "1px solid #0066FF", color: "#0066FF", fontSize: "0.65rem", padding: "2px 6px", borderRadius: 2, fontWeight: 600, marginLeft: "auto" }}>
            LIVE
          </span>
        </div>
        <div ref={chartRef} style={{ height: "calc(100% - 41px)" }} />
      </div>

      {/* Explanation */}
      <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderLeft: "3px solid #F7931A", borderRadius: 4, padding: 20 }}>
        <h2 style={{ color: "#E8ECF4", fontWeight: 700, fontSize: "1rem", margin: "0 0 16px" }}>
          Understanding BTC Dominance
        </h2>
        <p style={{ color: "#8892A4", fontSize: "0.83rem", lineHeight: 1.7, margin: "0 0 16px" }}>
          BTC dominance measures Bitcoin&apos;s market cap as a percentage of the total cryptocurrency market cap.
          It&apos;s one of the most important macro indicators for crypto traders.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {[
            { title: "Rising BTC Dominance", color: "#F7931A", points: ["BTC outperforming altcoins", "Risk-off environment — traders prefer BTC safety", "Altcoins likely underperforming or bleeding", "Consider reducing altcoin exposure"] },
            { title: "Falling BTC Dominance", color: "#00C896", points: ["Altcoin season may be starting", "Traders rotating profits from BTC into alts", "Higher-beta plays become more attractive", "Look for breakout setups in altcoins"] },
            { title: "Key Levels to Watch", color: "#0066FF", points: ["Above 55%: Strong BTC season", "50–55%: BTC slightly dominant", "45–50%: Balanced market", "Below 45%: Altcoin season territory"] },
          ].map(({ title, color, points }) => (
            <div key={title} style={{ background: "#06080F", borderRadius: 3, padding: 14, borderLeft: `3px solid ${color}` }}>
              <div style={{ color, fontWeight: 700, fontSize: "0.83rem", marginBottom: 10 }}>{title}</div>
              <ul style={{ color: "#8892A4", fontSize: "0.78rem", lineHeight: 1.8, margin: 0, paddingLeft: 16 }}>
                {points.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
