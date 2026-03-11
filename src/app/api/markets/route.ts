import { NextResponse } from "next/server";
import { cachedFetch } from "@/lib/cache";

const TOP_COINS: Record<string, { name: string; id: string }> = {
  BTCUSDT:   { name: "Bitcoin",          id: "bitcoin" },
  ETHUSDT:   { name: "Ethereum",         id: "ethereum" },
  BNBUSDT:   { name: "BNB",              id: "binancecoin" },
  SOLUSDT:   { name: "Solana",           id: "solana" },
  XRPUSDT:   { name: "XRP",              id: "ripple" },
  ADAUSDT:   { name: "Cardano",          id: "cardano" },
  DOGEUSDT:  { name: "Dogecoin",         id: "dogecoin" },
  AVAXUSDT:  { name: "Avalanche",        id: "avalanche-2" },
  LINKUSDT:  { name: "Chainlink",        id: "chainlink" },
  DOTUSDT:   { name: "Polkadot",         id: "polkadot" },
  MATICUSDT: { name: "Polygon",          id: "matic-network" },
  UNIUSDT:   { name: "Uniswap",          id: "uniswap" },
  LTCUSDT:   { name: "Litecoin",         id: "litecoin" },
  BCHUSDT:   { name: "Bitcoin Cash",     id: "bitcoin-cash" },
  XLMUSDT:   { name: "Stellar",          id: "stellar" },
  ATOMUSDT:  { name: "Cosmos",           id: "cosmos" },
  TRXUSDT:   { name: "TRON",             id: "tron" },
  ETCUSDT:   { name: "Ethereum Classic", id: "ethereum-classic" },
  NEARUSDT:  { name: "NEAR Protocol",    id: "near" },
  APTUSDT:   { name: "Aptos",            id: "aptos" },
};

export async function GET() {
  try {
    const data = await cachedFetch(
      "markets",
      async () => {
        // Try 1: CoinGecko
        try {
          const res = await fetch(
            "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=true&price_change_percentage=1h,24h,7d",
            {
              headers: { Accept: "application/json" },
              next: { revalidate: 900 },
            }
          );
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json) && json.length > 0) return json;
          }
        } catch {
          // fall through to Binance
        }

        // Try 2: Binance fallback
        const res = await fetch(
          "https://api.binance.com/api/v3/ticker/24hr?type=FULL",
          { next: { revalidate: 900 } }
        );
        const items: Array<{
          symbol: string;
          lastPrice: string;
          priceChangePercent: string;
          quoteVolume: string;
        }> = await res.json();

        return items
          .filter((i) => TOP_COINS[i.symbol])
          .map((i, idx) => {
            const slug = i.symbol.replace("USDT", "").toLowerCase();
            return {
              id: TOP_COINS[i.symbol].id,
              symbol: slug,
              name: TOP_COINS[i.symbol].name,
              image: `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@latest/svg/color/${slug}.svg`,
              current_price: parseFloat(i.lastPrice),
              price_change_percentage_1h_in_currency: 0,
              price_change_percentage_24h_in_currency: parseFloat(i.priceChangePercent),
              price_change_percentage_7d_in_currency: 0,
              market_cap: parseFloat(i.quoteVolume) * 10,
              total_volume: parseFloat(i.quoteVolume),
              sparkline_in_7d: { price: [] },
              market_cap_rank: idx + 1,
            };
          })
          .sort((a, b) => b.market_cap - a.market_cap)
          .slice(0, 20);
      },
      900_000
    );

    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
