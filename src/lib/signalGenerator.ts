import { createClient } from "@supabase/supabase-js";
import { fetchBinanceOHLCV, fetchNewsSentiment } from "./marketData";
import { generateSignalDecision } from "./indicators";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export interface GenerateResult {
  symbol: string;
  status: "generated" | "skipped" | "no_signal" | "error";
  reason?: string;
  signal?: unknown;
}

export async function analyzePair(symbol: string): Promise<GenerateResult> {
  try {
    const supabase = getSupabase();

    // Check if active signal already exists
    const { data: existing } = await supabase
      .from("signals")
      .select("id")
      .eq("coin", symbol)
      .eq("status", "ACTIVE")
      .limit(1);

    if (existing && existing.length > 0) {
      return { symbol, status: "skipped", reason: "Active signal exists" };
    }

    // Fetch 4H and 1H candles
    const [candles4h, candles1h] = await Promise.all([
      fetchBinanceOHLCV(symbol, "4h", 200),
      fetchBinanceOHLCV(symbol, "1h", 100),
    ]);

    if (candles4h.length < 50) {
      return { symbol, status: "error", reason: "Insufficient candle data" };
    }

    const closes4h = candles4h.map((c) => c.close);
    const highs4h = candles4h.map((c) => c.high);
    const lows4h = candles4h.map((c) => c.low);
    const volumes4h = candles4h.map((c) => c.volume);

    const closes1h = candles1h.map((c) => c.close);
    const highs1h = candles1h.map((c) => c.high);
    const lows1h = candles1h.map((c) => c.low);

    const decision = generateSignalDecision(
      closes4h, highs4h, lows4h, volumes4h,
      closes1h, highs1h, lows1h
    );

    if (decision.type === "NONE") {
      return { symbol, status: "no_signal", reason: "No confluence found" };
    }

    // Fetch news sentiment
    const sentiment = await fetchNewsSentiment(symbol);

    if (decision.type === "LONG" && sentiment === "NEGATIVE") {
      return { symbol, status: "no_signal", reason: "Signal blocked: negative news sentiment" };
    }
    if (decision.type === "SHORT" && sentiment === "POSITIVE") {
      return { symbol, status: "no_signal", reason: "Signal blocked: positive news sentiment" };
    }

    const notes = `Auto-generated signal. Confidence: ${decision.confidence}%. ${decision.reasons.join(". ")}.`;

    let leverage = 1;
    if (decision.confidence >= 80) leverage = 5;
    else if (decision.confidence >= 70) leverage = 3;
    else if (decision.confidence >= 60) leverage = 2;

    const { data: inserted, error } = await supabase
      .from("signals")
      .insert({
        coin: symbol,
        signal_type: decision.type,
        status: "ACTIVE",
        entry_price: decision.entryPrice,
        entry_low: decision.entryLow,
        entry_high: decision.entryHigh,
        tp1: decision.tp1,
        tp2: decision.tp2,
        tp3: decision.tp3,
        stop_loss: decision.stopLoss,
        leverage,
        timeframe: "4H",
        exchange: "Binance",
        risk_level: decision.riskLevel,
        notes,
        confidence: decision.confidence,
        analysis_summary: notes,
        auto_generated: true,
      })
      .select()
      .single();

    if (error) {
      return { symbol, status: "error", reason: error.message };
    }

    return { symbol, status: "generated", signal: inserted };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { symbol, status: "error", reason: message };
  }
}

export async function generateAllSignals(symbols: string[]): Promise<GenerateResult[]> {
  const results: GenerateResult[] = [];
  for (const symbol of symbols) {
    const result = await analyzePair(symbol);
    results.push(result);
    await new Promise((r) => setTimeout(r, 500));
  }
  return results;
}
