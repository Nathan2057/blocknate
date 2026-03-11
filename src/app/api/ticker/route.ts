import { NextResponse } from "next/server";
import { cachedFetch } from "@/lib/cache";

export async function GET() {
  try {
    const data = await cachedFetch(
      "ticker",
      async () => {
        const symbols = encodeURIComponent(
          JSON.stringify(["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"])
        );
        // Use type=MINI — note: MINI omits priceChangePercent, so we derive it from openPrice/lastPrice
        const res = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbols}&type=MINI`,
          { headers: { Accept: "application/json" }, next: { revalidate: 15 } }
        );
        const items = await res.json();
        const map: Record<string, { usd: number; usd_24h_change: number }> = {};
        for (const item of items as Array<{ symbol: string; lastPrice: string; openPrice: string }>) {
          const last = parseFloat(item.lastPrice);
          const open = parseFloat(item.openPrice);
          const change = open > 0 ? ((last - open) / open) * 100 : 0;
          map[item.symbol] = {
            usd: last,
            usd_24h_change: parseFloat(change.toFixed(4)),
          };
        }
        return {
          bitcoin: map["BTCUSDT"],
          ethereum: map["ETHUSDT"],
          binancecoin: map["BNBUSDT"],
          solana: map["SOLUSDT"],
          ripple: map["XRPUSDT"],
        };
      },
      15_000
    );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
