"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Signal, timeAgo, getNextRefresh, formatSessionId } from "@/lib/signalUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

function pctFrom(entry: number, target: number): string {
  const pct = ((target - entry) / entry) * 100;
  return (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%";
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Refreshing...";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ─── Confidence circle ────────────────────────────────────────────────────────

function ConfidenceCircle({ value }: { value: number }) {
  const color = value >= 70 ? "#00C896" : value >= 55 ? "#F59E0B" : "#FF3B5C";
  const r = 22;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - value / 100);
  return (
    <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
      <svg width={56} height={56} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={28} cy={28} r={r} fill="none" stroke="#1C2236" strokeWidth={4} />
        <circle
          cx={28} cy={28} r={r} fill="none"
          stroke={color} strokeWidth={4}
          strokeDasharray={circ}
          strokeDashoffset={fill}
          strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ color, fontSize: "0.78rem", fontWeight: 800 }}>{value}%</span>
      </div>
    </div>
  );
}

// ─── Price Ladder ─────────────────────────────────────────────────────────────

function PriceLadder({ signal }: { signal: Signal }) {
  const { direction, entry_price, tp1, tp2, tp3, sl } = signal;
  const isLong = direction === "LONG";
  const current = signal.current_price ?? entry_price;
  const pctCurrent = ((current - entry_price) / entry_price) * 100;

  const levels = isLong
    ? [
        { label: "TP3", price: tp3, color: "#00C896", dashed: true },
        { label: "TP2", price: tp2, color: "#00C896", dashed: true },
        { label: "TP1", price: tp1, color: "#00C896", dashed: false },
        { label: "SL",  price: sl,  color: "#FF3B5C", dashed: false },
      ]
    : [
        { label: "SL",  price: sl,  color: "#FF3B5C", dashed: false },
        { label: "TP1", price: tp1, color: "#00C896", dashed: false },
        { label: "TP2", price: tp2, color: "#00C896", dashed: true },
        { label: "TP3", price: tp3, color: "#00C896", dashed: true },
      ];

  const tp1Progress = isLong
    ? Math.min(100, Math.max(0, ((current - entry_price) / (tp1 - entry_price)) * 100))
    : Math.min(100, Math.max(0, ((entry_price - current) / (entry_price - tp1)) * 100));

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Levels */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
        {levels.map((lv) => (
          <div key={lv.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#4A5568", fontSize: "0.68rem", fontWeight: 600, minWidth: 28 }}>
              {lv.label}
            </span>
            <div style={{
              flex: 1, height: 1,
              background: lv.dashed
                ? `repeating-linear-gradient(to right, ${lv.color}44 0 6px, transparent 6px 12px)`
                : `${lv.color}44`,
            }} />
            <span style={{ color: lv.color, fontSize: "0.75rem", fontWeight: 600, minWidth: 80, textAlign: "right" }}>
              ${fmtPrice(lv.price)}
            </span>
            <span style={{ color: lv.color, fontSize: "0.65rem", minWidth: 52, textAlign: "right" }}>
              {pctFrom(entry_price, lv.price)}
            </span>
          </div>
        ))}
        {/* Entry */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(0,102,255,0.08)",
          border: "1px solid rgba(0,102,255,0.25)",
          borderRadius: 3, padding: "4px 8px",
        }}>
          <span style={{ color: "#0066FF", fontSize: "0.68rem", fontWeight: 700, minWidth: 28 }}>ENTRY</span>
          <div style={{ flex: 1, height: 1, background: "#0066FF44" }} />
          <span style={{ color: "#FFFFFF", fontSize: "0.82rem", fontWeight: 700, minWidth: 80, textAlign: "right" }}>
            ${fmtPrice(entry_price)}
          </span>
          <span style={{ minWidth: 52 }} />
        </div>
      </div>

      {/* Current price */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "6px 10px", background: "rgba(28,34,54,0.5)", borderRadius: 3, marginBottom: 10,
      }}>
        <span style={{ color: "#8892A4", fontSize: "0.72rem" }}>Current</span>
        <span style={{ color: "#FFFFFF", fontSize: "0.85rem", fontWeight: 700 }}>${fmtPrice(current)}</span>
        <span style={{ color: pctCurrent >= 0 ? "#00C896" : "#FF3B5C", fontSize: "0.72rem", fontWeight: 600 }}>
          {pctCurrent >= 0 ? "▲" : "▼"} {Math.abs(pctCurrent).toFixed(2)}%
        </span>
      </div>

      {/* TP1 progress */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ color: "#4A5568", fontSize: "0.65rem" }}>Progress to TP1</span>
          <span style={{ color: "#00C896", fontSize: "0.65rem", fontWeight: 600 }}>{tp1Progress.toFixed(0)}%</span>
        </div>
        <div style={{ height: 4, background: "#1C2236", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${tp1Progress}%`,
            background: "linear-gradient(to right, #0066FF, #00C896)",
            borderRadius: 2,
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── Signal Card ──────────────────────────────────────────────────────────────

function SignalCard({ signal }: { signal: Signal }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = signal.direction === "LONG";
  const accent = isLong ? "#00C896" : "#FF3B5C";

  return (
    <div
      style={{
        background: "#0C1018",
        border: "1px solid #1C2236",
        borderTop: `3px solid ${accent}`,
        borderRadius: 4,
        padding: 20,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px rgba(${isLong ? "0,200,150" : "255,59,92"},0.1)`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ color: "#FFFFFF", fontSize: "1.4rem", fontWeight: 800, lineHeight: 1 }}>
              {signal.symbol}
            </span>
            <span style={{ color: "#4A5568", fontSize: "0.8rem" }}>USDT</span>
            <span style={{
              fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 3,
              background: isLong ? "rgba(0,200,150,0.12)" : "rgba(255,59,92,0.12)",
              color: accent,
              border: `1px solid ${isLong ? "rgba(0,200,150,0.3)" : "rgba(255,59,92,0.3)"}`,
            }}>
              {signal.direction}
            </span>
            <span style={{
              fontSize: "0.65rem", fontWeight: 600, padding: "2px 6px", borderRadius: 2,
              background: "rgba(74,85,104,0.2)", color: "#4A5568",
            }}>
              {signal.timeframe}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: "rgba(0,200,150,0.08)", color: "#00C896",
              border: "1px solid rgba(0,200,150,0.25)",
              borderRadius: 3, padding: "2px 8px", fontSize: "0.65rem", fontWeight: 700,
            }}>
              <span className="pulse-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: "#00C896", display: "inline-block" }} />
              ACTIVE
            </span>
            <span style={{ color: "#4A5568", fontSize: "0.72rem" }}>{timeAgo(signal.created_at)}</span>
          </div>
        </div>
        <ConfidenceCircle value={signal.confidence} />
      </div>

      {/* Price ladder */}
      <PriceLadder signal={signal} />

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <span style={{ color: "#4A5568", fontSize: "0.72rem" }}>
            Lev: <span style={{ color: "#8892A4", fontWeight: 600 }}>{signal.leverage}x</span>
          </span>
          <span style={{
            fontSize: "0.65rem", fontWeight: 700, padding: "2px 6px", borderRadius: 2,
            background: signal.risk_level === "LOW" ? "rgba(0,200,150,0.1)" : signal.risk_level === "HIGH" ? "rgba(255,59,92,0.1)" : "rgba(245,158,11,0.1)",
            color: signal.risk_level === "LOW" ? "#00C896" : signal.risk_level === "HIGH" ? "#FF3B5C" : "#F59E0B",
          }}>
            {signal.risk_level} RISK
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ background: "transparent", border: "none", color: "#4A5568", fontSize: "0.72rem", cursor: "pointer" }}
        >
          Analysis {expanded ? "▲" : "▼"}
        </button>
      </div>

      {/* Analysis panel */}
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #1C2236" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            {signal.rsi !== null && (
              <div>
                <span style={{ color: "#4A5568", fontSize: "0.65rem", display: "block", marginBottom: 4 }}>RSI</span>
                <div style={{ height: 3, background: "#1C2236", borderRadius: 2, marginBottom: 3 }}>
                  <div style={{ height: "100%", width: `${signal.rsi}%`, background: signal.rsi < 30 ? "#00C896" : signal.rsi > 70 ? "#FF3B5C" : "#F59E0B", borderRadius: 2 }} />
                </div>
                <span style={{ color: "#E8ECF4", fontSize: "0.72rem", fontWeight: 600 }}>{signal.rsi.toFixed(1)}</span>
              </div>
            )}
            {signal.ema_trend && (
              <div>
                <span style={{ color: "#4A5568", fontSize: "0.65rem", display: "block", marginBottom: 4 }}>EMA Trend</span>
                <span style={{ color: signal.ema_trend === "BULLISH" ? "#00C896" : signal.ema_trend === "BEARISH" ? "#FF3B5C" : "#8892A4", fontSize: "0.72rem", fontWeight: 700 }}>
                  {signal.ema_trend}
                </span>
              </div>
            )}
            {signal.volume_ratio !== null && (
              <div>
                <span style={{ color: "#4A5568", fontSize: "0.65rem", display: "block", marginBottom: 4 }}>Volume</span>
                <span style={{ color: (signal.volume_ratio ?? 0) > 1.5 ? "#00C896" : "#8892A4", fontSize: "0.72rem", fontWeight: 600 }}>
                  {(signal.volume_ratio ?? 0).toFixed(2)}x
                </span>
              </div>
            )}
          </div>
          {signal.reasons && signal.reasons.length > 0 && (
            <div>
              <span style={{ color: "#4A5568", fontSize: "0.65rem", display: "block", marginBottom: 6 }}>KEY REASONS</span>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                {signal.reasons.map((r, i) => (
                  <li key={i} style={{ color: "#8892A4", fontSize: "0.75rem", display: "flex", gap: 6 }}>
                    <span style={{ color: accent, flexShrink: 0 }}>›</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Result badge ─────────────────────────────────────────────────────────────

function ResultBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    TP3_HIT:   { label: "TP3",    color: "#00C896", bg: "rgba(0,200,150,0.12)" },
    TP2_HIT:   { label: "TP2",    color: "#00C896", bg: "rgba(0,200,150,0.1)" },
    TP1_HIT:   { label: "TP1",    color: "#6EE7B7", bg: "rgba(110,231,183,0.1)" },
    SL_HIT:    { label: "SL",     color: "#FF3B5C", bg: "rgba(255,59,92,0.12)" },
    NO_TARGET: { label: "NO TGT", color: "#8892A4", bg: "rgba(136,146,164,0.1)" },
    EXPIRED:   { label: "EXPIRED",color: "#4A5568", bg: "rgba(74,85,104,0.1)" },
  };
  const cfg = map[status] ?? { label: status, color: "#8892A4", bg: "rgba(136,146,164,0.1)" };
  return (
    <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 7px", borderRadius: 2, color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SignalsPage() {
  const [activeSignals, setActiveSignals] = useState<Signal[]>([]);
  const [recentSignals, setRecentSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSignals = useCallback(async () => {
    const [{ data: active }, { data: recent }] = await Promise.all([
      supabase!
        .from("signals")
        .select("*")
        .eq("status", "ACTIVE")
        .order("confidence", { ascending: false }),
      supabase!
        .from("signals")
        .select("*")
        .neq("status", "ACTIVE")
        .order("closed_at", { ascending: false })
        .limit(15),
    ]);
    setActiveSignals((active ?? []) as Signal[]);
    setRecentSignals((recent ?? []) as Signal[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSignals();

    const channel = supabase!
      .channel("signals-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "signals" }, loadSignals)
      .subscribe();

    function tick() {
      const next = getNextRefresh();
      setCountdown(formatCountdown(next.getTime() - Date.now()));
    }
    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      supabase!.removeChannel(channel);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadSignals]);

  return (
    <div>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: "1.4rem", margin: 0 }}>Live Signals</h1>
          <p style={{ color: "#4A5568", fontSize: "0.78rem", marginTop: 4 }}>5 signals · refreshed every 4 hours · ATR-based targets</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ background: "rgba(12,16,24,0.8)", border: "1px solid #1C2236", borderRadius: 4, padding: "8px 16px", textAlign: "center" }}>
            <div style={{ color: "#4A5568", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 2 }}>NEXT REFRESH</div>
            <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "0.95rem", fontVariantNumeric: "tabular-nums" }}>{countdown}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#00C896", display: "inline-block" }} />
            <span style={{ color: "#00C896", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.06em" }}>LIVE</span>
          </div>
        </div>
      </div>

      {/* Active signals grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16, marginBottom: 32 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ height: 380, borderRadius: 4 }} className="skeleton" />
          ))}
        </div>
      ) : activeSignals.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16, marginBottom: 32 }}>
          {activeSignals.map((s) => <SignalCard key={s.id} signal={s} />)}
        </div>
      ) : (
        <div style={{ background: "rgba(12,16,24,0.7)", border: "1px solid #1C2236", borderRadius: 4, padding: "60px 24px", textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>⏱</div>
          <h3 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>No Active Signals</h3>
          <p style={{ color: "#4A5568", fontSize: "0.82rem", marginBottom: 4 }}>
            Next batch in <span style={{ color: "#FFFFFF", fontWeight: 600 }}>{countdown}</span>
          </p>
          <p style={{ color: "#4A5568", fontSize: "0.75rem" }}>Signals refresh every 4 hours using live 4H candle data</p>
        </div>
      )}

      {/* Recent signals table */}
      {recentSignals.length > 0 && (
        <div>
          <div className="section-label" style={{ marginBottom: 14 }}>
            <div className="section-label-bar" />
            <span className="section-label-text">Recent Signals</span>
          </div>
          <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1C2236", background: "#080C14" }}>
                    {["Pair", "Dir", "Entry", "Exit", "Result", "PnL %", "Session", "Time"].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", color: "#4A5568", fontWeight: 600, fontSize: "0.68rem", letterSpacing: "0.08em", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentSignals.map((s, i) => {
                    const isLong = s.direction === "LONG";
                    return (
                      <tr key={s.id} style={{ borderBottom: i < recentSignals.length - 1 ? "1px solid #1C2236" : "none" }}>
                        <td style={{ padding: "10px 14px", color: "#FFFFFF", fontWeight: 700, whiteSpace: "nowrap" }}>{s.symbol}/USDT</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 6px", borderRadius: 2, background: isLong ? "rgba(0,200,150,0.1)" : "rgba(255,59,92,0.1)", color: isLong ? "#00C896" : "#FF3B5C" }}>
                            {s.direction}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#8892A4", whiteSpace: "nowrap" }}>${fmtPrice(s.entry_price)}</td>
                        <td style={{ padding: "10px 14px", color: "#8892A4", whiteSpace: "nowrap" }}>{s.exit_price ? `$${fmtPrice(s.exit_price)}` : "—"}</td>
                        <td style={{ padding: "10px 14px" }}><ResultBadge status={s.status} /></td>
                        <td style={{ padding: "10px 14px", fontWeight: 700, whiteSpace: "nowrap" }}>
                          {s.pnl_pct !== null ? (
                            <span style={{ color: s.pnl_pct >= 0 ? "#00C896" : "#FF3B5C" }}>
                              {s.pnl_pct >= 0 ? "+" : ""}{s.pnl_pct.toFixed(2)}%
                            </span>
                          ) : "—"}
                        </td>
                        <td style={{ padding: "10px 14px", color: "#4A5568", fontSize: "0.7rem", whiteSpace: "nowrap" }}>
                          {s.session_id ? formatSessionId(s.session_id) : "—"}
                        </td>
                        <td style={{ padding: "10px 14px", color: "#4A5568", fontSize: "0.7rem", whiteSpace: "nowrap" }}>
                          {timeAgo(s.closed_at ?? s.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
