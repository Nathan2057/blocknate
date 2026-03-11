"use client";

import { useEffect, useState } from "react";
import { fmtLarge, fmtPct } from "@/lib/utils";

interface GlobalData {
  total_market_cap: { usd: number };
  market_cap_change_percentage_24h_usd: number;
  market_cap_percentage: { btc: number; eth: number };
  total_volume: { usd: number };
}

interface StatCard {
  label: string;
  value: string;
  positive?: boolean | null;
}

export default function StatsBar() {
  const [data, setData] = useState<GlobalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/global");
        const json = await res.json();
        setData(json.data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 900_000);
    return () => clearInterval(id);
  }, []);

  const cards: StatCard[] = data
    ? [
        { label: "Total Market Cap", value: fmtLarge(data.total_market_cap.usd), positive: null },
        {
          label: "24h Change",
          value: fmtPct(data.market_cap_change_percentage_24h_usd),
          positive: data.market_cap_change_percentage_24h_usd >= 0,
        },
        { label: "BTC Dominance", value: `${data.market_cap_percentage.btc.toFixed(1)}%`, positive: null },
        { label: "ETH Dominance", value: `${data.market_cap_percentage.eth.toFixed(1)}%`, positive: null },
        { label: "24h Volume", value: fmtLarge(data.total_volume.usd), positive: null },
      ]
    : [];

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {loading
        ? Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: "1 1 160px",
                height: 72,
                borderRadius: 4,
              }}
              className="skeleton"
            />
          ))
        : cards.map((card) => (
            <div
              key={card.label}
              style={{
                flex: "1 1 160px",
                backgroundColor: "#0C1018",
                borderTop: "1px solid #1C2236",
                borderRight: "1px solid #1C2236",
                borderBottom: "1px solid #1C2236",
                borderLeft: "3px solid #0066FF",
                borderRadius: 4,
                padding: "12px 20px",
                boxShadow: "-2px 0 10px rgba(0,102,255,0.3)",
                cursor: "default",
                transition: "transform 150ms, box-shadow 150ms",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "-2px 0 18px rgba(0,102,255,0.55)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "-2px 0 10px rgba(0,102,255,0.3)";
              }}
            >
              <div
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  color: "#8892A4",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                {card.label}
              </div>
              <div
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  color:
                    card.positive === null
                      ? "#FFFFFF"
                      : card.positive
                      ? "#00C896"
                      : "#FF3B5C",
                  lineHeight: 1,
                }}
              >
                {card.value}
              </div>
            </div>
          ))}
    </div>
  );
}
