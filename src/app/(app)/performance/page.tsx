"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Signal, SignalSession, timeAgo, formatSessionId } from "@/lib/signalUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, positive,
}: {
  label: string; value: string; sub?: string; positive?: boolean | null;
}) {
  const color = positive === null || positive === undefined ? "#FFFFFF" : positive ? "#00C896" : "#FF3B5C";
  return (
    <div style={{
      flex: "1 1 160px",
      background: "#0C1018",
      border: "1px solid #1C2236",
      borderLeft: "3px solid #0066FF",
      borderRadius: 4,
      padding: "14px 20px",
    }}>
      <div style={{ color: "#4A5568", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ color, fontSize: "1.5rem", fontWeight: 800, lineHeight: 1, marginBottom: 2 }}>{value}</div>
      {sub && <div style={{ color: "#4A5568", fontSize: "0.72rem" }}>{sub}</div>}
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
    ACTIVE:    { label: "ACTIVE", color: "#0066FF", bg: "rgba(0,102,255,0.1)" },
  };
  const cfg = map[status] ?? { label: status, color: "#8892A4", bg: "rgba(136,146,164,0.1)" };
  return (
    <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 2, color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

// ─── Session chart bar ────────────────────────────────────────────────────────

function SessionBars({ sessions }: { sessions: SignalSession[] }) {
  const [tooltip, setTooltip] = useState<{ session: SignalSession; x: number; y: number } | null>(null);
  const closed = sessions.filter((s) => s.win_rate !== null);
  if (closed.length === 0) return null;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120, padding: "0 4px" }}>
        {closed.map((s) => {
          const wr = s.win_rate ?? 0;
          const color = wr >= 60 ? "#00C896" : wr >= 40 ? "#F59E0B" : "#FF3B5C";
          return (
            <div
              key={s.id}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setTooltip({ session: s, x: rect.left, y: rect.top });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <div style={{ width: "100%", background: "#1C2236", borderRadius: "2px 2px 0 0", position: "relative", height: 104 }}>
                <div
                  style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    height: `${Math.max(4, wr)}%`,
                    background: color,
                    borderRadius: "2px 2px 0 0",
                    opacity: 0.85,
                  }}
                />
              </div>
              <span style={{ color: "#4A5568", fontSize: "0.55rem", whiteSpace: "nowrap" }}>
                {s.session_id.split("_slot")[1] !== undefined ? `S${s.session_id.split("_slot")[1]}` : ""}
              </span>
            </div>
          );
        })}
      </div>
      {tooltip && (
        <div style={{
          position: "fixed", top: tooltip.y - 90, left: tooltip.x,
          background: "#0C1018", border: "1px solid #1C2236",
          borderRadius: 4, padding: "8px 12px", zIndex: 999, pointerEvents: "none", minWidth: 160,
        }}>
          <p style={{ color: "#FFFFFF", fontWeight: 600, fontSize: "0.75rem", margin: "0 0 4px" }}>
            {formatSessionId(tooltip.session.session_id)}
          </p>
          <p style={{ color: "#00C896", fontSize: "0.72rem", margin: "0 0 2px" }}>
            Win rate: {(tooltip.session.win_rate ?? 0).toFixed(1)}%
          </p>
          <p style={{ color: "#8892A4", fontSize: "0.68rem", margin: 0 }}>
            TP: {tooltip.session.tp1_hit + tooltip.session.tp2_hit + tooltip.session.tp3_hit} · SL: {tooltip.session.sl_hit}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const DIRECTION_FILTERS = ["ALL", "LONG", "SHORT"] as const;
const RESULT_FILTERS = ["ALL", "TP_HIT", "SL_HIT", "NO_TARGET"] as const;
const DATE_FILTERS = ["ALL", "7D", "30D"] as const;

export default function PerformancePage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [sessions, setSessions] = useState<SignalSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Filters
  const [dirFilter, setDirFilter] = useState<(typeof DIRECTION_FILTERS)[number]>("ALL");
  const [resultFilter, setResultFilter] = useState<(typeof RESULT_FILTERS)[number]>("ALL");
  const [dateFilter, setDateFilter] = useState<(typeof DATE_FILTERS)[number]>("ALL");
  const [pairFilter, setPairFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    const [{ data: sigs }, { data: sess }] = await Promise.all([
      supabase!.from("signals").select("*").order("created_at", { ascending: false }),
      supabase!.from("signal_sessions").select("*").order("started_at", { ascending: false }),
    ]);
    setSignals((sigs ?? []) as Signal[]);
    setSessions((sess ?? []) as SignalSession[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const closed = signals.filter((s) => s.status !== "ACTIVE");
  const wins = closed.filter((s) => ["TP1_HIT", "TP2_HIT", "TP3_HIT"].includes(s.status));
  const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
  const avgPnl = closed.filter((s) => s.pnl_pct !== null).length > 0
    ? closed.filter((s) => s.pnl_pct !== null).reduce((a, s) => a + (s.pnl_pct ?? 0), 0) /
      closed.filter((s) => s.pnl_pct !== null).length
    : 0;
  const bestPnl = closed.reduce((best, s) => Math.max(best, s.pnl_pct ?? -Infinity), -Infinity);

  // Unique pairs for filter dropdown
  const allPairs = ["ALL", ...Array.from(new Set(signals.map((s) => s.symbol))).sort()];

  // Filter signals
  const filtered = signals.filter((s) => {
    if (s.status === "ACTIVE") return false;
    if (dirFilter !== "ALL" && s.direction !== dirFilter) return false;
    if (resultFilter === "TP_HIT" && !["TP1_HIT", "TP2_HIT", "TP3_HIT"].includes(s.status)) return false;
    if (resultFilter === "SL_HIT" && s.status !== "SL_HIT") return false;
    if (resultFilter === "NO_TARGET" && s.status !== "NO_TARGET") return false;
    if (pairFilter !== "ALL" && s.symbol !== pairFilter) return false;
    if (dateFilter === "7D") {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (new Date(s.created_at).getTime() < cutoff) return false;
    }
    if (dateFilter === "30D") {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      if (new Date(s.created_at).getTime() < cutoff) return false;
    }
    return true;
  });

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: "5px 12px",
    borderRadius: 3,
    border: `1px solid ${active ? "#0066FF" : "#1C2236"}`,
    background: active ? "rgba(0,102,255,0.12)" : "transparent",
    color: active ? "#0066FF" : "#8892A4",
    fontSize: "0.75rem",
    fontWeight: active ? 700 : 400,
    cursor: "pointer",
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: "1.4rem", margin: 0 }}>Performance</h1>
        <p style={{ color: "#4A5568", fontSize: "0.78rem", marginTop: 4 }}>Track record of all signal sessions</p>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="Total Signals" value={closed.length.toString()} sub={`${signals.filter(s => s.status === "ACTIVE").length} active`} />
        <StatCard
          label="Win Rate"
          value={closed.length > 0 ? `${winRate.toFixed(1)}%` : "—"}
          sub={`${wins.length} wins / ${closed.length - wins.length} losses`}
          positive={closed.length > 0 ? winRate >= 50 : null}
        />
        <StatCard
          label="Avg PnL"
          value={closed.filter(s => s.pnl_pct !== null).length > 0 ? `${avgPnl >= 0 ? "+" : ""}${avgPnl.toFixed(2)}%` : "—"}
          positive={closed.filter(s => s.pnl_pct !== null).length > 0 ? avgPnl >= 0 : null}
        />
        <StatCard
          label="Best Signal"
          value={bestPnl > -Infinity ? `+${bestPnl.toFixed(2)}%` : "—"}
          positive={bestPnl > 0 ? true : null}
        />
        <StatCard label="Sessions Run" value={sessions.length.toString()} sub={`${sessions.filter(s => s.status === "ACTIVE").length} active`} />
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ height: 80, borderRadius: 4 }} className="skeleton" />)}
        </div>
      ) : (
        <>
          {/* Session chart */}
          {sessions.length > 0 && (
            <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, padding: 20, marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "0.88rem" }}>Session Win Rates</span>
                <span style={{ color: "#4A5568", fontSize: "0.72rem" }}>{sessions.filter(s => s.win_rate !== null).length} sessions</span>
              </div>
              <SessionBars sessions={sessions} />
            </div>
          )}

          {/* Sessions table */}
          {sessions.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div className="section-label" style={{ marginBottom: 14 }}>
                <div className="section-label-bar" />
                <span className="section-label-text">Session History</span>
              </div>
              <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1C2236", background: "#080C14" }}>
                        {["Session", "Pairs", "TP1", "TP2", "TP3", "SL", "No Tgt", "Win Rate", "Avg PnL", "Status"].map((h) => (
                          <th key={h} style={{ padding: "10px 12px", color: "#4A5568", fontWeight: 600, fontSize: "0.65rem", letterSpacing: "0.08em", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <>
                          <tr
                            key={s.id}
                            onClick={() => setExpandedSession(expandedSession === s.session_id ? null : s.session_id)}
                            style={{
                              borderBottom: "1px solid #1C2236",
                              cursor: "pointer",
                              background: expandedSession === s.session_id ? "rgba(0,102,255,0.04)" : "transparent",
                            }}
                          >
                            <td style={{ padding: "10px 12px", color: "#FFFFFF", fontWeight: 600, whiteSpace: "nowrap", fontSize: "0.75rem" }}>
                              {formatSessionId(s.session_id)}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                                {(s.pairs ?? []).map((p) => (
                                  <span key={p} style={{ fontSize: "0.6rem", fontWeight: 700, padding: "1px 5px", borderRadius: 2, background: "rgba(28,34,54,0.8)", color: "#8892A4", border: "1px solid #1C2236" }}>
                                    {p.replace("USDT", "")}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td style={{ padding: "10px 12px", color: "#6EE7B7", fontWeight: 600 }}>{s.tp1_hit}</td>
                            <td style={{ padding: "10px 12px", color: "#00C896", fontWeight: 600 }}>{s.tp2_hit}</td>
                            <td style={{ padding: "10px 12px", color: "#00C896", fontWeight: 700 }}>{s.tp3_hit}</td>
                            <td style={{ padding: "10px 12px", color: "#FF3B5C", fontWeight: 600 }}>{s.sl_hit}</td>
                            <td style={{ padding: "10px 12px", color: "#4A5568" }}>{s.no_target}</td>
                            <td style={{ padding: "10px 12px", fontWeight: 700 }}>
                              {s.win_rate !== null ? (
                                <span style={{ color: (s.win_rate ?? 0) >= 50 ? "#00C896" : "#FF3B5C" }}>
                                  {(s.win_rate ?? 0).toFixed(1)}%
                                </span>
                              ) : "—"}
                            </td>
                            <td style={{ padding: "10px 12px", fontWeight: 700 }}>
                              {s.avg_pnl !== null ? (
                                <span style={{ color: (s.avg_pnl ?? 0) >= 0 ? "#00C896" : "#FF3B5C" }}>
                                  {(s.avg_pnl ?? 0) >= 0 ? "+" : ""}{(s.avg_pnl ?? 0).toFixed(2)}%
                                </span>
                              ) : "—"}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              {s.status === "ACTIVE" ? (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.65rem", fontWeight: 700, color: "#00C896", background: "rgba(0,200,150,0.1)", padding: "2px 6px", borderRadius: 2 }}>
                                  <span className="pulse-dot" style={{ width: 4, height: 4, borderRadius: "50%", background: "#00C896", display: "inline-block" }} />
                                  ACTIVE
                                </span>
                              ) : (
                                <span style={{ color: "#4A5568", fontSize: "0.65rem", fontWeight: 600 }}>CLOSED</span>
                              )}
                            </td>
                          </tr>
                          {/* Expanded session signals */}
                          {expandedSession === s.session_id && (
                            <tr key={`${s.id}-exp`}>
                              <td colSpan={10} style={{ padding: "0 0 8px", background: "rgba(0,0,0,0.2)" }}>
                                <SessionSignals sessionId={s.session_id} />
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Signal breakdown */}
          <div>
            <div className="section-label" style={{ marginBottom: 14 }}>
              <div className="section-label-bar" />
              <span className="section-label-text">Signal Breakdown</span>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 4 }}>
                {DIRECTION_FILTERS.map((f) => (
                  <button key={f} onClick={() => { setDirFilter(f); setPage(0); }} style={btnStyle(dirFilter === f)}>{f}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {RESULT_FILTERS.map((f) => (
                  <button key={f} onClick={() => { setResultFilter(f); setPage(0); }} style={btnStyle(resultFilter === f)}>
                    {f === "TP_HIT" ? "TP HIT" : f === "NO_TARGET" ? "NO TGT" : f}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {DATE_FILTERS.map((f) => (
                  <button key={f} onClick={() => { setDateFilter(f); setPage(0); }} style={btnStyle(dateFilter === f)}>{f}</button>
                ))}
              </div>
              <select
                value={pairFilter}
                onChange={(e) => { setPairFilter(e.target.value); setPage(0); }}
                style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 3, color: "#8892A4", padding: "5px 10px", fontSize: "0.75rem", cursor: "pointer", outline: "none" }}
              >
                {allPairs.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <span style={{ color: "#4A5568", fontSize: "0.72rem", marginLeft: "auto" }}>{filtered.length} signals</span>
            </div>

            {filtered.length === 0 ? (
              <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, padding: 32, textAlign: "center" }}>
                <p style={{ color: "#4A5568", fontSize: "0.85rem" }}>No signals match the selected filters</p>
              </div>
            ) : (
              <>
                <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #1C2236", background: "#080C14" }}>
                          {["#", "Pair", "Dir", "Entry", "Exit", "TP1", "SL", "Result", "PnL %", "Date"].map((h) => (
                            <th key={h} style={{ padding: "10px 12px", color: "#4A5568", fontWeight: 600, fontSize: "0.65rem", letterSpacing: "0.08em", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map((s, idx) => {
                          const isLong = s.direction === "LONG";
                          return (
                            <tr key={s.id} style={{ borderBottom: idx < paginated.length - 1 ? "1px solid #1C2236" : "none" }}>
                              <td style={{ padding: "9px 12px", color: "#4A5568", fontSize: "0.68rem" }}>
                                {page * PAGE_SIZE + idx + 1}
                              </td>
                              <td style={{ padding: "9px 12px", color: "#FFFFFF", fontWeight: 700, whiteSpace: "nowrap" }}>
                                {s.symbol}/USDT
                              </td>
                              <td style={{ padding: "9px 12px" }}>
                                <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "1px 5px", borderRadius: 2, background: isLong ? "rgba(0,200,150,0.1)" : "rgba(255,59,92,0.1)", color: isLong ? "#00C896" : "#FF3B5C" }}>
                                  {s.direction}
                                </span>
                              </td>
                              <td style={{ padding: "9px 12px", color: "#8892A4", whiteSpace: "nowrap" }}>${fmtPrice(s.entry_price)}</td>
                              <td style={{ padding: "9px 12px", color: "#8892A4", whiteSpace: "nowrap" }}>{s.exit_price ? `$${fmtPrice(s.exit_price)}` : "—"}</td>
                              <td style={{ padding: "9px 12px", color: "#4A5568", whiteSpace: "nowrap" }}>${fmtPrice(s.tp1)}</td>
                              <td style={{ padding: "9px 12px", color: "#4A5568", whiteSpace: "nowrap" }}>${fmtPrice(s.sl)}</td>
                              <td style={{ padding: "9px 12px" }}><ResultBadge status={s.status} /></td>
                              <td style={{ padding: "9px 12px", fontWeight: 700, whiteSpace: "nowrap" }}>
                                {s.pnl_pct !== null ? (
                                  <span style={{ color: s.pnl_pct >= 0 ? "#00C896" : "#FF3B5C" }}>
                                    {s.pnl_pct >= 0 ? "+" : ""}{s.pnl_pct.toFixed(2)}%
                                  </span>
                                ) : "—"}
                              </td>
                              <td style={{ padding: "9px 12px", color: "#4A5568", fontSize: "0.7rem", whiteSpace: "nowrap" }}>
                                {timeAgo(s.created_at)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      style={{ ...btnStyle(false), opacity: page === 0 ? 0.4 : 1 }}
                    >
                      ← Prev
                    </button>
                    <span style={{ color: "#4A5568", fontSize: "0.78rem", padding: "5px 12px" }}>
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page === totalPages - 1}
                      style={{ ...btnStyle(false), opacity: page === totalPages - 1 ? 0.4 : 1 }}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Inline session signals ───────────────────────────────────────────────────

function SessionSignals({ sessionId }: { sessionId: string }) {
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    supabase!
      .from("signals")
      .select("*")
      .eq("session_id", sessionId)
      .order("confidence", { ascending: false })
      .then(({ data }) => setSignals((data ?? []) as Signal[]));
  }, [sessionId]);

  if (signals.length === 0) {
    return <div style={{ padding: "12px 16px", color: "#4A5568", fontSize: "0.75rem" }}>Loading...</div>;
  }

  return (
    <div style={{ padding: "8px 16px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
        {signals.map((s) => {
          const isLong = s.direction === "LONG";
          return (
            <div key={s.id} style={{ background: "rgba(28,34,54,0.4)", border: "1px solid #1C2236", borderRadius: 3, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "0.82rem" }}>{s.symbol}/USDT</span>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "1px 5px", borderRadius: 2, background: isLong ? "rgba(0,200,150,0.1)" : "rgba(255,59,92,0.1)", color: isLong ? "#00C896" : "#FF3B5C" }}>
                  {s.direction}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#4A5568", fontSize: "0.7rem" }}>Conf: <span style={{ color: "#8892A4" }}>{s.confidence}%</span></span>
                {s.pnl_pct !== null ? (
                  <span style={{ color: s.pnl_pct >= 0 ? "#00C896" : "#FF3B5C", fontWeight: 700, fontSize: "0.75rem" }}>
                    {s.pnl_pct >= 0 ? "+" : ""}{s.pnl_pct.toFixed(2)}%
                  </span>
                ) : (
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "1px 5px", borderRadius: 2, color: "#0066FF", background: "rgba(0,102,255,0.1)" }}>ACTIVE</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
