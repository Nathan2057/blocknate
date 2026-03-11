"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Signal, SignalStatus, timeAgo, getCoinLabel } from "@/lib/signalUtils";

type StatusFilter =
  | "ALL"
  | "ACTIVE"
  | "TP1_HIT"
  | "TP2_HIT"
  | "TP3_HIT"
  | "SL_HIT"
  | "CLOSED"
  | "LONG"
  | "SHORT";

type CoinFilter = "ALL" | "BTC" | "ETH" | "SOL" | "BNB" | "XRP";

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SignalStatus }) {
  if (status === "ACTIVE") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(0,102,255,0.1)", color: "#0066FF", border: "1px solid rgba(0,102,255,0.3)", borderRadius: 3, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 600 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0066FF", display: "inline-block", flexShrink: 0 }} />
        ACTIVE
      </span>
    );
  }
  if (["TP1_HIT", "TP2_HIT", "TP3_HIT"].includes(status)) {
    return (
      <span style={{ background: "rgba(0,200,150,0.1)", color: "#00C896", border: "1px solid rgba(0,200,150,0.3)", borderRadius: 3, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 600 }}>
        ✓ {status.replace("_HIT", " HIT")}
      </span>
    );
  }
  if (status === "SL_HIT") {
    return (
      <span style={{ background: "rgba(255,59,92,0.1)", color: "#FF3B5C", border: "1px solid rgba(255,59,92,0.3)", borderRadius: 3, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 600 }}>
        ✗ SL HIT
      </span>
    );
  }
  return (
    <span style={{ background: "rgba(136,146,164,0.1)", color: "#8892A4", border: "1px solid rgba(136,146,164,0.2)", borderRadius: 3, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 600 }}>
      {status}
    </span>
  );
}

// ─── Signal Card ─────────────────────────────────────────────────────────────

