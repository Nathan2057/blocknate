import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

interface SignalRow {
  id: string;
  pair: string;
  direction: "LONG" | "SHORT";
  status: string;
  entry_price: number;
  tp1: number;
  tp2: number;
  tp3: number;
  sl: number;
  leverage: number;
  pnl_pct: number | null;
  session_id: string | null;
  session_end: string | null;
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

  const { data: activeSignals } = await supabase
    .from("signals")
    .select("*")
    .eq("status", "ACTIVE");

  if (!activeSignals?.length) {
    return NextResponse.json({ message: "No active signals", processed: 0 });
  }

  let tp1Hit = 0, tp2Hit = 0, tp3Hit = 0, slHit = 0, noTarget = 0, updated = 0;

  for (const signal of activeSignals as SignalRow[]) {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${signal.pair}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      const price = parseFloat(data.price);
      if (!price || isNaN(price)) continue;

      const now = new Date();
      const sessionEnd = signal.session_end ? new Date(signal.session_end) : null;
      const isExpired = sessionEnd && now > sessionEnd;

      let newStatus = "ACTIVE";
      let pnlPct = 0;
      const updateData: Record<string, unknown> = { current_price: price };

      if (signal.direction === "LONG") {
        if (price >= signal.tp3) {
          newStatus = "TP3_HIT";
          pnlPct = ((signal.tp3 - signal.entry_price) / signal.entry_price) * 100 * signal.leverage;
          updateData.hit_tp1 = true; updateData.hit_tp2 = true; updateData.hit_tp3 = true;
          tp3Hit++;
        } else if (price >= signal.tp2) {
          newStatus = "TP2_HIT";
          pnlPct = ((signal.tp2 - signal.entry_price) / signal.entry_price) * 100 * signal.leverage;
          updateData.hit_tp1 = true; updateData.hit_tp2 = true;
          tp2Hit++;
        } else if (price >= signal.tp1) {
          newStatus = "TP1_HIT";
          pnlPct = ((signal.tp1 - signal.entry_price) / signal.entry_price) * 100 * signal.leverage;
          updateData.hit_tp1 = true;
          tp1Hit++;
        } else if (price <= signal.sl) {
          newStatus = "SL_HIT";
          pnlPct = ((signal.sl - signal.entry_price) / signal.entry_price) * 100 * signal.leverage;
          updateData.hit_sl = true;
          slHit++;
        }
      } else {
        // SHORT
        if (price <= signal.tp3) {
          newStatus = "TP3_HIT";
          pnlPct = ((signal.entry_price - signal.tp3) / signal.entry_price) * 100 * signal.leverage;
          updateData.hit_tp1 = true; updateData.hit_tp2 = true; updateData.hit_tp3 = true;
          tp3Hit++;
        } else if (price <= signal.tp2) {
          newStatus = "TP2_HIT";
          pnlPct = ((signal.entry_price - signal.tp2) / signal.entry_price) * 100 * signal.leverage;
          updateData.hit_tp1 = true; updateData.hit_tp2 = true;
          tp2Hit++;
        } else if (price <= signal.tp1) {
          newStatus = "TP1_HIT";
          pnlPct = ((signal.entry_price - signal.tp1) / signal.entry_price) * 100 * signal.leverage;
          updateData.hit_tp1 = true;
          tp1Hit++;
        } else if (price >= signal.sl) {
          newStatus = "SL_HIT";
          pnlPct = ((signal.entry_price - signal.sl) / signal.entry_price) * 100 * signal.leverage;
          updateData.hit_sl = true;
          slHit++;
        }
      }

      // Session expired with no TP/SL hit
      if (newStatus === "ACTIVE" && isExpired) {
        newStatus = "NO_TARGET";
        pnlPct = ((price - signal.entry_price) / signal.entry_price) * 100;
        if (signal.direction === "SHORT") pnlPct = -pnlPct;
        noTarget++;
      }

      if (newStatus !== "ACTIVE") {
        updateData.status = newStatus;
        updateData.pnl_pct = parseFloat(pnlPct.toFixed(2));
        updateData.exit_price = price;
        updateData.closed_at = now.toISOString();
        updated++;
      }

      await supabase.from("signals").update(updateData).eq("id", signal.id);
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      console.error(`Error updating ${signal.pair}:`, err);
    }
  }

  // Update session summaries
  const sessionIds = Array.from(
    new Set(
      (activeSignals as SignalRow[])
        .map((s) => s.session_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  for (const sessionId of sessionIds) {
    const { data: sessionSignals } = await supabase
      .from("signals")
      .select("status, pnl_pct")
      .eq("session_id", sessionId);

    if (!sessionSignals) continue;

    const closed = sessionSignals.filter(
      (s: { status: string }) => s.status !== "ACTIVE"
    );
    const wins = closed.filter((s: { status: string }) =>
      ["TP1_HIT", "TP2_HIT", "TP3_HIT"].includes(s.status)
    );
    const allClosed = closed.length === sessionSignals.length;
    const avgPnl =
      closed.length > 0
        ? closed.reduce(
            (a: number, b: { pnl_pct: number | null }) => a + (b.pnl_pct ?? 0),
            0
          ) / closed.length
        : 0;

    await supabase
      .from("signal_sessions")
      .update({
        tp1_hit: sessionSignals.filter(
          (s: { status: string }) => s.status === "TP1_HIT"
        ).length,
        tp2_hit: sessionSignals.filter(
          (s: { status: string }) => s.status === "TP2_HIT"
        ).length,
        tp3_hit: sessionSignals.filter(
          (s: { status: string }) => s.status === "TP3_HIT"
        ).length,
        sl_hit: sessionSignals.filter(
          (s: { status: string }) => s.status === "SL_HIT"
        ).length,
        no_target: sessionSignals.filter(
          (s: { status: string }) => s.status === "NO_TARGET"
        ).length,
        win_rate:
          closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
        avg_pnl: parseFloat(avgPnl.toFixed(2)),
        status: allClosed ? "CLOSED" : "ACTIVE",
      })
      .eq("session_id", sessionId);
  }

  return NextResponse.json({
    success: true,
    processed: activeSignals.length,
    updated,
    tp1Hit,
    tp2Hit,
    tp3Hit,
    slHit,
    noTarget,
    timestamp: new Date().toISOString(),
  });
}
