"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { fmtPrice, riskColor } from "@/lib/utils";
import { Zap } from "lucide-react";

type SignalStatus =
  | "ACTIVE"
  | "TP1_HIT"
  | "TP2_HIT"
  | "TP3_HIT"
  | "SL_HIT"
  | "CLOSED"
  | "CANCELLED";

interface Signal {
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
  confidence: number;
  auto_generated: boolean;
  created_at: string;
}

function confidenceColor(v: number) {
  if (v < 55) return "#FF3B5C";
  if (v < 75) return "#F59E0B";
  return "#00C896";
}

function SignalCard({ signal }: { signal: Signal }) {
  const isLong = signal.signal_type === "LONG";
  const borderColor = isLong ? "#00C896" : "#FF3B5C";
  const cc = confidenceColor(signal.confidence);

  return (
    <div
      style={{
        width: 260,
        flexShrink: 0,
        backgroundColor: "#0C1018",
        border: "1px solid #1C2236",
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 4,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Row 1: Coin + badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#FFFFFF" }}>
          {signal.coin}
        </span>
        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 700,
            color: "#FFFFFF",
            backgroundColor: isLong ? "#00C896" : "#FF3B5C",
            padding: "2px 7px",
            borderRadius: 3,
          }}
        >
          {signal.signal_type}
        </span>
      </div>

      {/* Row 2: Entry */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.68rem", color: "#8892A4" }}>Entry</span>
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#FFFFFF" }}>
          {fmtPrice(signal.entry_price)}
        </span>
      </div>

      {/* Row 3: TP levels */}
      <div style={{ display: "flex", gap: 6 }}>
        {[signal.tp1, signal.tp2, signal.tp3].map((tp, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              backgroundColor: "#080C14",
              border: "1px solid #1C2236",
              borderRadius: 3,
              padding: "3px 5px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.58rem", color: "#4A5568" }}>TP{i + 1}</div>
            <div style={{ fontSize: "0.68rem", color: "#00C896", fontWeight: 600 }}>
              {fmtPrice(tp)}
            </div>
          </div>
        ))}
      </div>

      {/* Row 4: Stop Loss */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.68rem", color: "#FF3B5C" }}>Stop Loss</span>
        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#FF3B5C" }}>
          {fmtPrice(signal.stop_loss)}
        </span>
      </div>

      {/* Row 5: Confidence bar */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: "0.63rem", color: "#8892A4" }}>Confidence</span>
          <span style={{ fontSize: "0.63rem", fontWeight: 600, color: cc }}>
            {signal.confidence}%
          </span>
        </div>
        <div
          style={{
            height: 4,
            backgroundColor: "#1C2236",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${signal.confidence}%`,
              backgroundColor: cc,
              borderRadius: 2,
            }}
          />
        </div>
      </div>

      {/* Row 6: Meta */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span
          style={{
            fontSize: "0.62rem",
            fontWeight: 600,
            color: riskColor(signal.risk_level),
            backgroundColor: "rgba(0,0,0,0.3)",
            border: `1px solid ${riskColor(signal.risk_level)}`,
            padding: "1px 5px",
            borderRadius: 2,
          }}
        >
          {signal.risk_level}
        </span>
        <span style={{ fontSize: "0.65rem", color: "#4A5568" }}>{signal.timeframe}</span>
        <span style={{ fontSize: "0.65rem", color: "#4A5568" }}>{signal.leverage}x</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        width: "100%",
        padding: "24px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        backgroundColor: "#0C1018",
        border: "1px solid #1C2236",
        borderRadius: 4,
        color: "#4A5568",
      }}
    >
      <Zap size={18} />
      <div>
        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#8892A4" }}>
          No active signals
        </div>
        <div style={{ fontSize: "0.72rem", marginTop: 2 }}>
          Monitoring market conditions for new opportunities
        </div>
      </div>
    </div>
  );
}

export default function LiveSignalsRow() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSignals = useCallback(async () => {
    if (!supabase) {
      console.warn("[LiveSignalsRow] Supabase not configured — check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("signals")
      .select("*")
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false });

    console.log("[LiveSignalsRow] fetch result:", { data, error });
    if (error) console.error("[LiveSignalsRow] Supabase error:", error);

    setSignals(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSignals();

    if (!supabase) return;

    const channel = supabase
      .channel("signals-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "signals" },
        () => fetchSignals()
      )
      .subscribe((status) => {
        console.log("[LiveSignalsRow] realtime subscription status:", status);
      });

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [fetchSignals]);

  return (
    <div>
      <div className="section-label" style={{ marginBottom: 12 }}>
        <div className="section-label-bar" />
        <span className="section-label-text">Live Signals</span>
        {!loading && (
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              color: signals.length > 0 ? "#00C896" : "#4A5568",
              backgroundColor: signals.length > 0 ? "rgba(0,200,150,0.1)" : "#1C2236",
              border: `1px solid ${signals.length > 0 ? "rgba(0,200,150,0.3)" : "#1C2236"}`,
              padding: "1px 7px",
              borderRadius: 10,
              marginLeft: 4,
            }}
          >
            {signals.length} active
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", gap: 12 }}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="skeleton"
              style={{ width: 260, height: 180, flexShrink: 0, borderRadius: 4 }}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            paddingBottom: 8,
            scrollbarWidth: "thin",
          }}
        >
          {signals.length > 0 ? (
            signals.map((s) => <SignalCard key={s.id} signal={s} />)
          ) : (
            <EmptyState />
          )}
        </div>
      )}
    </div>
  );
}
