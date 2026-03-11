// EMA - Exponential Moving Average
export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  const emas: number[] = [];
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  emas.push(ema);
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    emas.push(ema);
  }
  return emas;
}

// RSI - Relative Strength Index (Wilder's smoothing)
export function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  const changes = prices.slice(1).map((p, i) => p - prices[i]);
  let gains = 0, losses = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) gains += changes[i];
    else losses -= changes[i];
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    avgGain = (avgGain * (period - 1) + Math.max(0, change)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -change)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// MACD
export function calculateMACD(prices: number[]): {
  macd: number; signal: number; histogram: number; trend: "BULLISH" | "BEARISH" | "NEUTRAL";
} {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  if (ema12.length < 9 || ema26.length < 9) {
    return { macd: 0, signal: 0, histogram: 0, trend: "NEUTRAL" };
  }
  const macdLine = ema12.slice(-ema26.length).map((v, i) => v - ema26[i]);
  const signalLine = calculateEMA(macdLine, 9);
  const macd = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1];
  const histogram = macd - signal;
  const prevHistogram = macdLine[macdLine.length - 2] - signalLine[signalLine.length - 2];
  let trend: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  if (histogram > 0 && histogram > prevHistogram) trend = "BULLISH";
  else if (histogram < 0 && histogram < prevHistogram) trend = "BEARISH";
  return { macd, signal, histogram, trend };
}

// Bollinger Bands
export function calculateBollinger(
  prices: number[],
  period = 20,
  stdDev = 2
): { upper: number; middle: number; lower: number; position: "UPPER" | "LOWER" | "MIDDLE" } {
  if (prices.length < period) {
    const p = prices[prices.length - 1];
    return { upper: p, middle: p, lower: p, position: "MIDDLE" };
  }
  const slice = prices.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
  const std = Math.sqrt(variance);
  const upper = mean + stdDev * std;
  const lower = mean - stdDev * std;
  const current = prices[prices.length - 1];
  let position: "UPPER" | "LOWER" | "MIDDLE" = "MIDDLE";
  if (current >= upper * 0.98) position = "UPPER";
  else if (current <= lower * 1.02) position = "LOWER";
  return { upper, middle: mean, lower, position };
}

// ATR - Average True Range
export function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): number {
  if (highs.length < period + 1) return closes[closes.length - 1] * 0.02;
  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    trs.push(
      Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      )
    );
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

// Volume Analysis
export function analyzeVolume(
  volumes: number[],
  period = 20
): { signal: "HIGH" | "LOW" | "NORMAL"; ratio: number } {
  if (volumes.length < period) return { signal: "NORMAL", ratio: 1 };
  const avg = volumes.slice(-period - 1, -1).reduce((a, b) => a + b, 0) / period;
  const current = volumes[volumes.length - 1];
  const ratio = current / avg;
  if (ratio > 1.5) return { signal: "HIGH", ratio };
  if (ratio < 0.5) return { signal: "LOW", ratio };
  return { signal: "NORMAL", ratio };
}

// SMC - Smart Money Concepts (swing highs/lows)
export function calculateSMC(
  highs: number[],
  lows: number[],
  closes: number[]
): { support: number; resistance: number; trend: "BULLISH" | "BEARISH" | "SIDEWAYS" } {
  const lookback = Math.min(20, highs.length);
  const recentHighs = highs.slice(-lookback);
  const recentLows = lows.slice(-lookback);
  const resistance = Math.max(...recentHighs);
  const support = Math.min(...recentLows);
  const current = closes[closes.length - 1];
  const range = resistance - support;
  let trend: "BULLISH" | "BEARISH" | "SIDEWAYS" = "SIDEWAYS";
  if (current > support + range * 0.6) trend = "BULLISH";
  else if (current < support + range * 0.4) trend = "BEARISH";
  return { support, resistance, trend };
}

// Main signal decision engine
export interface SignalDecision {
  type: "LONG" | "SHORT" | "NONE";
  confidence: number;
  reasons: string[];
  entryPrice: number;
  entryLow: number;
  entryHigh: number;
  tp1: number;
  tp2: number;
  tp3: number;
  stopLoss: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

export function generateSignalDecision(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[],
  closes1h: number[],
  highs1h: number[],
  lows1h: number[]
): SignalDecision {
  const currentPrice = closes[closes.length - 1];

  const rsi = calculateRSI(closes);
  const rsi1h = calculateRSI(closes1h);
  const macd = calculateMACD(closes);
  const macd1h = calculateMACD(closes1h);
  const bb = calculateBollinger(closes);
  const atr = calculateATR(highs, lows, closes);
  const volume = analyzeVolume(volumes);
  const smc = calculateSMC(highs, lows, closes);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);

  const e20 = ema20[ema20.length - 1];
  const e50 = ema50.length > 0 ? ema50[ema50.length - 1] : 0;
  const e200 = ema200.length > 0 ? ema200[ema200.length - 1] : 0;

  // suppress unused warning — e200 used for potential future trend filter
  void e200;
  void lows1h;
  void highs1h;

