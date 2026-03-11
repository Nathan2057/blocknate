import { NextResponse } from "next/server";
import { cachedFetch } from "@/lib/cache";

export async function GET() {
  try {
    const data = await cachedFetch(
      "global",
      async () => {
        const res = await fetch("https://api.coingecko.com/api/v3/global", {
          next: { revalidate: 0 },
        });
        if (!res.ok) throw new Error("CoinGecko global fetch failed");
        return res.json();
      },
      900_000
    );

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch global data" }, { status: 500 });
  }
}
