// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SignalAnalysis {
  direction: "LONG" | "SHORT";
  confidence: number;
  reasons: string[];
  rsi: number;
  macdHistogram: number | null;
  emaTrend: "BULLISH" | "BEARISH" | "NEUTRAL";
  atr: number;
  volumeRatio: number;
  bbPosition: string;
  tp1: number;
  tp2: number;
  tp3: number;
  sl: number;
  leverage: number;
  riskLevel: string;
}

// ─── EMA (internal helper — builds full array in one pass) ───────────────────

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(prev);
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

export function calcEMA(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const result = ema(values, period);
  return result[result.length - 1] ?? null;
}

// ─── RSI ─────────────────────────────────────────────────────────────────────

export function calcRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;

  const changes = closes
    .slice(-period - 1)
    .map((v, i, arr) => (i === 0 ? 0 : v - arr[i - 1]))
    .slice(1);

  const avgGain = changes.filter((c) => c > 0).reduce((a, b) => a + b, 0) / period;
  const avgLoss =
    Math.abs(changes.filter((c) => c < 0).reduce((a, b) => a + b, 0)) / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
}

// ─── MACD (uses continuous EMA arrays — correct) ─────────────────────────────

export function calcMACD(closes: number[]): {
  macd: number;
  signal: number;
  histogram: number;
  prevHistogram: number;
} | null {
  if (closes.length < 35) return null;

  const ema12all = ema(closes, 12);
  const ema26all = ema(closes, 26);

  // Align: ema12all is longer; trim so indices match
  const offset = ema12all.length - ema26all.length;
  const macdLine: number[] = [];
  for (let i = 0; i < ema26all.length; i++) {
    macdLine.push(ema12all[i + offset] - ema26all[i]);
  }

  if (macdLine.length < 9) return null;

  const signalLine = ema(macdLine, 9);

  const lastMacd = macdLine[macdLine.length - 1];
  const prevMacd = macdLine[macdLine.length - 2];
  const lastSig = signalLine[signalLine.length - 1];
  const prevSig = signalLine[signalLine.length - 2];

  return {
    macd: lastMacd,
    signal: lastSig,
    histogram: lastMacd - lastSig,
    prevHistogram: prevMacd - prevSig,
  };
}

// ─── BOLLINGER BANDS ─────────────────────────────────────────────────────────

export function calcBB(
  closes: number[],
  period = 20
): {
  upper: number;
  middle: number;
  lower: number;
  position: string;
} | null {
  if (closes.length < period) return null;

  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((sum, v) => sum + Math.pow(v - middle, 2), 0) / period;
  const std = Math.sqrt(variance);
  const upper = middle + 2 * std;
  const lower = middle - 2 * std;

  const price = closes[closes.length - 1];
  const range = upper - lower;
  const pos = range > 0 ? (price - lower) / range : 0.5;

  const position =
    pos <= 0.1 ? "LOWER" :
    pos <= 0.3 ? "LOWER_MID" :
    pos >= 0.9 ? "UPPER" :
    pos >= 0.7 ? "UPPER_MID" : "MIDDLE";

  return { upper, middle, lower, position };
}

// ─── ATR ─────────────────────────────────────────────────────────────────────

export function calcATR(candles: OHLCV[], period = 14): number | null {
  if (candles.length < period + 1) return null;

  const trs = candles.slice(-period - 1).map((c, i, arr) => {
    if (i === 0) return c.high - c.low;
    const prevClose = arr[i - 1].close;
    return Math.max(
      c.high - c.low,
      Math.abs(c.high - prevClose),
      Math.abs(c.low - prevClose)
    );
  }).slice(1);

  return trs.reduce((a, b) => a + b, 0) / period;
}

// ─── VOLUME RATIO ─────────────────────────────────────────────────────────────

export function calcVolumeRatio(candles: OHLCV[]): number {
  if (candles.length < 20) return 1.0;
  const recent = candles.slice(-20);
  const avgVol = recent.slice(0, 19).reduce((s, c) => s + c.volume, 0) / 19;
  const currVol = recent[recent.length - 1].volume;
  if (avgVol === 0) return 1.0;
  return Math.round((currVol / avgVol) * 100) / 100;
}

