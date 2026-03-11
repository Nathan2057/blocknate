"use client";

import Image from "next/image";
import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import { fmtPrice, fmtPct, fmtLarge } from "@/lib/utils";

interface Coin {
  id: string;
  name: string;
  symbol: string;
  image: string;
  current_price: number;
  price_change_percentage_24h_in_currency: number;
  total_volume: number;
}

interface MarketMoversProps {
  coins: Coin[];
}

interface MoverCardProps {
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  items: Coin[];
  valueKey: "price_change_percentage_24h_in_currency" | "total_volume";
}

function CoinRow({ coin, valueKey }: { coin: Coin; valueKey: MoverCardProps["valueKey"] }) {
  const pct = coin.price_change_percentage_24h_in_currency ?? 0;
  const positive = pct >= 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 0",
        borderBottom: "1px solid #1C2236",
      }}
    >
      <Image src={coin.image} alt={coin.name} width={28} height={28} style={{ borderRadius: "50%", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {coin.name}
        </div>
        <div style={{ fontSize: "0.65rem", color: "#8892A4", textTransform: "uppercase" }}>{coin.symbol}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#FFFFFF" }}>{fmtPrice(coin.current_price)}</div>
        {valueKey === "price_change_percentage_24h_in_currency" ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontSize: "0.68rem",
              fontWeight: 600,
              color: positive ? "#00C896" : "#FF3B5C",
              backgroundColor: positive ? "rgba(0,200,150,0.1)" : "rgba(255,59,92,0.1)",
              padding: "1px 5px",
              borderRadius: 3,
              marginTop: 2,
            }}
          >
            {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {fmtPct(pct)}
          </div>
        ) : (
          <div style={{ fontSize: "0.65rem", color: "#8892A4", marginTop: 2 }}>{fmtLarge(coin.total_volume)}</div>
        )}
      </div>
    </div>
  );
}

function MoverCard({ title, icon, accentColor, items, valueKey }: MoverCardProps) {
  return (
    <div
      style={{
        flex: "1 1 0",
        backgroundColor: "#0C1018",
        border: "1px solid #1C2236",
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 4,
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ color: accentColor }}>{icon}</span>
        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#FFFFFF", letterSpacing: "0.05em" }}>{title}</span>
      </div>
      {items.map((coin) => (
        <CoinRow key={coin.id} coin={coin} valueKey={valueKey} />
      ))}
    </div>
  );
}

export default function MarketMovers({ coins }: MarketMoversProps) {
  if (!coins.length) return null;

  const sorted24h = [...coins].sort(
    (a, b) => (b.price_change_percentage_24h_in_currency ?? 0) - (a.price_change_percentage_24h_in_currency ?? 0)
  );
  const gainers = sorted24h.slice(0, 3);
  const losers = sorted24h.slice(-3).reverse();
  const byVolume = [...coins].sort((a, b) => b.total_volume - a.total_volume).slice(0, 3);

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <MoverCard
        title="Top Gainers (24h)"
        icon={<TrendingUp size={14} />}
        accentColor="#00C896"
        items={gainers}
        valueKey="price_change_percentage_24h_in_currency"
      />
      <MoverCard
        title="Top Losers (24h)"
        icon={<TrendingDown size={14} />}
        accentColor="#FF3B5C"
        items={losers}
        valueKey="price_change_percentage_24h_in_currency"
      />
      <MoverCard
        title="Most Volume (24h)"
        icon={<BarChart2 size={14} />}
        accentColor="#0066FF"
        items={byVolume}
        valueKey="total_volume"
      />
    </div>
  );
}
