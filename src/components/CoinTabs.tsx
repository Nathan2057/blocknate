"use client";

import { useState, useEffect, useRef } from "react";
import SignalPanel from "./SignalPanel";

const TABS = ["BTC", "ETH", "SOL", "BNB", "XRP"] as const;
type Tab = (typeof TABS)[number];

export default function CoinTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("BTC");
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    chartContainerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `BINANCE:${activeTab}USDT`,
      interval: "240",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "#0C1018",
      gridColor: "#1C2236",
      allow_symbol_change: false,
      calendar: false,
      studies: ["STD;RSI", "STD;MACD", "STD;Volume"],
      support_host: "https://www.tradingview.com",
    });

    chartContainerRef.current.appendChild(script);

    return () => {
      if (chartContainerRef.current) {
        chartContainerRef.current.innerHTML = "";
      }
    };
  }, [activeTab]);

  return (
    <div
      style={{
        backgroundColor: "#0C1018",
        border: "1px solid #1C2236",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          backgroundColor: "#080C14",
          borderBottom: "1px solid #1C2236",
          display: "flex",
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 20px",
                backgroundColor: "transparent",
                border: "none",
                borderBottom: isActive ? "2px solid #0066FF" : "2px solid transparent",
                cursor: "pointer",
                fontSize: "0.82rem",
                fontWeight: isActive ? 700 : 400,
                color: isActive ? "#FFFFFF" : "#8892A4",
                transition: "color 150ms, border-color 150ms",
              }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = "#8892A4";
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "65fr 35fr",
          height: 550,
          backgroundColor: "#0C1018",
        }}
      >
        {/* Left — Chart */}
        <div style={{ height: 550, overflow: "hidden" }}>
          <div
            className="tradingview-widget-container"
            style={{ height: "550px", width: "100%" }}
          >
            <div
              className="tradingview-widget-container__widget"
              ref={chartContainerRef}
              style={{ height: "100%", width: "100%" }}
            />
          </div>
        </div>

        {/* Right — Signal Panel */}
        <div
          style={{
            height: 550,
            overflowY: "auto",
            borderLeft: "1px solid #1C2236",
          }}
        >
          <SignalPanel symbol={`${activeTab}USDT`} />
        </div>
      </div>
    </div>
  );
}
