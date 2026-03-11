"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { fmtPrice, statusLabel, riskColor } from "@/lib/utils";

type SignalStatus = "ACTIVE" | "TP1_HIT" | "TP2_HIT" | "TP3_HIT" | "SL_HIT" | "CLOSED" | "CANCELLED";

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
  pnl: number | null;
  confidence: number;
  analysis_summary: string | null;
  auto_generated: boolean;
  created_at: string;
}

interface SignalPanelProps {
  symbol: string; // e.g. "BTCUSDT"
}

function pctDist(live: number, target: number) {
  if (!live) return "";
  const d = ((target - live) / live) * 100;
  return `${d >= 0 ? "+" : ""}${d.toFixed(2)}%`;
}

function isHit(status: SignalStatus, level: "tp1" | "tp2" | "tp3") {
  if (level === "tp1") return ["TP1_HIT", "TP2_HIT", "TP3_HIT"].includes(status);
  if (level === "tp2") return ["TP2_HIT", "TP3_HIT"].includes(status);
  if (level === "tp3") return status === "TP3_HIT";
  return false;
}

export default function SignalPanel({ symbol }: SignalPanelProps) {
  const [signal, setSignal] = useState<Signal | null>(null);
  const [lastClosed, setLastClosed] = useState<Signal | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const priceInterval = useRef<NodeJS.Timeout | null>(null);

  const coin = symbol; // e.g. "BTCUSDT"

  useEffect(() => {
    async function loadSignals() {
      setLoading(true);
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data: active } = await supabase
        .from("signals")
        .select("*")
        .eq("coin", coin)
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false })
        .limit(1);

      const { data: closed } = await supabase
        .from("signals")
        .select("*")
        .eq("coin", coin)
        .in("status", ["CLOSED", "TP1_HIT", "TP2_HIT", "TP3_HIT", "SL_HIT"])
        .order("created_at", { ascending: false })
        .limit(1);

      setSignal(active?.[0] ?? null);
      setLastClosed(closed?.[0] ?? null);
      setLoading(false);
    }
    loadSignals();
  }, [coin]);

  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        const data = await res.json();
        setLivePrice(parseFloat(data.price));
      } catch {}
    }
    fetchPrice();
    priceInterval.current = setInterval(fetchPrice, 10_000);
    return () => { if (priceInterval.current) clearInterval(priceInterval.current); };
  }, [symbol]);

  const borderColor = signal?.signal_type === "SHORT" ? "#FF3B5C" : "#00C896";

  if (loading) {
    return (
      <div
        style={{
          height: 550,
          backgroundColor: "#0C1018",
          border: "1px solid #1C2236",
          borderRadius: 4,
        }}
        className="skeleton"
      />
    );
  }

  if (!signal) {
    return (
      <div
        style={{
          height: 550,
          backgroundColor: "#0C1018",
          border: "1px solid #1C2236",
          borderLeft: "3px solid #4A5568",
          borderRadius: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 24,
        }}
      >
        <div style={{ fontSize: "2rem" }}>📭</div>
        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#FFFFFF" }}>
          No active signal
        </div>
        <div style={{ fontSize: "0.78rem", color: "#8892A4", textAlign: "center" }}>
          Analyzing market conditions...
        </div>
        {lastClosed && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              backgroundColor: "#080C14",
              border: "1px solid #1C2236",
              borderRadius: 4,
              width: "100%",
            }}
          >
            <div style={{ fontSize: "0.65rem", color: "#4A5568", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Last Signal
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#FFFFFF" }}>{lastClosed.coin}</span>
              <span style={{ fontSize: "0.72rem", color: lastClosed.signal_type === "LONG" ? "#00C896" : "#FF3B5C", fontWeight: 600 }}>
                {lastClosed.signal_type}
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#8892A4", marginTop: 4 }}>
              {statusLabel(lastClosed.status)} · Entry {fmtPrice(lastClosed.entry_price)}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Progress bar position: 0 = stop_loss, 1 = tp3
  const priceRange = signal.tp3 - signal.stop_loss;
  const livePct = livePrice !== null && priceRange > 0
    ? Math.max(0, Math.min(1, (livePrice - signal.stop_loss) / priceRange))
    : null;

  const confidenceColor =
    signal.confidence < 55 ? "#FF3B5C" : signal.confidence < 75 ? "#FF8C42" : "#00C896";

  return (
    <div
      style={{
        height: 550,
        backgroundColor: "#0C1018",
        border: "1px solid #1C2236",
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 4,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#080C14",
          padding: "10px 14px",
          borderBottom: "1px solid #1C2236",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#FFFFFF" }}>{signal.coin}</span>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "#FFFFFF",
              backgroundColor: signal.signal_type === "LONG" ? "#00C896" : "#FF3B5C",
              padding: "2px 7px",
              borderRadius: 3,
            }}
          >
            {signal.signal_type}
          </span>
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              color: "#0066FF",
              backgroundColor: "rgba(0,102,255,0.12)",
              padding: "2px 7px",
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span className="pulse-dot" style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#0066FF", display: "inline-block" }} />
            ACTIVE
          </span>
          {signal.auto_generated && (
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                color: "#F5C518",
                backgroundColor: "rgba(245,197,24,0.12)",
                padding: "2px 7px",
                borderRadius: 3,
              }}
            >
              🤖 AUTO
            </span>
          )}
        </div>

        {/* Confidence bar */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: "0.65rem", color: "#8892A4" }}>Confidence</span>
            <span style={{ fontSize: "0.65rem", fontWeight: 600, color: confidenceColor }}>{signal.confidence}%</span>
          </div>
          <div style={{ height: 4, backgroundColor: "#1C2236", borderRadius: 2, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${signal.confidence}%`,
                backgroundColor: confidenceColor,
                borderRadius: 2,
                transition: "width 300ms ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* Price levels + progress bar */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex" }}>
        {/* Levels column */}
        <div style={{ flex: 1, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Live price */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #1C2236" }}>
            <span style={{ fontSize: "0.72rem", color: "#8892A4" }}>Live Price</span>
            <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#FFFFFF" }}>
              {livePrice !== null ? fmtPrice(livePrice) : "—"}
            </span>
          </div>

          {/* TP3 */}
          {(["tp3", "tp2", "tp1"] as const).map((tp) => {
            const hit = isHit(signal.status, tp);
            const price = signal[tp];
            const label = tp.toUpperCase().replace("TP", "TP ");
            return (
              <div
                key={tp}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "5px 0",
                  opacity: hit ? 0.4 : 1,
                  textDecoration: hit ? "line-through" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#00C896", flexShrink: 0 }} />
                  <span style={{ fontSize: "0.72rem", color: "#8892A4" }}>{label}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#00C896" }}>{fmtPrice(price)}</div>
                  {livePrice && (
                    <div style={{ fontSize: "0.62rem", color: "#4A5568" }}>{pctDist(livePrice, price)}</div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Entry */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 8px",
              backgroundColor: "rgba(0,102,255,0.07)",
              border: "1px solid rgba(0,102,255,0.2)",
              borderRadius: 3,
              margin: "2px 0",
            }}
          >
            <span style={{ fontSize: "0.72rem", color: "#0066FF", fontWeight: 600 }}>ENTRY</span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#FFFFFF" }}>
                {fmtPrice(signal.entry_low)} – {fmtPrice(signal.entry_high)}
              </div>
              <div style={{ fontSize: "0.62rem", color: "#4A5568" }}>avg {fmtPrice(signal.entry_price)}</div>
            </div>
          </div>

          {/* Stop Loss */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#FF3B5C", flexShrink: 0 }} />
              <span style={{ fontSize: "0.72rem", color: "#8892A4" }}>SL</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#FF3B5C" }}>{fmtPrice(signal.stop_loss)}</div>
              {livePrice && (
                <div style={{ fontSize: "0.62rem", color: "#4A5568" }}>{pctDist(livePrice, signal.stop_loss)}</div>
              )}
            </div>
          </div>

          {/* Meta grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8, borderTop: "1px solid #1C2236", paddingTop: 8 }}>
            {[
              { label: "Leverage", value: `${signal.leverage}x` },
              { label: "Timeframe", value: signal.timeframe },
              { label: "Exchange", value: signal.exchange },
              { label: "Risk", value: signal.risk_level, color: riskColor(signal.risk_level) },
            ].map((item) => (
              <div key={item.label} style={{ backgroundColor: "#080C14", border: "1px solid #1C2236", borderRadius: 3, padding: "6px 8px" }}>
                <div style={{ fontSize: "0.6rem", color: "#4A5568", textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.label}</div>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: item.color ?? "#FFFFFF", marginTop: 2 }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Notes */}
          {signal.notes && (
            <div
              style={{
                marginTop: 8,
                borderLeft: "2px solid #1C2236",
                paddingLeft: 10,
                fontSize: "0.72rem",
                color: "#8892A4",
                fontStyle: "italic",
                lineHeight: 1.5,
              }}
            >
              {signal.notes}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: 14,
            backgroundColor: "#080C14",
            borderLeft: "1px solid #1C2236",
            position: "relative",
            flexShrink: 0,
          }}
        >
          {/* SL zone (bottom 20%) */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "20%", backgroundColor: "rgba(255,59,92,0.25)" }} />
          {/* Entry zone (next 18%) */}
          <div style={{ position: "absolute", bottom: "20%", left: 0, right: 0, height: "18%", backgroundColor: "rgba(0,102,255,0.25)" }} />
          {/* TP zone (top 62%) */}
          <div style={{ position: "absolute", bottom: "38%", left: 0, right: 0, height: "62%", backgroundColor: "rgba(0,200,150,0.15)" }} />
          {/* Price marker */}
          {livePct !== null && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: `${livePct * 100}%`,
                height: 2,
                backgroundColor: "#FFFFFF",
                boxShadow: "0 0 4px #FFFFFF",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
