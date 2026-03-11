"use client";

import { useState, useCallback } from "react";
import StatsBar from "@/components/StatsBar";
import FearGreedGauge from "@/components/FearGreedGauge";
import TradingChart from "@/components/TradingChart";
import LiveSignalsRow from "@/components/LiveSignalsRow";
import Top5Coins from "@/components/Top5Coins";
import MarketsTable from "@/components/MarketsTable";
import MarketMovers from "@/components/MarketMovers";

export default function DashboardPage() {
  const [marketData, setMarketData] = useState<
    {
      id: string;
      name: string;
      symbol: string;
      image: string;
      current_price: number;
      price_change_percentage_24h_in_currency: number;
      total_volume: number;
    }[]
  >([]);

  const handleDataLoaded = useCallback((data: typeof marketData) => {
    setMarketData(data);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ROW 1: Stats */}
      <StatsBar />

      {/* ROW 2: Fear & Greed (left) + Chart (right) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: 16,
          height: 520,
        }}
      >
        <FearGreedGauge />
        <TradingChart />
      </div>

      {/* ROW 3: Live Signals */}
      <LiveSignalsRow />

      {/* ROW 4: Market Overview — Top 5 coins */}
      <div>
        <div className="section-label">
          <div className="section-label-bar" />
          <span className="section-label-text">Market Overview</span>
        </div>
        <Top5Coins />
      </div>

      {/* ROW 5: Top 20 table */}
      <div>
        <div className="section-label">
          <div className="section-label-bar" />
          <span className="section-label-text">Top 20 Cryptocurrencies</span>
        </div>
        <MarketsTable onDataLoaded={handleDataLoaded} />
      </div>

      {/* ROW 6: Market Movers */}
      {marketData.length > 0 && (
        <div>
          <div className="section-label">
            <div className="section-label-bar" />
            <span className="section-label-text">Market Movers</span>
          </div>
          <MarketMovers coins={marketData} />
        </div>
      )}

    </div>
  );
}
