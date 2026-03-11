import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchBinancePrice } from "@/lib/marketData";

interface SignalRow {
  id: string;
  coin: string;
  signal_type: "LONG" | "SHORT";
  status: string;
  entry_price: number;
  tp1: number;
  tp2: number;
  tp3: number;
  stop_loss: number;
  leverage: number;
  pnl: number | null;
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.SIGNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: signals, error } = await supabase
    .from("signals")
    .select("*")
    .in("status", ["ACTIVE", "TP1_HIT", "TP2_HIT"]);

  if (error || !signals) {
    return NextResponse.json({ error: "Failed to fetch signals" });
  }

  const updates: Array<{
    coin: string;
    from: string;
    to: string;
    price: number;
    pnl: number;
  }> = [];

  for (const signal of signals as SignalRow[]) {
    try {
      const price = await fetchBinancePrice(signal.coin);
      let newStatus = signal.status;
      let pnl = signal.pnl ?? 0;

      if (signal.signal_type === "LONG") {
        if (price >= signal.tp3) {
          newStatus = "TP3_HIT";
          pnl = ((signal.tp3 - signal.entry_price) / signal.entry_price) * 100 * signal.leverage;
        } else if (price >= signal.tp2) {
          newStatus = "TP2_HIT";
          pnl = ((signal.tp2 - signal.entry_price) / signal.entry_price) * 100 * signal.leverage;
        } else if (price >= signal.tp1) {
          newStatus = "TP1_HIT";
          pnl = ((signal.tp1 - signal.entry_price) / signal.entry_price) * 100 * signal.leverage;
        } else if (price <= signal.stop_loss) {
          newStatus = "SL_HIT";
          pnl = ((signal.stop_loss - signal.entry_price) / signal.entry_price) * 100 * signal.leverage;
        }
      } else {
        // SHORT
        if (price <= signal.tp3) {
          newStatus = "TP3_HIT";
          pnl = ((signal.entry_price - signal.tp3) / signal.entry_price) * 100 * signal.leverage;
        } else if (price <= signal.tp2) {
          newStatus = "TP2_HIT";
          pnl = ((signal.entry_price - signal.tp2) / signal.entry_price) * 100 * signal.leverage;
        } else if (price <= signal.tp1) {
          newStatus = "TP1_HIT";
          pnl = ((signal.entry_price - signal.tp1) / signal.entry_price) * 100 * signal.leverage;
        } else if (price >= signal.stop_loss) {
          newStatus = "SL_HIT";
          pnl = ((signal.entry_price - signal.stop_loss) / signal.entry_price) * 100 * signal.leverage;
        }
      }

      if (newStatus !== signal.status) {
        await supabase
          .from("signals")
          .update({
            status: newStatus,
            pnl: parseFloat(pnl.toFixed(2)),
            updated_at: new Date().toISOString(),
          })
          .eq("id", signal.id);

        updates.push({
          coin: signal.coin,
          from: signal.status,
          to: newStatus,
          price,
          pnl: parseFloat(pnl.toFixed(2)),
        });
      }

      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(`Failed to update ${signal.coin}:`, err);
    }
  }

  return NextResponse.json({
    checked: signals.length,
    updated: updates.length,
    updates,
    timestamp: new Date().toISOString(),
  });
}
