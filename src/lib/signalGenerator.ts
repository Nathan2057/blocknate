import { createClient } from "@supabase/supabase-js";
import { analyzeSignal, OHLCV } from "./indicators";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Top 30 liquid pairs pool
const PAIR_POOL = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
  "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "DOTUSDT",
  "MATICUSDT", "UNIUSDT", "ATOMUSDT", "LTCUSDT", "NEARUSDT",
  "APTUSDT", "ARBUSDT", "OPUSDT", "INJUSDT", "SEIUSDT",
  "SUIUSDT", "TIAUSDT", "STXUSDT", "FETUSDT", "RNDRUSDT",
  "AAVEUSDT", "MKRUSDT", "SNXUSDT", "CRVUSDT", "LDOUSDT",
];

function parseKlines(data: unknown[][]): OHLCV[] {
  return data.map((k) => ({
    timestamp: Number(k[0]),
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low: parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
  }));
}

async function fetchCandles(
  symbol: string,
  interval = "4h",
  limit = 250
): Promise<OHLCV[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://blocknate1.vercel.app";

  const endpoints = [
    // Internal proxy first — avoids Vercel→Binance blocking
    `${baseUrl}/api/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    // Binance Futures (different infra, often unblocked)
    `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    // Binance Spot mirrors
    `https://api1.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    `https://api2.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    `https://api3.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    // Binance Spot original
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
  ];

  for (const url of endpoints) {
    try {
      const host = new URL(url).hostname + new URL(url).pathname;
      console.log(`Trying ${symbol} via ${host}`);
      const res = await fetch(url, {
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) { console.log(`${host}: HTTP ${res.status}`); continue; }
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) { console.log(`${host}: empty/invalid`); continue; }
      console.log(`✅ ${symbol}: ${data.length} candles from ${new URL(url).hostname}`);
      return parseKlines(data as unknown[][]);
    } catch (err) {
      console.log(`${new URL(url).hostname} failed: ${String(err).slice(0, 80)}`);
      continue;
    }
  }

  console.error(`❌ All endpoints failed for ${symbol}`);
  return [];
}

function generateSessionId(): string {
  const now = new Date();
  const slot = Math.floor(now.getUTCHours() / 4);
  return `${now.toISOString().split("T")[0]}_slot${slot}`;
}

