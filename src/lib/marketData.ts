export interface OHLCVCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Fetch OHLCV candles from Binance
export async function fetchBinanceOHLCV(
  symbol: string,
  interval: string,
  limit = 200
): Promise<OHLCVCandle[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Binance OHLCV failed: ${res.status}`);
  const data = await res.json();
  return (data as unknown[][]).map((k) => ({
    time: k[0] as number,
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low: parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
  }));
}

// Fetch current price
export async function fetchBinancePrice(symbol: string): Promise<number> {
  const res = await fetch(
    `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
    { next: { revalidate: 0 } }
  );
  const data = await res.json() as { price: string };
  return parseFloat(data.price);
}

// Fetch Fear & Greed
export async function fetchFearGreed(): Promise<number> {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1&format=json");
    const data = await res.json() as { data: Array<{ value: string }> };
    return parseInt(data.data[0].value);
  } catch {
    return 50;
  }
}

// Fetch BTC Dominance
export async function fetchBTCDominance(): Promise<number> {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/global");
    const data = await res.json() as { data: { market_cap_percentage: { btc: number } } };
    return data.data.market_cap_percentage.btc;
  } catch {
    return 50;
  }
}

// Fetch news sentiment from CryptoPanic
export async function fetchNewsSentiment(
  coin: string
): Promise<"POSITIVE" | "NEGATIVE" | "NEUTRAL"> {
  try {
    const apiKey = process.env.CRYPTOPANIC_API_KEY;
    if (!apiKey || apiKey === "your_key_here") return "NEUTRAL";
    const currency = coin.replace("USDT", "");
    const res = await fetch(
      `https://cryptopanic.com/api/v1/posts/?auth_token=${apiKey}&currencies=${currency}&filter=hot&limit=10`,
      { next: { revalidate: 300 } }
    );
    const data = await res.json() as {
      results?: Array<{ votes?: { positive: number; negative: number } }>;
    };
    if (!data.results) return "NEUTRAL";
    let positive = 0, negative = 0;
    for (const post of data.results) {
      if ((post.votes?.positive ?? 0) > (post.votes?.negative ?? 0)) positive++;
      else if ((post.votes?.negative ?? 0) > (post.votes?.positive ?? 0)) negative++;
    }
    if (positive > negative * 1.5) return "POSITIVE";
    if (negative > positive * 1.5) return "NEGATIVE";
    return "NEUTRAL";
  } catch {
    return "NEUTRAL";
  }
}
