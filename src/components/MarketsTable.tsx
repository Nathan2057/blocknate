"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { TrendingUp, TrendingDown } from "lucide-react";
import { fmtPrice, fmtLarge, fmtPct } from "@/lib/utils";

interface Coin {
  id: string;
  market_cap_rank: number;
  name: string;
  symbol: string;
  image: string;
  current_price: number;
  price_change_percentage_1h_in_currency: number;
  price_change_percentage_24h_in_currency: number;
  price_change_percentage_7d_in_currency: number;
  market_cap: number;
  total_volume: number;
  sparkline_in_7d: { price: number[] };
}

interface MarketsTableProps {
  onDataLoaded?: (data: Coin[]) => void;
}

function Sparkline({ prices, positive }: { prices: number[]; positive: boolean }) {
  if (!prices || prices.length < 2) return <div style={{ width: 80, height: 32 }} />;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pts = prices
    .map((p, i) => {
      const x = (i / (prices.length - 1)) * 80;
      const y = 32 - ((p - min) / range) * 30;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={80} height={32} viewBox="0 0 80 32" style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={positive ? "#00C896" : "#FF3B5C"} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function PctCell({ value }: { value: number }) {
  const v = value ?? 0;
  const pos = v >= 0;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: pos ? "#00C896" : "#FF3B5C", fontSize: "0.78rem", fontWeight: 500 }}>
      {pos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {fmtPct(v)}
    </span>
  );
}

export default function MarketsTable({ onDataLoaded }: MarketsTableProps) {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(900);
  const [updating, setUpdating] = useState(false);
  const hasFetched = useRef(false);

  const load = useCallback(async (isRefresh = false) => {
    if (hasFetched.current && !isRefresh) return;
    hasFetched.current = true;
    setUpdating(true);
    try {
      const res = await fetch("/api/markets");
      const data: Coin[] = await res.json();
      setCoins(data);
      onDataLoaded?.(data);
    } catch {}
    setUpdating(false);
    setLoading(false);
    setCountdown(900);
  }, [onDataLoaded]);

  useEffect(() => {
    load();
    const refreshId = setInterval(() => load(true), 900_000);
    const tickId = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1_000);
    return () => { clearInterval(refreshId); clearInterval(tickId); };
  }, [load]);

  const thStyle: React.CSSProperties = {
    padding: "8px 12px",
    textAlign: "left",
    fontSize: "0.65rem",
    fontWeight: 600,
    color: "#8892A4",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ backgroundColor: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, overflow: "hidden" }}>
      {/* Table header bar */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #1C2236", gap: 8 }}>
        {updating && (
          <span style={{ fontSize: "0.7rem", color: "#8892A4" }}>Updating...</span>
        )}
        <span style={{ fontSize: "0.7rem", color: "#4A5568" }}>
          Refresh in {countdown}s
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
          <thead>
            <tr style={{ backgroundColor: "#080C14", borderBottom: "2px solid #0066FF" }}>
              <th style={{ ...thStyle, width: 36 }}>#</th>
              <th style={thStyle}>Coin</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Price</th>
              <th style={{ ...thStyle, textAlign: "right" }}>1h%</th>
              <th style={{ ...thStyle, textAlign: "right" }}>24h%</th>
              <th style={{ ...thStyle, textAlign: "right" }}>7d%</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Market Cap</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Volume 24h</th>
              <th style={{ ...thStyle, textAlign: "center" }}>7d Chart</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} style={{ padding: "10px 12px" }}>
                        <div className="skeleton" style={{ height: 14, borderRadius: 3 }} />
                      </td>
                    ))}
                  </tr>
                ))
              : coins.map((coin, i) => {
                  const pos24 = (coin.price_change_percentage_24h_in_currency ?? 0) >= 0;
                  return (
                    <tr
                      key={coin.id}
                      style={{
                        backgroundColor: i % 2 === 0 ? "#0C1018" : "#090D15",
                        borderLeft: "2px solid transparent",
                        transition: "background 150ms, border-color 150ms",
                        cursor: "default",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "#131B2E";
                        (e.currentTarget as HTMLElement).style.borderLeftColor = "#0066FF";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = i % 2 === 0 ? "#0C1018" : "#090D15";
                        (e.currentTarget as HTMLElement).style.borderLeftColor = "transparent";
                      }}
                    >
                      <td style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#4A5568", textAlign: "center" }}>
                        {coin.market_cap_rank}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Image
                            src={coin.image}
                            alt={coin.name}
                            width={32}
                            height={32}
                            style={{ borderRadius: "50%" }}
                          />
                          <div>
                            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#FFFFFF" }}>{coin.name}</div>
                            <div style={{ fontSize: "0.68rem", color: "#8892A4", textTransform: "uppercase" }}>{coin.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontSize: "0.82rem", fontWeight: 600, color: "#FFFFFF" }}>
                        {fmtPrice(coin.current_price)}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <PctCell value={coin.price_change_percentage_1h_in_currency} />
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <PctCell value={coin.price_change_percentage_24h_in_currency} />
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <PctCell value={coin.price_change_percentage_7d_in_currency} />
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontSize: "0.78rem", color: "#FFFFFF" }}>
                        {fmtLarge(coin.market_cap)}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontSize: "0.78rem", color: "#8892A4" }}>
                        {fmtLarge(coin.total_volume)}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <Sparkline prices={coin.sparkline_in_7d?.price ?? []} positive={pos24} />
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