export async function generateSignalBatch(force = false): Promise<{
  success: boolean;
  sessionId: string;
  created: number;
  skipped: string[];
  errors: string[];
  message: string;
}> {
  const baseSessionId = generateSessionId();
  const sessionId = force ? `${baseSessionId}_forced` : baseSessionId;
  const todayStr = new Date().toISOString().split("T")[0];
  const errors: string[] = [];
  const skipped: string[] = [];

  console.log("=== SIGNAL GENERATION START ===");
  console.log("Session ID:", sessionId);
  console.log("Today:", todayStr);
  console.log("Pair pool size:", PAIR_POOL.length);

  // Check if session already exists and is active (skip when force=true)
  if (!force) {
    const { data: existingSession } = await supabase
      .from("signal_sessions")
      .select("id, status")
      .eq("session_id", sessionId)
      .single();

    if (existingSession?.status === "ACTIVE") {
      return {
        success: false,
        sessionId,
        created: 0,
        skipped: [],
        errors: [],
        message: `Session ${sessionId} already active`,
      };
    }
  }

  // Get pairs already used TODAY to avoid duplicates
  const { data: todaySignals } = await supabase
    .from("signals")
    .select("pair")
    .gte("created_at", `${todayStr}T00:00:00Z`);

  const usedToday = new Set(
    ((todaySignals ?? []) as { pair: string }[]).map((s) => s.pair)
  );

  console.log("Used today:", Array.from(usedToday));

  // Available = pool minus today's used
  const available = PAIR_POOL.filter((p) => !usedToday.has(p));
  console.log("Available pairs:", available.length, available);

  if (available.length < 5) {
    return {
      success: false,
      sessionId,
      created: 0,
      skipped: [],
      errors: ["Not enough fresh pairs available today"],
      message: "All pairs used today already",
    };
  }

  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const selectedPairs: string[] = [];
  const createdSignals: Record<string, unknown>[] = [];

  // Score up to 15 pairs, then pick the top 5 by confidence
  type ScoredPair = { pair: string; analysis: NonNullable<ReturnType<typeof analyzeSignal>>; candles: OHLCV[] };
  const scoredPairs: ScoredPair[] = [];

  console.log(`Scoring ${Math.min(shuffled.length, 15)} pairs for session ${sessionId}...`);

  for (const pair of shuffled.slice(0, 15)) {
    try {
      const candles = await fetchCandles(pair, "4h", 250);
      if (candles.length < 50) {
        skipped.push(`${pair}: only ${candles.length} candles`);
        continue;
      }
      const analysis = analyzeSignal(candles);
      if (!analysis) {
        skipped.push(`${pair}: null analysis`);
        continue;
      }
      console.log(`${pair}: ${analysis.direction} confidence=${analysis.confidence}`);
      scoredPairs.push({ pair, analysis, candles });
      await new Promise((r) => setTimeout(r, 150));
    } catch (err) {
      errors.push(`${pair}: ${String(err)}`);
    }
  }

  // Sort by confidence descending, pick top 5
  scoredPairs.sort((a, b) => b.analysis.confidence - a.analysis.confidence);
  const top5 = scoredPairs.slice(0, 5);
  console.log(`Selected top ${top5.length} pairs:`, top5.map((p) => `${p.pair}(${p.analysis.confidence}%)`).join(", "));

  for (const { pair, analysis, candles } of top5) {
    const price = candles[candles.length - 1].close;
    const symbol = pair.replace("USDT", "");
    const sessionEnd = new Date(Date.now() + 4 * 60 * 60 * 1000);

    createdSignals.push({
      pair,
      symbol,
      direction: analysis.direction,
      timeframe: "4H",
      entry_price: price,
      current_price: price,
      tp1: parseFloat(analysis.tp1.toFixed(8)),
      tp2: parseFloat(analysis.tp2.toFixed(8)),
      tp3: parseFloat(analysis.tp3.toFixed(8)),
      sl: parseFloat(analysis.sl.toFixed(8)),
      confidence: analysis.confidence,
      leverage: analysis.leverage,
      risk_level: analysis.riskLevel,
      rsi: analysis.rsi ? parseFloat(analysis.rsi.toFixed(2)) : null,
      macd_histogram: analysis.macdHistogram
        ? parseFloat(analysis.macdHistogram.toFixed(6))
        : null,
      ema_trend: analysis.emaTrend,
      atr: analysis.atr ? parseFloat(analysis.atr.toFixed(8)) : null,
      volume_ratio: analysis.volumeRatio
        ? parseFloat(analysis.volumeRatio.toFixed(2))
        : null,
      bb_position: analysis.bbPosition,
      analysis: `${analysis.direction} on ${pair} — ${analysis.confidence}% confidence. ${analysis.reasons.slice(0, 3).join(". ")}.`,
      reasons: analysis.reasons,
      session_id: sessionId,
      session_start: new Date().toISOString(),
      session_end: sessionEnd.toISOString(),
      status: "ACTIVE",
      hit_tp1: false,
      hit_tp2: false,
      hit_tp3: false,
      hit_sl: false,
    });

    selectedPairs.push(pair);
  }

  console.log("=== GENERATION RESULT ===", { created: createdSignals.length, skipped, errors });

  if (createdSignals.length === 0) {
    return {
      success: false,
      sessionId,
      created: 0,
      skipped,
      errors,
      message: "No valid signals found in this batch",
    };
  }

  const { error: insertError } = await supabase
    .from("signals")
    .insert(createdSignals);

  if (insertError) {
    return {
      success: false,
      sessionId,
      created: 0,
      skipped,
      errors: [insertError.message],
      message: "Database insert failed",
    };
  }

  await supabase.from("signal_sessions").upsert({
    session_id: sessionId,
    started_at: new Date().toISOString(),
    ended_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    pairs: selectedPairs,
    total_signals: createdSignals.length,
    status: "ACTIVE",
  });

  return {
    success: true,
    sessionId,
    created: createdSignals.length,
    skipped,
    errors,
    message: `Created ${createdSignals.length} signals for session ${sessionId}`,
  };
}
