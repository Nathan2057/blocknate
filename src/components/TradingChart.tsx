"use client";

import { useEffect, useRef, useState } from "react";

const COINS = [
  { label: "BTC", symbol: "BTCUSDT" },
  { label: "ETH", symbol: "ETHUSDT" },
  { label: "SOL", symbol: "SOLUSDT" },
  { label: "BNB", symbol: "BNBUSDT" },
  { label: "XRP", symbol: "XRPUSDT" },
];

export default function TradingChart() {
  const [active, setActive] = useState("BTCUSDT");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.height = "100%";
    wrapper.style.width = "100%";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `BINANCE:${active}`,
      interval: "240",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "#0C1018",
      gridColor: "#1C2236",
      allow_symbol_change: false,
      calendar: false,
      hide_top_toolbar: false,
      studies: ["STD;RSI", "STD;MACD", "STD;Volume"],
      support_host: "https://www.tradingview.com",
    });

    wrapper.appendChild(widgetDiv);
    wrapper.appendChild(script);
    containerRef.current.appendChild(wrapper);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [active]);

  return (
    <div
      style={{
        background: "#0C1018",
        border: "1px solid #1C2236",
        borderRadius: 4,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #1C2236",
          background: "#080C14",
          flexShrink: 0,
        }}
      >
        {COINS.map((c) => (
          <button
            key={c.symbol}
            onClick={() => setActive(c.symbol)}
            style={{
              padding: "10px 20px",
              background: "transparent",
              border: "none",
              borderBottom:
                active === c.symbol ? "2px solid #0066FF" : "2px solid transparent",
              color: active === c.symbol ? "#FFFFFF" : "#8892A4",
              fontWeight: active === c.symbol ? 700 : 400,
              fontSize: "0.82rem",
              cursor: "pointer",
              letterSpacing: "0.05em",
              transition: "all 150ms",
            }}
          >
            {c.label}
          </button>
        ))}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            paddingRight: 12,
            gap: 8,
          }}
        >
          <span style={{ color: "#4A5568", fontSize: "0.68rem" }}>4H CHART</span>
          <span
            style={{
              background: "rgba(0,102,255,0.1)",
              border: "1px solid #0066FF",
              color: "#0066FF",
              fontSize: "0.65rem",
              padding: "2px 6px",
              borderRadius: 2,
              fontWeight: 600,
            }}
          >
            LIVE
          </span>
        </div>
      </div>

      {/* Chart container */}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
    </div>
  );
}
