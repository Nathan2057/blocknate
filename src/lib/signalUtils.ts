import { formatDistanceToNow, format } from "date-fns";

export type SignalStatus =
  | "ACTIVE"
  | "TP1_HIT"
  | "TP2_HIT"
  | "TP3_HIT"
  | "SL_HIT"
  | "NO_TARGET"
  | "EXPIRED";

export interface Signal {
  id: string;
  pair: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  timeframe: string;
  entry_price: number;
  current_price: number | null;
  exit_price: number | null;
  tp1: number;
  tp2: number;
  tp3: number;
  sl: number;
  confidence: number;
  leverage: number;
  risk_level: string;
  status: SignalStatus;
  rsi: number | null;
  macd_histogram: number | null;
  ema_trend: string | null;
  atr: number | null;
  volume_ratio: number | null;
  bb_position: string | null;
  analysis: string | null;
  reasons: string[];
  session_id: string | null;
  session_start: string | null;
  session_end: string | null;
  created_at: string;
  closed_at: string | null;
  pnl_pct: number | null;
  hit_tp1: boolean;
  hit_tp2: boolean;
  hit_tp3: boolean;
  hit_sl: boolean;
}

export interface SignalSession {
  id: string;
  session_id: string;
  started_at: string;
  ended_at: string | null;
  pairs: string[];
  total_signals: number;
  tp1_hit: number;
  tp2_hit: number;
  tp3_hit: number;
  sl_hit: number;
  no_target: number;
  win_rate: number | null;
  avg_pnl: number | null;
  status: "ACTIVE" | "CLOSED";
  created_at: string;
}

export function timeAgo(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "MMM d, yyyy HH:mm");
}

export function calcWinRate(signals: Signal[]): number {
  const closed = signals.filter((s) =>
    ["TP1_HIT", "TP2_HIT", "TP3_HIT", "SL_HIT", "NO_TARGET", "EXPIRED"].includes(s.status)
  );
  if (closed.length === 0) return 0;
  const wins = closed.filter((s) => ["TP1_HIT", "TP2_HIT", "TP3_HIT"].includes(s.status));
  return (wins.length / closed.length) * 100;
}

export function calcAvgPNL(signals: Signal[]): number {
  const withPNL = signals.filter((s) => s.pnl_pct !== null);
  if (withPNL.length === 0) return 0;
  return withPNL.reduce((sum, s) => sum + (s.pnl_pct ?? 0), 0) / withPNL.length;
}

export function getCoinLabel(pair: string): string {
  return pair.replace("USDT", "").replace("BUSD", "");
}

export function formatSessionId(sessionId: string): string {
  // "2026-03-13_slot2" -> "Mar 13, 2026 · Slot 2"
  const parts = sessionId.split("_slot");
  if (parts.length !== 2) return sessionId;
  const date = format(new Date(parts[0]), "MMM d, yyyy");
  const slotNum = parseInt(parts[1]);
  const slotHour = slotNum * 4;
  const timeStr = `${slotHour.toString().padStart(2, "0")}:00 UTC`;
  return `${date} · ${timeStr}`;
}

export function getNextRefresh(): Date {
  const now = new Date();
  const slot = Math.floor(now.getUTCHours() / 4);
  const next = new Date(now);
  next.setUTCHours((slot + 1) * 4, 0, 0, 0);
  return next;
}
