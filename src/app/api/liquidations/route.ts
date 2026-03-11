import { NextResponse } from "next/server";

export const runtime = "edge";
export const revalidate = 0;

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"];

export async function GET() {
  try {
    const results = await Promise.all(
      SYMBOLS.map(async (symbol) => {
        const [oiRes, fundingRes, lsRes] = await Promise.all([
          fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`, { cache: "no-store" }),
          fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`, { cache: "no-store" }),
          fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`, { cache: "no-store" }),
        ]);

        const oi = await oiRes.json() as { openInterest: string };
        const funding = await fundingRes.json() as { markPrice: string; lastFundingRate: string; nextFundingTime: number };
        const ls = await lsRes.json() as Array<{ longAccount: string }>;

        const markPrice = parseFloat(funding.markPrice);
        const fundingRate = parseFloat(funding.lastFundingRate) * 100;
        const openInterestUSD = parseFloat(oi.openInterest) * markPrice;
        const longRatio = ls[0] ? parseFloat(ls[0].longAccount) * 100 : 50;
        const shortRatio = 100 - longRatio;

        const leverages = [5, 10, 25, 50, 100];
        const longLiqLevels = leverages.map((lev) => ({
          leverage: lev,
          price: parseFloat((markPrice * (1 - 1 / lev + 0.004)).toFixed(4)),
          size: (openInterestUSD * longRatio / 100) / leverages.length,
        }));
        const shortLiqLevels = leverages.map((lev) => ({
          leverage: lev,
          price: parseFloat((markPrice * (1 + 1 / lev - 0.004)).toFixed(4)),
          size: (openInterestUSD * shortRatio / 100) / leverages.length,
        }));

        return {
          symbol,
          coin: symbol.replace("USDT", ""),
          markPrice,
          fundingRate,
          openInterestUSD,
          longRatio,
          shortRatio,
          nextFundingTime: funding.nextFundingTime,
          longLiqLevels,
          shortLiqLevels,
        };
      })
    );

    return NextResponse.json(
      { coins: results, timestamp: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
