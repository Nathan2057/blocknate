"use client";

import { useEffect, useState } from "react";
import { fmtPrice, fmtPct } from "@/lib/utils";

interface Coin {
  id: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  sparkline_in_7d: { price: number[] };
}

const TARGET_IDS = ["bitcoin", "ethereum", "solana", "binancecoin", "ripple"];

function MiniSparkline({ prices, positive }: { prices: number[]; positive: boolean }) {
  if (!prices || prices.length < 2) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 80;
  const h = 32;
  const pts = prices
    .map((p, i) => {
      const x = (i / (prices.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        points={pts}
        fill="none"
        stroke={positive ? "#00C896" : "#FF3B5C"}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Top5Coins() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/markets")
      .then((r) => r.json())
      .then((data: Coin[]) => {
        const filtered = TARGET_IDS.map((id) => data.find((c) => c.id === id)).filter(Boolean) as Coin[];
        setCoins(filtered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 110, borderRadius: 4 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
      {coins.map((coin) => {
        const positive = (coin.price_change_percentage_24h ?? 0) >= 0;
        return (
          <div
            key={coin.id}
            style={{
              backgroundColor: "#0C1018",
              border: "1px solid #1C2236",
              borderRadius: 4,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  color: "#8892A4",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {coin.symbol.toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  color: positive ? "#00C896" : "#FF3B5C",
                }}
              >
                {fmtPct(coin.price_change_percentage_24h ?? 0)}
              </span>
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#FFFFFF" }}>
              {fmtPrice(coin.current_price)}
            </div>
            <div style={{ marginTop: 2 }}>
              <MiniSparkline prices={coin.sparkline_in_7d?.price ?? []} positive={positive} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
