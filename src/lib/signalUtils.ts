import { formatDistanceToNow, format } from "date-fns";

export type SignalStatus =
  | "ACTIVE"
  | "TP1_HIT"
  | "TP2_HIT"
  | "TP3_HIT"
  | "SL_HIT"
  | "CLOSED"
  | "CANCELLED";

export interface Signal {
  id: string;
  coin: string;
  signal_type: "LONG" | "SHORT";
  status: SignalStatus;
  entry_price: number;
  entry_low: number;
  entry_high: number;
  tp1: number;
  tp2: number;
  tp3: number;
  stop_loss: number;
  leverage: number;
  timeframe: string;
  exchange: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  notes: string | null;
  pnl: number | null;
  confidence: number;
  analysis_summary: string | null;
  auto_generated: boolean;
  created_at: string;
  updated_at: string;
}

export function timeAgo(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "MMM d, yyyy HH:mm");
}

export function calcWinRate(signals: Signal[]): number {
  const closed = signals.filter((s) =>
    ["TP1_HIT", "TP2_HIT", "TP3_HIT", "SL_HIT", "CLOSED"].includes(s.status)
  );
  if (closed.length === 0) return 0;
  const wins = closed.filter((s) =>
    ["TP1_HIT", "TP2_HIT", "TP3_HIT"].includes(s.status)
  );
  return (wins.length / closed.length) * 100;
}

export function calcAvgPNL(signals: Signal[]): number {
  const withPNL = signals.filter(
    (s) => s.pnl !== null && s.pnl !== undefined
  );
  if (withPNL.length === 0) return 0;
  return withPNL.reduce((sum, s) => sum + (s.pnl ?? 0), 0) / withPNL.length;
}

export function getCoinLabel(symbol: string): string {
  return symbol.replace("USDT", "").replace("BUSD", "");
}