// ─── MAIN ANALYSIS ────────────────────────────────────────────────────────────

export function analyzeSignal(candles: OHLCV[]): SignalAnalysis | null {
  if (!candles || candles.length < 60) return null;

  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  if (!price || price <= 0) return null;

  // All indicators — require real values, no fallbacks
  const rsi = calcRSI(closes);
  const macd = calcMACD(closes);
  const ema20 = calcEMA(closes, 20);
  const ema50 = calcEMA(closes, 50);
  const ema200 = calcEMA(closes, 200);
  const bb = calcBB(closes);
  const atr = calcATR(candles);
  const volumeRatio = calcVolumeRatio(candles);

  // Need at minimum RSI + both short EMAs to produce a signal
  if (rsi === null || ema20 === null || ema50 === null) return null;

  let longScore = 0;
  let shortScore = 0;
  const longReasons: string[] = [];
  const shortReasons: string[] = [];
  let emaTrend: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  let bbPosition = "MIDDLE";

  // ── RSI (weight: 40pts max) ──────────────────────────────────────────────────
  if (rsi <= 20)      { longScore += 40;  longReasons.push(`RSI extremely oversold (${rsi})`); }
  else if (rsi <= 30) { longScore += 30;  longReasons.push(`RSI oversold (${rsi})`); }
  else if (rsi <= 40) { longScore += 18;  longReasons.push(`RSI low (${rsi})`); }
  else if (rsi <= 45) { longScore += 8;   longReasons.push(`RSI below midline (${rsi})`); }
  else if (rsi >= 80) { shortScore += 40; shortReasons.push(`RSI extremely overbought (${rsi})`); }
  else if (rsi >= 70) { shortScore += 30; shortReasons.push(`RSI overbought (${rsi})`); }
  else if (rsi >= 60) { shortScore += 18; shortReasons.push(`RSI high (${rsi})`); }
  else if (rsi >= 55) { shortScore += 8;  shortReasons.push(`RSI above midline (${rsi})`); }
  // 45–55 neutral → no score

  // ── MACD (weight: 30pts max) ─────────────────────────────────────────────────
  if (macd) {
    const cross    = macd.prevHistogram < 0 && macd.histogram > 0;
    const bearCross = macd.prevHistogram > 0 && macd.histogram < 0;

    if (cross)                                                     { longScore += 30;  longReasons.push("MACD bullish crossover"); }
    else if (macd.histogram > 0 && macd.histogram > macd.prevHistogram) { longScore += 18;  longReasons.push("MACD momentum rising"); }
    else if (macd.histogram > 0)                                   { longScore += 8;   longReasons.push("MACD positive"); }
    else if (bearCross)                                            { shortScore += 30; shortReasons.push("MACD bearish crossover"); }
    else if (macd.histogram < 0 && macd.histogram < macd.prevHistogram) { shortScore += 18; shortReasons.push("MACD momentum falling"); }
    else if (macd.histogram < 0)                                   { shortScore += 8;  shortReasons.push("MACD negative"); }
  }

  // ── EMA trend (weight: 40pts max) ────────────────────────────────────────────
  const above20        = price > ema20;
  const above50        = price > ema50;
  const ema20aboveEma50 = ema20 > ema50;

  if (above20 && above50 && ema20aboveEma50) {
    longScore += 25; longReasons.push("Above EMA20 & EMA50");
    emaTrend = "BULLISH";
  } else if (!above20 && !above50 && !ema20aboveEma50) {
    shortScore += 25; shortReasons.push("Below EMA20 & EMA50");
    emaTrend = "BEARISH";
  } else if (above20 && !above50) {
    longScore += 10; longReasons.push("Above EMA20, below EMA50");
    emaTrend = "NEUTRAL";
  } else if (!above20 && above50) {
    shortScore += 10; shortReasons.push("Below EMA20, above EMA50");
    emaTrend = "NEUTRAL";
  }

  if (ema200 !== null) {
    if (price > ema200) { longScore  += 15; longReasons.push("Above EMA200"); }
    else                { shortScore += 15; shortReasons.push("Below EMA200"); }
  }

  // ── Bollinger Bands (weight: 25pts max) ──────────────────────────────────────
  if (bb) {
    bbPosition = bb.position;
    const range = bb.upper - bb.lower;
    const pos = range > 0 ? (price - bb.lower) / range : 0.5;

    if (pos <= 0.1)       { longScore  += 25; longReasons.push("At BB lower band"); }
    else if (pos <= 0.25) { longScore  += 12; longReasons.push("Near BB lower band"); }
    else if (pos >= 0.9)  { shortScore += 25; shortReasons.push("At BB upper band"); }
    else if (pos >= 0.75) { shortScore += 12; shortReasons.push("Near BB upper band"); }
  }

  // ── Volume (weight: 20pts max) ───────────────────────────────────────────────
  if (volumeRatio >= 3.0) {
    longScore += 20; shortScore += 20;
    longReasons.push(`Very high volume (${volumeRatio}x)`);
    shortReasons.push(`Very high volume (${volumeRatio}x)`);
  } else if (volumeRatio >= 2.0) {
    longScore += 12; shortScore += 12;
    longReasons.push(`High volume (${volumeRatio}x)`);
    shortReasons.push(`High volume (${volumeRatio}x)`);
  } else if (volumeRatio >= 1.5) {
    longScore += 6; shortScore += 6;
    longReasons.push(`Above avg volume (${volumeRatio}x)`);
    shortReasons.push(`Above avg volume (${volumeRatio}x)`);
  } else if (volumeRatio < 0.5) {
    longScore -= 5; shortScore -= 5;
  }

  // ── Direction ────────────────────────────────────────────────────────────────
  const direction: "LONG" | "SHORT" = longScore > shortScore ? "LONG" : "SHORT";
  const winScore  = direction === "LONG" ? longScore  : shortScore;
  const loseScore = direction === "LONG" ? shortScore : longScore;
  const reasons   = direction === "LONG" ? longReasons : shortReasons;
  const edge      = Math.max(0, winScore - loseScore);

  // ── Confidence ───────────────────────────────────────────────────────────────
  // Max possible ~140 (RSI40 + MACD30 + EMA40 + BB25 + Vol5)
  const scoreContrib = Math.min(32, Math.round((winScore / 140) * 32));
  const edgeContrib  = Math.min(15, Math.round((edge / 60) * 15));
  const confidence   = Math.min(92, Math.max(46, 45 + scoreContrib + edgeContrib));

  // ── ATR levels ───────────────────────────────────────────────────────────────
  const safeAtr = atr && atr > 0 ? atr : price * 0.02;
  let tp1: number, tp2: number, tp3: number, sl: number;

  if (direction === "LONG") {
    sl  = price - safeAtr * 1.5;
    tp1 = price + safeAtr * 1.0;
    tp2 = price + safeAtr * 2.0;
    tp3 = price + safeAtr * 3.5;
  } else {
    sl  = price + safeAtr * 1.5;
    tp1 = price - safeAtr * 1.0;
    tp2 = price - safeAtr * 2.0;
    tp3 = price - safeAtr * 3.5;
  }

  const leverage  = confidence >= 85 ? 5 : confidence >= 75 ? 3 : confidence >= 65 ? 2 : 1;
  const riskLevel = confidence >= 80 ? "LOW" : confidence >= 65 ? "MEDIUM" : "HIGH";

  return {
    direction,
    confidence,
    reasons: reasons.length > 0
      ? reasons
      : [`${direction} technical bias — score ${winScore} vs ${loseScore}`],
    rsi,
    macdHistogram: macd?.histogram ?? null,
    emaTrend,
    atr: safeAtr,
    volumeRatio,
    bbPosition,
    tp1, tp2, tp3, sl,
    leverage,
    riskLevel,
  };
}
