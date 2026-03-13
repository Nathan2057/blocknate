export interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

export function calcRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export function calcEMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}

export function calcMACD(closes: number[]): {
  macd: number;
  signal: number;
  histogram: number;
} | null {
  if (closes.length < 35) return null;
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  if (!ema12 || !ema26) return null;
  const macdLine = ema12 - ema26;
  const macdValues: number[] = [];
  for (let i = 26; i <= closes.length; i++) {
    const e12 = calcEMA(closes.slice(0, i), 12);
    const e26 = calcEMA(closes.slice(0, i), 26);
    if (e12 && e26) macdValues.push(e12 - e26);
  }
  const signal = calcEMA(macdValues, 9);
  if (!signal) return null;
  return { macd: macdLine, signal, histogram: macdLine - signal };
}

export function calcBB(
  closes: number[],
  period = 20
): {
  upper: number;
  middle: number;
  lower: number;
  width: number;
  position: string;
} | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(
    slice.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / period
  );
  const upper = middle + 2 * std;
  const lower = middle - 2 * std;
  const price = closes[closes.length - 1];
  const position = price >= upper ? "UPPER" : price <= lower ? "LOWER" : "MIDDLE";
  return { upper, middle, lower, width: ((upper - lower) / middle) * 100, position };
}

export function calcATR(candles: OHLCV[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    trs.push(
      Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      )
    );
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

export function calcVolumeRatio(candles: OHLCV[], period = 20): number | null {
  if (candles.length < period) return null;
  const avg =
    candles.slice(-period - 1, -1).reduce((a, b) => a + b.volume, 0) / period;
  return avg > 0 ? candles[candles.length - 1].volume / avg : null;
}

export interface SignalAnalysis {
  direction: "LONG" | "SHORT" | "NEUTRAL";
  confidence: number;
  reasons: string[];
  rsi: number | null;
  macdHistogram: number | null;
  emaTrend: string;
  atr: number | null;
  volumeRatio: number | null;
  bbPosition: string;
  tp1: number;
  tp2: number;
  tp3: number;
  sl: number;
  leverage: number;
  riskLevel: string;
}

export function analyzeSignal(candles: OHLCV[]): SignalAnalysis | null {
  if (candles.length < 100) return null;

  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];

  const rsi = calcRSI(closes);
  const macd = calcMACD(closes);
  const ema20 = calcEMA(closes, 20);
  const ema50 = calcEMA(closes, 50);
  const ema200 = calcEMA(closes, 200);
  const bb = calcBB(closes);
  const atr = calcATR(candles);
  const volumeRatio = calcVolumeRatio(candles);

  if (!rsi || !macd || !ema20 || !ema50 || !atr) return null;

  let longScore = 0;
  let shortScore = 0;
  const longReasons: string[] = [];
  const shortReasons: string[] = [];

  // RSI (0-30 points)
  if (rsi < 25) { longScore += 30; longReasons.push(`RSI deeply oversold at ${rsi.toFixed(1)}`); }
  else if (rsi < 35) { longScore += 20; longReasons.push(`RSI oversold at ${rsi.toFixed(1)}`); }
  else if (rsi < 45) { longScore += 10; longReasons.push(`RSI bearish at ${rsi.toFixed(1)}`); }
  else if (rsi > 75) { shortScore += 30; shortReasons.push(`RSI deeply overbought at ${rsi.toFixed(1)}`); }
  else if (rsi > 65) { shortScore += 20; shortReasons.push(`RSI overbought at ${rsi.toFixed(1)}`); }
  else if (rsi > 55) { shortScore += 10; shortReasons.push(`RSI bullish at ${rsi.toFixed(1)}`); }

  // MACD (0-25 points)
  if (macd.histogram > 0) {
    const pts = macd.macd > macd.signal ? 25 : 12;
    longScore += pts;
    longReasons.push(`MACD ${pts === 25 ? "bullish crossover" : "positive momentum"}`);
  } else {
    const pts = macd.macd < macd.signal ? 25 : 12;
    shortScore += pts;
    shortReasons.push(`MACD ${pts === 25 ? "bearish crossover" : "negative momentum"}`);
  }

  // EMA structure (0-25 points)
  const emaBull = price > ema20 && ema20 > ema50;
  const emaBear = price < ema20 && ema20 < ema50;
  if (emaBull) { longScore += 25; longReasons.push("Price above EMA20 > EMA50"); }
  else if (price > ema20) { longScore += 12; longReasons.push("Price above EMA20"); }
  if (emaBear) { shortScore += 25; shortReasons.push("Price below EMA20 < EMA50"); }
  else if (price < ema20) { shortScore += 12; shortReasons.push("Price below EMA20"); }

  // EMA200 trend bias (0-10 points)
  if (ema200) {
    if (price > ema200) { longScore += 10; longReasons.push("Above EMA200 (bull market)"); }
    else { shortScore += 10; shortReasons.push("Below EMA200 (bear market)"); }
  }

  // Bollinger Bands (0-15 points)
  if (bb) {
    if (bb.position === "LOWER") { longScore += 15; longReasons.push("Price at BB lower band"); }
    else if (price < bb.middle) { longScore += 7; longReasons.push("Price below BB midline"); }
    if (bb.position === "UPPER") { shortScore += 15; shortReasons.push("Price at BB upper band"); }
    else if (price > bb.middle) { shortScore += 7; shortReasons.push("Price above BB midline"); }
  }

  // Volume confirmation (0-10 points)
  if (volumeRatio && volumeRatio > 1.5) {
    const pts = volumeRatio > 2 ? 10 : 5;
    longScore += pts;
    shortScore += pts;
    longReasons.push(`Volume ${volumeRatio.toFixed(1)}x above average`);
    shortReasons.push(`Volume ${volumeRatio.toFixed(1)}x above average`);
  }

  const longWins = longScore > shortScore;
  const winScore = longWins ? longScore : shortScore;
  const loseScore = longWins ? shortScore : longScore;

  if (winScore - loseScore < 15) return null;

  const direction = longWins ? "LONG" : "SHORT";
  const reasons = longWins ? longReasons : shortReasons;
  const confidence = Math.min(95, Math.round(winScore * 0.85));

  let tp1: number, tp2: number, tp3: number, sl: number;
  if (direction === "LONG") {
    sl = price - atr * 1.5;
    tp1 = price + atr * 1.0;
    tp2 = price + atr * 2.0;
    tp3 = price + atr * 3.5;
  } else {
    sl = price + atr * 1.5;
    tp1 = price - atr * 1.0;
    tp2 = price - atr * 2.0;
    tp3 = price - atr * 3.5;
  }

  const leverage = confidence >= 80 ? 3 : confidence >= 65 ? 2 : 1;
  const riskLevel = confidence >= 75 ? "LOW" : confidence >= 60 ? "MEDIUM" : "HIGH";
  const emaTrend = emaBull ? "BULLISH" : emaBear ? "BEARISH" : "NEUTRAL";

  return {
    direction,
    confidence,
    reasons,
    rsi,
    macdHistogram: macd.histogram,
    emaTrend,
    atr,
    volumeRatio: volumeRatio ?? null,
    bbPosition: bb?.position ?? "MIDDLE",
    tp1,
    tp2,
    tp3,
    sl,
    leverage,
    riskLevel,
  };
}
