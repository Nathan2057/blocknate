"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Menu } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/signals": "Live Signals",
  "/performance": "Performance",
  "/tools/fear-greed": "Fear & Greed",
  "/tools/btc-dominance": "BTC Dominance",
  "/tools/heatmap": "Heatmap",
  "/tools/altcoin-season": "Altcoin Season",
  "/tools/liquidations": "Liquidations",
  "/news": "News & Sentiment",
  "/education": "Education",
  "/portfolio": "Portfolio",
  "/settings": "Settings",
  "/admin": "Admin Panel",
};

const COIN_LABELS: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  binancecoin: "BNB",
  solana: "SOL",
  ripple: "XRP",
};

const COIN_ORDER = ["bitcoin", "ethereum", "binancecoin", "solana", "ripple"];

interface TickerData {
  usd: number;
  usd_24h_change: number;
}

interface TopBarProps {
  sidebarWidth: number;
  onMenuToggle?: () => void;
}

export default function TopBar({ sidebarWidth, onMenuToggle }: TopBarProps) {
  const pathname = usePathname();
  const [ticker, setTicker] = useState<Record<string, TickerData>>({});
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const pageTitle = PAGE_TITLES[pathname] ?? "Blocknate";

  async function fetchTicker() {
    try {
      const res = await fetch("/api/ticker");
      if (!res.ok) return;
      const data = await res.json();
      console.log("[TopBar] ticker data:", data);
      setTicker(data);
      const now = new Date();
      setLastUpdated(
        now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    fetchTicker();
    intervalRef.current = setInterval(fetchTicker, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const tickerItems = COIN_ORDER.filter((k) => ticker[k]).map((key) => {
    const coin = ticker[key];
    const change = coin.usd_24h_change ?? 0;
    const changeColor = change >= 0 ? "#00C896" : "#FF3B5C";
    const changeStr = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
    const usd = coin.usd ?? 0;
    const price =
      usd >= 1000
        ? `$${usd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
        : usd >= 1
        ? `$${usd.toFixed(2)}`
        : `$${usd.toFixed(4)}`;

    return { key, label: COIN_LABELS[key], price, changeStr, changeColor, usd };
  });

  // Duplicate for seamless loop
  const allItems = [...tickerItems, ...tickerItems];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: sidebarWidth,
        right: 0,
        height: 48,
        backgroundColor: "rgba(8,12,20,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #1C2236",
        display: "flex",
        alignItems: "center",
        zIndex: 90,
        transition: "left 240ms ease",
      }}
    >
      {/* Mobile hamburger */}
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#8892A4",
            flexShrink: 0,
          }}
        >
          <Menu size={18} />
        </button>
      )}

      {/* Page title */}
      <div
        style={{
          minWidth: 180,
          padding: "0 20px",
          borderRight: "1px solid #1C2236",
          height: "100%",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#FFFFFF" }}>
          {pageTitle}
        </span>
      </div>

      {/* Ticker */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
          height: "100%",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Left fade mask */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 40,
            background: "linear-gradient(to right, rgba(8,12,20,0.95), transparent)",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />
        {/* Right fade mask */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 40,
            background: "linear-gradient(to left, rgba(8,12,20,0.95), transparent)",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />

        {tickerItems.length > 0 ? (
          <div className="ticker-animate" style={{ gap: 0 }}>
            {allItems.map((item, i) => (
              <div
                key={`${item.key}-${i}`}
                style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0 20px",
                  }}
                >
                  <span style={{ fontSize: "0.75rem", color: "#8892A4", fontWeight: 500 }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "#FFFFFF", fontWeight: 600 }}>
                    {item.price}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: item.changeColor, fontWeight: 500 }}>
                    {item.changeStr}
                  </span>
                </div>
                <span style={{ color: "#1C2236", fontSize: "0.9rem", userSelect: "none" }}>|</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "0 20px", display: "flex", gap: 16 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="skeleton"
                style={{ width: 100, height: 14, borderRadius: 3 }}
              />
            ))}
          </div>
        )}
      </div>

      {/* LIVE indicator */}
      <div
        style={{
          borderLeft: "1px solid #1C2236",
          padding: "0 16px",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ position: "relative", width: 10, height: 10, flexShrink: 0 }}>
          <div
            className="pulse-ring"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              backgroundColor: "#00C896",
              opacity: 0.4,
            }}
          />
          <div
            className="pulse-dot"
            style={{
              position: "absolute",
              inset: "2px",
              borderRadius: "50%",
              backgroundColor: "#00C896",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              color: "#00C896",
              letterSpacing: "0.15em",
              lineHeight: 1,
            }}
          >
            LIVE
          </span>
          {lastUpdated && (
            <span style={{ fontSize: "0.6rem", color: "#4A5568", lineHeight: 1 }}>
              {lastUpdated}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
