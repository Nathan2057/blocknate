import { NextResponse } from "next/server";
import { cachedFetch } from "@/lib/cache";

export async function GET() {
  try {
    const data = await cachedFetch(
      "fear-greed",
      async () => {
        const res = await fetch("https://api.alternative.me/fng/?limit=8&format=json", {
          next: { revalidate: 0 },
        });
        if (!res.ok) throw new Error("Fear & Greed fetch failed");
        return res.json();
      },
      900_000
    );

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch fear & greed" }, { status: 500 });
  }
}
