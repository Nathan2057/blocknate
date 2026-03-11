import { NextRequest, NextResponse } from "next/server";
import { generateAllSignals } from "@/lib/signalGenerator";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.SIGNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: pairs } = await supabase
      .from("watched_pairs")
      .select("symbol")
      .eq("is_active", true);

    if (!pairs || pairs.length === 0) {
      return NextResponse.json({ error: "No watched pairs configured" });
    }

    // Shuffle and pick up to 5
    const shuffled = [...pairs].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 5).map((p: { symbol: string }) => p.symbol);

    const results = await generateAllSignals(selected);

    const summary = {
      total: results.length,
      generated: results.filter((r) => r.status === "generated").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      no_signal: results.filter((r) => r.status === "no_signal").length,
      errors: results.filter((r) => r.status === "error").length,
      details: results,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(summary);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
