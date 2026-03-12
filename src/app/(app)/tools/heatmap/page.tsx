"use client";

import { useEffect, useRef } from "react";

export default function HeatmapPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.height = "100%";
    wrapper.style.width = "100%";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      dataSource: "Crypto",
      blockSize: "market_cap_usd",
      colorSize: "change|60",
      grouping: "no_group",
      locale: "en",
      symbolUrl: "",
      colorTheme: "dark",
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
      width: "100%",
      height: "600",
    });

    wrapper.appendChild(widgetDiv);
    wrapper.appendChild(script);
    container.appendChild(wrapper);

    return () => {
      container.innerHTML = "";
    };
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: "#E8ECF4", fontSize: "1.3rem", fontWeight: 700, margin: "0 0 8px" }}>
          Crypto Market Heatmap
        </h1>
        <p style={{ color: "#8892A4", fontSize: "0.83rem", margin: 0, lineHeight: 1.5 }}>
          Live visualization of the top 100 cryptocurrencies sorted by market cap.
          Block size = market cap · Color = 60-minute price change.
        </p>
      </div>

      {/* Widget */}
      <div
        style={{
          background: "#0C1018",
          border: "1px solid #1C2236",
          borderRadius: 4,
          overflow: "hidden",
          marginBottom: 20,
          height: 600,
        }}
      >
        <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      </div>

      {/* How to read */}
      <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderLeft: "3px solid #0066FF", borderRadius: 4, padding: 20 }}>
        <h2 style={{ color: "#E8ECF4", fontWeight: 700, fontSize: "1rem", margin: "0 0 16px" }}>
          How to Read the Heatmap
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {[
            { icon: "📦", title: "Block Size", color: "#0066FF", desc: "Larger blocks = higher market cap. Bitcoin and Ethereum dominate the top-left area." },
            { icon: "🟢", title: "Green Blocks", color: "#00C896", desc: "Price is up in the last 60 minutes. Darker green = stronger gain. Bullish momentum." },
            { icon: "🔴", title: "Red Blocks", color: "#FF3B5C", desc: "Price is down in the last 60 minutes. Darker red = steeper decline. Bearish pressure." },
            { icon: "⬜", title: "Gray / Neutral", color: "#8892A4", desc: "Little to no price change. Consolidating — waiting for a catalyst or direction." },
            { icon: "🔍", title: "Zoom", color: "#F59E0B", desc: "Zoom into the heatmap to see smaller-cap coins. Hover a block for price details." },
            { icon: "📊", title: "Sectors", color: "#A855F7", desc: "Spot which sectors (DeFi, Layer 1, gaming) are leading or lagging in real time." },
          ].map(({ icon, title, color, desc }) => (
            <div key={title} style={{ background: "#06080F", borderRadius: 3, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: "1.1rem" }}>{icon}</span>
                <span style={{ color, fontWeight: 700, fontSize: "0.83rem" }}>{title}</span>
              </div>
              <p style={{ color: "#8892A4", fontSize: "0.78rem", lineHeight: 1.5, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
