"use client";

import { useEffect, useRef, useState } from "react";

interface SignalPair {
  pair: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  confidence: number;
}

interface TradingChartProps {
  pairs?: SignalPair[];
}

const DEFAULT_PAIRS: SignalPair[] = [
  { pair: "BTCUSDT", symbol: "BTC", direction: "LONG", confidence: 0 },
  { pair: "ETHUSDT", symbol: "ETH", direction: "LONG", confidence: 0 },
  { pair: "SOLUSDT", symbol: "SOL", direction: "LONG", confidence: 0 },
  { pair: "BNBUSDT", symbol: "BNB", direction: "LONG", confidence: 0 },
  { pair: "XRPUSDT", symbol: "XRP", direction: "LONG", confidence: 0 },
];

export default function TradingChart({ pairs }: TradingChartProps) {
  const displayPairs = pairs && pairs.length > 0 ? pairs : DEFAULT_PAIRS;
  const [active, setActive] = useState(displayPairs[0].pair);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (displayPairs.length > 0) {
      setActive(displayPairs[0].pair);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairs]);

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
    container.appendChild(wrapper);

    return () => {
      container.innerHTML = "";
    };
  }, [active]);

  const activePair = displayPairs.find((p) => p.pair === active);
  const hasSignals = pairs && pairs.length > 0;

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
          overflowX: "auto",
        }}
      >
        {displayPairs.map((p) => {
          const isActive = active === p.pair;
          const isLong = p.direction === "LONG";
          return (
            <button
              key={p.pair}
              onClick={() => setActive(p.pair)}
              style={{
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                borderBottom: isActive ? "2px solid #0066FF" : "2px solid transparent",
                color: isActive ? "#FFFFFF" : "#8892A4",
                fontWeight: isActive ? 700 : 400,
                fontSize: "0.82rem",
                cursor: "pointer",
                letterSpacing: "0.05em",
                display: "flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {p.symbol}
              {hasSignals && (
                <span
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 2,
                    background: isLong ? "rgba(0,200,150,0.15)" : "rgba(255,59,92,0.15)",
                    color: isLong ? "#00C896" : "#FF3B5C",
                    border: `1px solid ${isLong ? "rgba(0,200,150,0.3)" : "rgba(255,59,92,0.3)"}`,
                  }}
                >
                  {p.direction}
                </span>
              )}
            </button>
          );
        })}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            paddingRight: 12,
            gap: 8,
            flexShrink: 0,
          }}
        >
          {hasSignals && activePair && activePair.confidence > 0 && (
            <span style={{ color: "#8892A4", fontSize: "0.68rem" }}>
              {activePair.confidence}% conf
            </span>
          )}
          <span style={{ color: "#4A5568", fontSize: "0.68rem" }}>4H</span>
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

      {/* Chart */}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
    </div>
  );
}