function SignalCard({ signal }: { signal: Signal }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = signal.signal_type === "LONG";
  const accent = isLong ? "#00C896" : "#FF3B5C";
  const tp1Hit = ["TP1_HIT", "TP2_HIT", "TP3_HIT"].includes(signal.status);
  const tp2Hit = ["TP2_HIT", "TP3_HIT"].includes(signal.status);
  const tp3Hit = signal.status === "TP3_HIT";
  const notes = signal.notes ?? signal.analysis_summary ?? "";
  const needsToggle = notes.length > 120;
  const confidence = signal.confidence ?? 0;
  const confColor = confidence >= 75 ? "#00C896" : confidence >= 55 ? "#F59E0B" : "#FF3B5C";

  function fmt(n: number) {
    return n >= 1
      ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
      : n.toFixed(6);
  }

  return (
    <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderLeft: `3px solid ${accent}`, borderRadius: 4, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "#080C14", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#E8ECF4", fontWeight: 700, fontSize: "0.95rem" }}>
            {getCoinLabel(signal.coin)}
          </span>
          <span style={{ background: isLong ? "rgba(0,200,150,0.15)" : "rgba(255,59,92,0.15)", color: accent, border: `1px solid ${isLong ? "rgba(0,200,150,0.3)" : "rgba(255,59,92,0.3)"}`, borderRadius: 3, padding: "1px 7px", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.05em" }}>
            {signal.signal_type}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {signal.auto_generated && (
            <span style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 3, padding: "1px 6px", fontSize: "0.65rem", fontWeight: 600 }}>
              AUTO
            </span>
          )}
          <StatusBadge status={signal.status} />
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Confidence */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: "#8892A4", fontSize: "0.72rem" }}>Confidence</span>
            <span style={{ color: confColor, fontSize: "0.72rem", fontWeight: 700 }}>{confidence}%</span>
          </div>
          <div style={{ height: 5, background: "#1C2236", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${confidence}%`, background: confColor, borderRadius: 3 }} />
          </div>
        </div>

        {/* Price Levels */}
        <div style={{ background: "#06080F", borderRadius: 3, overflow: "hidden" }}>
          {/* Entry Zone */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: "rgba(0,102,255,0.05)" }}>
            <span style={{ color: "#6B8AFF", fontSize: "0.72rem" }}>Entry Zone</span>
            <span style={{ color: "#6B8AFF", fontSize: "0.75rem", fontWeight: 600 }}>
              {fmt(signal.entry_low)} – {fmt(signal.entry_high)}
            </span>
          </div>
          {/* TP1 */}
          {[
            { label: "TP1", price: signal.tp1, struck: tp1Hit, checked: tp1Hit },
            { label: "TP2", price: signal.tp2, struck: tp2Hit, checked: tp2Hit },
            { label: "TP3", price: signal.tp3, struck: tp3Hit, checked: tp3Hit },
          ].map(({ label, price, struck, checked }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00C896", display: "inline-block", flexShrink: 0 }} />
                <span style={{ color: "#8892A4", fontSize: "0.72rem" }}>{label}</span>
                {checked && <span style={{ color: "#00C896", fontSize: "0.72rem" }}>✓</span>}
              </div>
              <span style={{ color: "#E8ECF4", fontSize: "0.78rem", fontWeight: 600, textDecoration: struck ? "line-through" : "none", opacity: struck ? 0.5 : 1 }}>
                {fmt(price)}
              </span>
            </div>
          ))}
          {/* Stop Loss */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: "rgba(255,59,92,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF3B5C", display: "inline-block", flexShrink: 0 }} />
              <span style={{ color: "#8892A4", fontSize: "0.72rem" }}>Stop Loss</span>
            </div>
            <span style={{ color: "#FF3B5C", fontSize: "0.78rem", fontWeight: 600 }}>{fmt(signal.stop_loss)}</span>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "Leverage", value: `${signal.leverage}x`, color: undefined },
            { label: "Timeframe", value: signal.timeframe ?? "4H", color: undefined },
            { label: "Exchange", value: signal.exchange ?? "Binance", color: undefined },
            { label: "Risk Level", value: signal.risk_level ?? "MEDIUM", color: signal.risk_level === "LOW" ? "#00C896" : signal.risk_level === "HIGH" ? "#FF3B5C" : "#F59E0B" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#06080F", borderRadius: 3, padding: 8 }}>
              <div style={{ color: "#8892A4", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</div>
              <div style={{ color: color ?? "#E8ECF4", fontSize: "0.82rem", fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Notes */}
        {notes && (
          <div style={{ borderLeft: "2px solid #1C2236", paddingLeft: 10 }}>
            <p style={{ color: "#8892A4", fontSize: "0.75rem", fontStyle: "italic", margin: 0, lineHeight: 1.5 }}>
              {expanded || !needsToggle ? notes : notes.slice(0, 120) + "..."}
            </p>
            {needsToggle && (
              <button onClick={() => setExpanded((e) => !e)} style={{ background: "none", border: "none", color: "#0066FF", fontSize: "0.72rem", cursor: "pointer", padding: "3px 0 0" }}>
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #1C2236", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#8892A4", fontSize: "0.72rem" }}>🕐 {timeAgo(signal.created_at)}</span>
        {signal.pnl !== null && signal.pnl !== undefined && (
          <span style={{ background: signal.pnl >= 0 ? "rgba(0,200,150,0.1)" : "rgba(255,59,92,0.1)", color: signal.pnl >= 0 ? "#00C896" : "#FF3B5C", border: `1px solid ${signal.pnl >= 0 ? "rgba(0,200,150,0.3)" : "rgba(255,59,92,0.3)"}`, borderRadius: 3, padding: "2px 8px", fontSize: "0.78rem", fontWeight: 700 }}>
            {signal.pnl >= 0 ? "+" : ""}{signal.pnl.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Filter Button ────────────────────────────────────────────────────────────

function FilterBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: active ? "#0066FF" : "#0C1018", border: `1px solid ${active || hovered ? "#0066FF" : "#1C2236"}`, color: active || hovered ? "#fff" : "#8892A4", padding: "6px 14px", borderRadius: 3, fontSize: "0.78rem", cursor: "pointer", fontWeight: active ? 600 : 400, whiteSpace: "nowrap" }}
    >
      {label}
    </button>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, background: "#0C1018", border: "1px solid #00C896", color: "#00C896", borderRadius: 4, padding: "10px 18px", fontSize: "0.82rem", fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
      ✓ Signals updated
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "ALL", value: "ALL" },
  { label: "ACTIVE", value: "ACTIVE" },
  { label: "TP1 HIT", value: "TP1_HIT" },
  { label: "TP2 HIT", value: "TP2_HIT" },
  { label: "TP3 HIT", value: "TP3_HIT" },
  { label: "SL HIT", value: "SL_HIT" },
  { label: "CLOSED", value: "CLOSED" },
  { label: "LONG", value: "LONG" },
  { label: "SHORT", value: "SHORT" },
];

const COIN_FILTERS: CoinFilter[] = ["ALL", "BTC", "ETH", "SOL", "BNB", "XRP"];

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [coinFilter, setCoinFilter] = useState<CoinFilter>("ALL");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showToast, setShowToast] = useState(false);

  const fetchSignals = useCallback(async (showUpdate = false) => {
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase
      .from("signals")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setSignals(data as Signal[]);
      setLastUpdated(new Date());
      if (showUpdate) {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSignals();
    if (!supabase) return;
    const channel = supabase
      .channel("signals-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "signals" }, () => fetchSignals(true))
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, [fetchSignals]);

  const filtered = signals.filter((s) => {
    if (statusFilter === "LONG") return s.signal_type === "LONG";
    if (statusFilter === "SHORT") return s.signal_type === "SHORT";
    if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
    if (coinFilter !== "ALL" && !s.coin.startsWith(coinFilter)) return false;
    return true;
  });

  const emptyMsg = () => {
    if (statusFilter === "ACTIVE") return "No active signals. Bot is analyzing markets...";
    if (statusFilter === "SL_HIT") return "No stop losses hit. Good trading!";
    return "No signals match your filters";
  };

  return (
    <div style={{ padding: "24px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <h1 style={{ color: "#E8ECF4", fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>Live Signals</h1>
        <span style={{ background: "rgba(0,102,255,0.15)", color: "#0066FF", border: "1px solid rgba(0,102,255,0.3)", borderRadius: 20, padding: "2px 10px", fontSize: "0.78rem", fontWeight: 600 }}>
          {filtered.length}
        </span>
        {lastUpdated && (
          <span style={{ color: "#8892A4", fontSize: "0.72rem", marginLeft: "auto" }}>
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Status filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {STATUS_FILTERS.map(({ label, value }) => (
          <FilterBtn key={value} label={label} active={statusFilter === value} onClick={() => setStatusFilter(value)} />
        ))}
      </div>

      {/* Coin filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
        {COIN_FILTERS.map((coin) => (
          <FilterBtn key={coin} label={coin} active={coinFilter === coin} onClick={() => setCoinFilter(coin)} />
        ))}
      </div>

      {/* Skeleton loading */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 380, background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4 }} />
          ))}
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filtered.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 24px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 16, opacity: 0.4 }}>📊</div>
          <p style={{ color: "#E8ECF4", fontSize: "1rem", fontWeight: 600, margin: "0 0 8px" }}>No signals found</p>
          <p style={{ color: "#8892A4", fontSize: "0.85rem", margin: 0 }}>{emptyMsg()}</p>
        </div>
      )}

      <Toast show={showToast} />
    </div>
  );
}
