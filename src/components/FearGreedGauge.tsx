"use client";

import { useEffect, useState } from "react";
import { fgColor } from "@/lib/utils";

interface FGEntry {
  value: string;
  value_classification: string;
  timestamp: string;
}

interface FGResponse {
  data: FGEntry[];
}

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startPct: number, endPct: number) {
  const startAngle = startPct * 180;
  const endAngle = endPct * 180;
  const start = polarToXY(cx, cy, r, startAngle);
  const end = polarToXY(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

const ZONES = [
  { label: "Extreme Fear", range: "0–25", color: "#FF3B5C", start: 0, end: 0.25 },
  { label: "Fear", range: "25–45", color: "#FF8C42", start: 0.25, end: 0.45 },
  { label: "Neutral", range: "45–55", color: "#F5C518", start: 0.45, end: 0.55 },
  { label: "Greed", range: "55–75", color: "#AACC00", start: 0.55, end: 0.75 },
  { label: "Extreme Greed", range: "75–100", color: "#00C896", start: 0.75, end: 1 },
];

export default function FearGreedGauge() {
  const [entries, setEntries] = useState<FGEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/fear-greed")
      .then((r) => r.json())
      .then((j: FGResponse) => setEntries(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const current = entries[0];
  const yesterday = entries[1];
  const lastWeek = entries[7] ?? entries[entries.length - 1];

  const value = current ? parseInt(current.value) : 50;
  const color = fgColor(value);
  const pct = value / 100;
  const needleAngle = pct * 180;

  const cx = 100;
  const cy = 100;
  const r = 80;
  const needle = polarToXY(cx, cy, r - 6, needleAngle);

  return (
    <div
      style={{
        backgroundColor: "#0C1018",
        borderTop: "1px solid #1C2236",
        borderRight: "1px solid #1C2236",
        borderBottom: "1px solid #1C2236",
        borderLeft: "3px solid #0066FF",
        borderRadius: 4,
        padding: 16,
        height: "100%",
      }}
    >
      <div className="section-label">
        <div className="section-label-bar" />
        <span className="section-label-text">Fear &amp; Greed Index</span>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 200, borderRadius: 4 }} />
      ) : (
        <>
          {/* SVG gauge */}
          <svg viewBox="0 0 200 110" style={{ width: "100%", maxWidth: 240, display: "block", margin: "0 auto" }}>
            {/* Background track */}
            <path
              d={describeArc(cx, cy, r, 0, 1)}
              fill="none"
              stroke="#1C2236"
              strokeWidth={14}
              strokeLinecap="butt"
            />
            {/* Zone arcs */}
            {ZONES.map((z) => (
              <path
                key={z.label}
                d={describeArc(cx, cy, r, z.start, z.end)}
                fill="none"
                stroke={z.color}
                strokeWidth={14}
                strokeLinecap="butt"
                opacity={0.25}
              />
            ))}
            {/* Active arc up to value */}
            <path
              d={describeArc(cx, cy, r, 0, pct)}
              fill="none"
              stroke={color}
              strokeWidth={14}
              strokeLinecap="butt"
              opacity={0.9}
            />
            {/* Needle */}
            <line
              x1={cx}
              y1={cy}
              x2={needle.x}
              y2={needle.y}
              stroke="white"
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.9}
            />
            {/* Center dot */}
            <circle cx={cx} cy={cy} r={5} fill={color} />
          </svg>

          {/* Value */}
          <div style={{ textAlign: "center", marginTop: 4 }}>
            <div style={{ fontSize: "4.5rem", fontWeight: 900, color, lineHeight: 1 }}>
              {value}
            </div>
            <div
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginTop: 4,
              }}
            >
              {current?.value_classification ?? "—"}
            </div>
          </div>

          {/* Yesterday / Last Week */}
          <div
            style={{
              borderTop: "1px solid #1C2236",
              marginTop: 12,
              paddingTop: 10,
              display: "flex",
              justifyContent: "space-around",
            }}
          >
            {[
              { label: "Yesterday", entry: yesterday },
              { label: "Last Week", entry: lastWeek },
            ].map(({ label, entry }) => {
              const v = entry ? parseInt(entry.value) : null;
              const c = v !== null ? fgColor(v) : "#8892A4";
              return (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.65rem", color: "#8892A4", marginBottom: 2 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: c }}>
                    {v ?? "—"}
                  </div>
                  <div style={{ fontSize: "0.6rem", color: c }}>
                    {entry?.value_classification ?? ""}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div
            style={{
              borderTop: "1px solid #1C2236",
              marginTop: 10,
              paddingTop: 10,
              display: "flex",
              flexDirection: "column",
              gap: 5,
            }}
          >
            {ZONES.map((z) => (
              <div key={z.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: z.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "0.68rem", color: "#8892A4", flex: 1 }}>{z.label}</span>
                <span style={{ fontSize: "0.65rem", color: "#4A5568" }}>{z.range}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