  let longScore = 0;
  let shortScore = 0;
  const longReasons: string[] = [];
  const shortReasons: string[] = [];

  // RSI signals
  if (rsi < 30) { longScore += 25; longReasons.push("RSI oversold (<30)"); }
  else if (rsi < 40) { longScore += 12; longReasons.push("RSI approaching oversold"); }
  if (rsi > 70) { shortScore += 25; shortReasons.push("RSI overbought (>70)"); }
  else if (rsi > 60) { shortScore += 12; shortReasons.push("RSI approaching overbought"); }

  // 1H RSI confirmation
  if (rsi1h < 35) longScore += 10;
  if (rsi1h > 65) shortScore += 10;

  // MACD signals
  if (macd.trend === "BULLISH") { longScore += 20; longReasons.push("MACD bullish crossover"); }
  if (macd.trend === "BEARISH") { shortScore += 20; shortReasons.push("MACD bearish crossover"); }

  // 1H MACD confirmation
  if (macd1h.trend === "BULLISH") longScore += 10;
  if (macd1h.trend === "BEARISH") shortScore += 10;

  // EMA trend
  if (e20 > 0 && e50 > 0 && currentPrice > e20 && e20 > e50) {
    longScore += 15;
    longReasons.push("Price above all EMAs (bullish trend)");
  }
  if (e20 > 0 && e50 > 0 && currentPrice < e20 && e20 < e50) {
    shortScore += 15;
    shortReasons.push("Price below all EMAs (bearish trend)");
  }

  // Bollinger Bands
  if (bb.position === "LOWER") { longScore += 15; longReasons.push("Price at lower Bollinger Band"); }
  if (bb.position === "UPPER") { shortScore += 15; shortReasons.push("Price at upper Bollinger Band"); }

  // Volume confirmation
  if (volume.signal === "HIGH") {
    longScore += 10; shortScore += 10;
    longReasons.push("High volume confirms bullish move");
    shortReasons.push("High volume confirms bearish move");
  }

  // SMC support/resistance
  const distToSupport = (currentPrice - smc.support) / currentPrice;
  const distToResistance = (smc.resistance - currentPrice) / currentPrice;
  if (distToSupport < 0.02) {
    longScore += 15;
    longReasons.push(`Price near strong support at ${smc.support.toFixed(2)}`);
  }
  if (distToResistance < 0.02) {
    shortScore += 15;
    shortReasons.push(`Price near strong resistance at ${smc.resistance.toFixed(2)}`);
  }

  const THRESHOLD = 50;
  let type: "LONG" | "SHORT" | "NONE" = "NONE";
  let confidence = 0;
  let reasons: string[] = [];

  if (longScore >= THRESHOLD && longScore > shortScore) {
    type = "LONG";
    confidence = Math.min(95, longScore);
    reasons = longReasons;
  } else if (shortScore >= THRESHOLD && shortScore > longScore) {
    type = "SHORT";
    confidence = Math.min(95, shortScore);
    reasons = shortReasons;
  }

  if (type === "NONE") {
    return {
      type: "NONE", confidence: 0, reasons: [],
      entryPrice: currentPrice, entryLow: currentPrice, entryHigh: currentPrice,
      tp1: currentPrice, tp2: currentPrice, tp3: currentPrice,
      stopLoss: currentPrice, riskLevel: "MEDIUM",
    };
  }

  const atrMultiplier = 1.5;
  let entryPrice: number, entryLow: number, entryHigh: number;
  let tp1: number, tp2: number, tp3: number, stopLoss: number;

  if (type === "LONG") {
    entryPrice = currentPrice;
    entryLow = currentPrice - atr * 0.3;
    entryHigh = currentPrice + atr * 0.3;
    stopLoss = currentPrice - atr * atrMultiplier;
    tp1 = currentPrice + atr * 2;
    tp2 = currentPrice + atr * 3.5;
    tp3 = currentPrice + atr * 5;
  } else {
    entryPrice = currentPrice;
    entryLow = currentPrice - atr * 0.3;
    entryHigh = currentPrice + atr * 0.3;
    stopLoss = currentPrice + atr * atrMultiplier;
    tp1 = currentPrice - atr * 2;
    tp2 = currentPrice - atr * 3.5;
    tp3 = currentPrice - atr * 5;
  }

  const atrPct = (atr / currentPrice) * 100;
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";
  if (atrPct < 1.5) riskLevel = "LOW";
  else if (atrPct > 3) riskLevel = "HIGH";

  return {
    type, confidence, reasons,
    entryPrice: parseFloat(entryPrice.toFixed(8)),
    entryLow: parseFloat(entryLow.toFixed(8)),
    entryHigh: parseFloat(entryHigh.toFixed(8)),
    tp1: parseFloat(tp1.toFixed(8)),
    tp2: parseFloat(tp2.toFixed(8)),
    tp3: parseFloat(tp3.toFixed(8)),
    stopLoss: parseFloat(stopLoss.toFixed(8)),
    riskLevel,
  };
}
