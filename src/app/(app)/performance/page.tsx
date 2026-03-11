"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { format, startOfWeek, isWithinInterval, startOfDay, endOfDay, subDays } from "date-fns";
import { supabase } from "@/lib/supabase";
import {
  Signal,
  SignalStatus,
  timeAgo,
  formatDate,
  calcWinRate,
  calcAvgPNL,
  getCoinLabel,
} from "@/lib/signalUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusTab = "ALL" | "ACTIVE" | "TP_HIT" | "SL_HIT" | "CLOSED";
type TypeTab = "ALL" | "LONG" | "SHORT";
type CoinTab = "ALL" | "BTC" | "ETH" | "SOL" | "BNB" | "XRP";
type DateTab = "WEEK" | "MONTH" | "ALL";

// ─── Stats Card ───────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
  pulse,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  accent: string;
  pulse?: boolean;
}) {
  return (
    <div
      style={{
        background: "#0C1018",
        border: "1px solid #1C2236",
        borderLeft: `3px solid ${accent}`,
        borderRadius: 4,
        padding: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: `${accent}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1rem",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <span
          style={{
            color: "#8892A4",
            fontSize: "0.68rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        {pulse && (
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: accent,
              display: "inline-block",
              marginLeft: "auto",
            }}
          />
        )}
      </div>
      <div style={{ color: accent, fontSize: "2rem", fontWeight: 900, lineHeight: 1, marginBottom: sub ? 4 : 0 }}>
        {value}
      </div>
      {sub && <div style={{ color: "#8892A4", fontSize: "0.75rem", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Custom Chart Tooltip ─────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; pnl: number; count: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "#0C1018",
        border: "1px solid #1C2236",
        borderRadius: 4,
        padding: "10px 14px",
        fontSize: "0.78rem",
      }}
    >
      <div style={{ color: "#E8ECF4", fontWeight: 600, marginBottom: 4 }}>{d.label}</div>
      <div style={{ color: d.pnl >= 0 ? "#00C896" : "#FF3B5C", fontWeight: 700 }}>
        {d.pnl >= 0 ? "+" : ""}{d.pnl.toFixed(2)}% PNL
      </div>
      <div style={{ color: "#8892A4" }}>{d.count} signal{d.count !== 1 ? "s" : ""}</div>
    </div>
  );
}

// ─── Table Filter Button ──────────────────────────────────────────────────────

function TabBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? "#0066FF" : "#0C1018",
        border: `1px solid ${active || hovered ? "#0066FF" : "#1C2236"}`,
        color: active || hovered ? "#fff" : "#8892A4",
        padding: "5px 12px",
        borderRadius: 3,
        fontSize: "0.75rem",
        cursor: "pointer",
        fontWeight: active ? 600 : 400,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: SignalStatus }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    ACTIVE: { bg: "rgba(0,102,255,0.1)", color: "#0066FF", label: "ACTIVE" },
    TP1_HIT: { bg: "rgba(0,200,150,0.1)", color: "#00C896", label: "TP1 HIT" },
    TP2_HIT: { bg: "rgba(0,200,150,0.1)", color: "#00C896", label: "TP2 HIT" },
    TP3_HIT: { bg: "rgba(0,200,150,0.1)", color: "#00C896", label: "TP3 HIT" },
    SL_HIT: { bg: "rgba(255,59,92,0.1)", color: "#FF3B5C", label: "SL HIT" },
    CLOSED: { bg: "rgba(136,146,164,0.1)", color: "#8892A4", label: "CLOSED" },
    CANCELLED: { bg: "rgba(136,146,164,0.1)", color: "#8892A4", label: "CANCELLED" },
  };
  const s = map[status] ?? map.CLOSED;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 3, padding: "2px 7px", fontSize: "0.68rem", fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

// ─── Inline confidence bar ────────────────────────────────────────────────────

function InlineBar({ value }: { value: number }) {
  const color = value >= 75 ? "#00C896" : value >= 55 ? "#F59E0B" : "#FF3B5C";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: "#1C2236", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ color, fontSize: "0.7rem", fontWeight: 600, minWidth: 28 }}>{value}%</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function PerformancePage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  // table filters
  const [statusTab, setStatusTab] = useState<StatusTab>("ALL");
  const [typeTab, setTypeTab] = useState<TypeTab>("ALL");
  const [coinTab, setCoinTab] = useState<CoinTab>("ALL");
  const [dateTab, setDateTab] = useState<DateTab>("ALL");
  const [page, setPage] = useState(1);

  const fetchSignals = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase
      .from("signals")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setSignals(data as Signal[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSignals(); }, [fetchSignals]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalSignals = signals.length;
  const activeCount = signals.filter((s) => s.status === "ACTIVE").length;
  const winRate = calcWinRate(signals);
  const avgPNL = calcAvgPNL(signals);

  const withPNL = signals.filter((s) => s.pnl !== null && s.pnl !== undefined);
  const bestTrade = withPNL.reduce<Signal | null>((best, s) => (!best || (s.pnl ?? -Infinity) > (best.pnl ?? -Infinity) ? s : best), null);
  const worstTrade = withPNL.reduce<Signal | null>((worst, s) => (!worst || (s.pnl ?? Infinity) < (worst.pnl ?? Infinity) ? s : worst), null);

  const winRateColor = winRate >= 60 ? "#00C896" : winRate >= 40 ? "#F59E0B" : "#FF3B5C";

  // ── Chart data ────────────────────────────────────────────────────────────

  const closedSignals = signals.filter(
    (s) => s.pnl !== null && ["TP1_HIT", "TP2_HIT", "TP3_HIT", "SL_HIT", "CLOSED"].includes(s.status)
  );

  interface ChartPoint { label: string; pnl: number; count: number }
  let chartData: ChartPoint[] = [];

  if (closedSignals.length >= 2) {
    if (closedSignals.length <= 12) {
      // show each signal
      chartData = closedSignals.map((s) => ({
        label: `${getCoinLabel(s.coin)} ${format(new Date(s.created_at), "MMM d")}`,
        pnl: s.pnl ?? 0,
        count: 1,
      }));
    } else {
      // group by week
      const map = new Map<string, { pnl: number; count: number }>();
      for (const s of closedSignals) {
        const wk = format(startOfWeek(new Date(s.created_at)), "MMM d");
        const prev = map.get(wk) ?? { pnl: 0, count: 0 };
        map.set(wk, { pnl: prev.pnl + (s.pnl ?? 0), count: prev.count + 1 });
      }
      chartData = Array.from(map.entries()).map(([label, { pnl, count }]) => ({ label, pnl, count }));
    }
  }

  // ── Table filter ──────────────────────────────────────────────────────────

  const tableFiltered = signals.filter((s) => {
    if (statusTab === "TP_HIT" && !["TP1_HIT", "TP2_HIT", "TP3_HIT"].includes(s.status)) return false;
    if (statusTab === "SL_HIT" && s.status !== "SL_HIT") return false;
    if (statusTab === "ACTIVE" && s.status !== "ACTIVE") return false;
    if (statusTab === "CLOSED" && s.status !== "CLOSED") return false;
    if (typeTab !== "ALL" && s.signal_type !== typeTab) return false;
    if (coinTab !== "ALL" && !s.coin.startsWith(coinTab)) return false;
    if (dateTab === "WEEK") {
      const d = new Date(s.created_at);
      const interval = { start: startOfDay(subDays(new Date(), 7)), end: endOfDay(new Date()) };
      if (!isWithinInterval(d, interval)) return false;
    }
    if (dateTab === "MONTH") {
      const d = new Date(s.created_at);
      const interval = { start: startOfDay(subDays(new Date(), 30)), end: endOfDay(new Date()) };
      if (!isWithinInterval(d, interval)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(tableFiltered.length / PAGE_SIZE);
  const pageData = tableFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summaryWins = tableFiltered.filter((s) => ["TP1_HIT", "TP2_HIT", "TP3_HIT"].includes(s.status)).length;
  const summaryLosses = tableFiltered.filter((s) => s.status === "SL_HIT").length;
  const summaryAvgPNL = calcAvgPNL(tableFiltered);

  if (loading) {
    return (
      <div style={{ padding: 24, color: "#8892A4", fontSize: "0.85rem" }}>
        Loading performance data...
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Title */}
      <h1 style={{ color: "#E8ECF4", fontSize: "1.3rem", fontWeight: 700, margin: "0 0 24px" }}>
        Performance
      </h1>

      {/* ── Stats Cards ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <StatCard icon="⚡" label="Total Signals" value={String(totalSignals)} accent="#0066FF" />
        <StatCard
          icon="🎯"
          label="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          sub={`${signals.filter(s => ["TP1_HIT","TP2_HIT","TP3_HIT"].includes(s.status)).length} wins`}
          accent={winRateColor}
        />
        <StatCard icon="📡" label="Active Signals" value={String(activeCount)} accent="#0066FF" pulse />
        <StatCard
          icon="📈"
          label="Avg PNL / Trade"
          value={`${avgPNL >= 0 ? "+" : ""}${avgPNL.toFixed(2)}%`}
          accent={avgPNL >= 0 ? "#00C896" : "#FF3B5C"}
        />
        <StatCard
          icon="🏆"
          label="Best Trade"
          value={bestTrade ? `+${(bestTrade.pnl ?? 0).toFixed(2)}%` : "N/A"}
          sub={bestTrade ? getCoinLabel(bestTrade.coin) : undefined}
          accent="#00C896"
        />
        <StatCard
          icon="⚠️"
          label="Worst Trade"
          value={worstTrade ? `${(worstTrade.pnl ?? 0).toFixed(2)}%` : "N/A"}
          sub={worstTrade ? getCoinLabel(worstTrade.coin) : undefined}
          accent="#FF3B5C"
        />
      </div>

      {/* ── PNL Chart ─────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "#0C1018",
          border: "1px solid #1C2236",
          borderRadius: 4,
          padding: "20px",
          marginBottom: 28,
        }}
      >
        <h2 style={{ color: "#E8ECF4", fontSize: "1rem", fontWeight: 700, margin: "0 0 20px" }}>
          PNL History
        </h2>
        {chartData.length < 2 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#8892A4", fontSize: "0.85rem" }}>
            Not enough data yet. Signals will appear here as they close.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: "#8892A4", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#8892A4", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl >= 0 ? "#00C896" : "#FF3B5C"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Full History Table ─────────────────────────────────────────────── */}
      <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1C2236" }}>
          <h2 style={{ color: "#E8ECF4", fontSize: "1rem", fontWeight: 700, margin: "0 0 14px" }}>
            Signal History
          </h2>
          {/* Filter row */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {(["ALL", "ACTIVE", "TP_HIT", "SL_HIT", "CLOSED"] as StatusTab[]).map((v) => (
                <TabBtn key={v} label={v === "TP_HIT" ? "TP HIT" : v} active={statusTab === v} onClick={() => { setStatusTab(v); setPage(1); }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {(["ALL", "LONG", "SHORT"] as TypeTab[]).map((v) => (
                <TabBtn key={v} label={v} active={typeTab === v} onClick={() => { setTypeTab(v); setPage(1); }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {(["ALL", "BTC", "ETH", "SOL", "BNB", "XRP"] as CoinTab[]).map((v) => (
                <TabBtn key={v} label={v} active={coinTab === v} onClick={() => { setCoinTab(v); setPage(1); }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {([{ l: "This Week", v: "WEEK" }, { l: "This Month", v: "MONTH" }, { l: "All Time", v: "ALL" }] as { l: string; v: DateTab }[]).map(({ l, v }) => (
                <TabBtn key={v} label={l} active={dateTab === v} onClick={() => { setDateTab(v); setPage(1); }} />
              ))}
            </div>
          </div>
        </div>

        {/* Showing X-Y of Z */}
        <div style={{ padding: "8px 20px", borderBottom: "1px solid #1C2236", color: "#8892A4", fontSize: "0.72rem" }}>
          Showing {tableFiltered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, tableFiltered.length)} of {tableFiltered.length} signals
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
            <thead>
              <tr style={{ background: "#080C14", borderBottom: "2px solid #0066FF" }}>
                {["#", "Coin", "Type", "Entry", "TP1", "TP2", "TP3", "SL", "Status", "PNL", "Confidence", "Date"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", color: "#8892A4", fontWeight: 600, textAlign: "left", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: "40px", textAlign: "center", color: "#8892A4" }}>
                    No signals match your filters
                  </td>
                </tr>
              ) : (
                pageData.map((s, i) => {
                  const rowIdx = (page - 1) * PAGE_SIZE + i;
                  const isEven = rowIdx % 2 === 0;
                  function fp(n: number) {
                    return n >= 1
                      ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
                      : n.toFixed(4);
                  }
                  return (
                    <tr
                      key={s.id}
                      style={{ background: isEven ? "#0C1018" : "#090D15", borderBottom: "1px solid #1C223680" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#131B2E"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = isEven ? "#0C1018" : "#090D15"; }}
                    >
                      <td style={{ padding: "10px 12px", color: "#8892A4" }}>{rowIdx + 1}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ color: "#E8ECF4", fontWeight: 700 }}>{getCoinLabel(s.coin)}</div>
                        <div style={{ color: "#8892A4", fontSize: "0.68rem" }}>{s.coin}</div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ background: s.signal_type === "LONG" ? "rgba(0,200,150,0.15)" : "rgba(255,59,92,0.15)", color: s.signal_type === "LONG" ? "#00C896" : "#FF3B5C", borderRadius: 3, padding: "2px 7px", fontSize: "0.68rem", fontWeight: 700 }}>
                          {s.signal_type}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#E8ECF4" }}>{fp(s.entry_price)}</td>
                      <td style={{ padding: "10px 12px", color: "#8892A4" }}>{fp(s.tp1)}</td>
                      <td style={{ padding: "10px 12px", color: "#8892A4" }}>{fp(s.tp2)}</td>
                      <td style={{ padding: "10px 12px", color: "#8892A4" }}>{fp(s.tp3)}</td>
                      <td style={{ padding: "10px 12px", color: "#FF3B5C" }}>{fp(s.stop_loss)}</td>
                      <td style={{ padding: "10px 12px" }}><StatusPill status={s.status} /></td>
                      <td style={{ padding: "10px 12px" }}>
                        {s.pnl !== null && s.pnl !== undefined ? (
                          <span style={{ color: s.pnl >= 0 ? "#00C896" : "#FF3B5C", fontWeight: 700 }}>
                            {s.pnl >= 0 ? "+" : ""}{s.pnl.toFixed(2)}%
                          </span>
                        ) : (
                          <span style={{ color: "#8892A4" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", minWidth: 100 }}>
                        <InlineBar value={s.confidence ?? 0} />
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span title={formatDate(s.created_at)} style={{ color: "#8892A4", fontSize: "0.72rem", cursor: "default" }}>
                          {timeAgo(s.created_at)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Summary row */}
            {tableFiltered.length > 0 && (
              <tfoot>
                <tr style={{ background: "#080C14", borderTop: "2px solid #1C2236" }}>
                  <td colSpan={2} style={{ padding: "10px 12px", color: "#8892A4", fontSize: "0.72rem" }}>
                    {tableFiltered.length} total
                  </td>
                  <td colSpan={7} style={{ padding: "10px 12px", color: "#8892A4", fontSize: "0.72rem" }}>
                    <span style={{ color: "#00C896" }}>{summaryWins}W</span>
                    {" / "}
                    <span style={{ color: "#FF3B5C" }}>{summaryLosses}L</span>
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 700, fontSize: "0.78rem" }}>
                    <span style={{ color: summaryAvgPNL >= 0 ? "#00C896" : "#FF3B5C" }}>
                      {summaryAvgPNL >= 0 ? "+" : ""}{summaryAvgPNL.toFixed(2)}% avg
                    </span>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid #1C2236", display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ background: "#0C1018", border: "1px solid #1C2236", color: page === 1 ? "#8892A440" : "#8892A4", borderRadius: 3, padding: "5px 12px", fontSize: "0.75rem", cursor: page === 1 ? "not-allowed" : "pointer" }}
            >
              ← Prev
            </button>
            <span style={{ color: "#8892A4", fontSize: "0.75rem" }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ background: "#0C1018", border: "1px solid #1C2236", color: page === totalPages ? "#8892A440" : "#8892A4", borderRadius: 3, padding: "5px 12px", fontSize: "0.75rem", cursor: page === totalPages ? "not-allowed" : "pointer" }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
