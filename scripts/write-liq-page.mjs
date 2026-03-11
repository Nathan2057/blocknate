import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "../src/app/(app)/tools/liquidations/page.tsx");

const content = `"use client";

import { useEffect, useCallback, useState } from "react";
import { AlertTriangle, TrendingUp, Activity, Clock, Calculator, RefreshCw } from "lucide-react";
import { fmtPrice, fmtLarge } from "@/lib/utils";

interface LiqLevel { leverage: number; price: number; size: number; }
interface CoinData {
  symbol: string; coin: string; markPrice: number; fundingRate: number;
  openInterestUSD: number; longRatio: number; shortRatio: number;
  nextFundingTime: number; longLiqLevels: LiqLevel[]; shortLiqLevels: LiqLevel[];
}
interface ApiResponse { coins: CoinData[]; timestamp: string; error?: string; }

const COINS = ["BTC", "ETH", "SOL", "BNB", "XRP"];

function useCountdown(targetMs: number) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    function update() {
      const diff = targetMs - Date.now();
      if (diff <= 0) { setRemaining("00:00:00"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setRemaining(\`\${String(h).padStart(2,"0")}:\${String(m).padStart(2,"0")}:\${String(s).padStart(2,"0")}\`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  return remaining;
}

function StatCard({ label, value, sub, accent, Icon, extra }: {
  label: string; value: string; sub?: string; accent: string;
  Icon: React.ElementType; extra?: React.ReactNode;
}) {
  return (
    <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderLeft: \`3px solid \${accent}\`, borderRadius: 4, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: \`\${accent}20\`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={14} style={{ color: accent }} />
        </div>
        <span style={{ color: "#8892A4", fontSize: "0.65rem", textTransform: "uppercase" as const, letterSpacing: "0.08em", fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ color: accent, fontSize: "1.6rem", fontWeight: 900, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: "#8892A4", fontSize: "0.72rem", marginTop: 5 }}>{sub}</div>}
      {extra}
    </div>
  );
}

function FundingCard({ coin }: { coin: CoinData }) {
  const countdown = useCountdown(coin.nextFundingTime);
  const isPositive = coin.fundingRate >= 0;
  const color = isPositive ? "#FF3B5C" : "#00C896";
  return (
    <StatCard
      label="Funding Rate (8H)"
      value={\`\${isPositive ? "+" : ""}\${coin.fundingRate.toFixed(4)}%\`}
      sub={\`Next funding: \${countdown}\`}
      accent={color}
      Icon={Clock}
    />
  );
}

function LiqHeatmap({ coin }: { coin: CoinData }) {
  const [hovered, setHovered] = useState<{ label: string; price: number; size: number; type: "LONG" | "SHORT" } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const markPrice = coin.markPrice;
  const range = markPrice * 0.25;
  const maxP = markPrice + range;
  const minP = markPrice - range;
  const totalRange = maxP - minP;
  const HEIGHT = 400;
  const AXIS_W = 80;
  const BAR_MAX_W = 300;

  function priceToY(p: number) { return ((maxP - p) / totalRange) * HEIGHT; }

  const allSizes = [...coin.shortLiqLevels, ...coin.longLiqLevels].map((l) => l.size);
  const maxSize = Math.max(...allSizes, 1);

  const ticks: number[] = [];
  for (let pct = -25; pct <= 25; pct += 5) ticks.push(markPrice * (1 + pct / 100));

  const markY = priceToY(markPrice);
  const levOpacity: Record<number, number> = { 5: 0.4, 10: 0.55, 25: 0.7, 50: 0.85, 100: 1.0 };

  return (
    <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, padding: 20, marginBottom: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: "#E8ECF4", fontWeight: 700, fontSize: "0.95rem" }}>Estimated Liquidation Levels</div>
        <div style={{ color: "#8892A4", fontSize: "0.75rem", marginTop: 4 }}>Based on current open interest and common leverage usage · Hover bars for details</div>
      </div>
      <div
        style={{ position: "relative", height: HEIGHT, userSelect: "none" as const }}
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMousePos({ x: e.clientX - r.left, y: e.clientY - r.top }); }}
        onMouseLeave={() => setHovered(null)}
      >
        <div style={{ position: "absolute", left: 0, top: 0, width: AXIS_W, height: HEIGHT }}>
          {ticks.map((p) => {
            const y = priceToY(p);
            if (y < 0 || y > HEIGHT) return null;
            return <div key={p} style={{ position: "absolute", top: y, transform: "translateY(-50%)", right: 4, fontSize: "0.65rem", color: "#4A5568", whiteSpace: "nowrap" as const }}>{fmtPrice(p)}</div>;
          })}
        </div>
        <div style={{ position: "absolute", left: AXIS_W, top: 0, right: 0, height: HEIGHT, background: "#06080F", borderRadius: 3, overflow: "hidden" }}>
          {ticks.map((p) => {
            const y = priceToY(p);
            if (y < 0 || y > HEIGHT) return null;
            return <div key={p} style={{ position: "absolute", top: y, left: 0, right: 0, borderTop: "1px solid #1C223440", pointerEvents: "none" as const }} />;
          })}
          {coin.shortLiqLevels.map((level) => {
            const y = priceToY(level.price);
            if (y < -10 || y > HEIGHT + 10) return null;
            const bw = Math.max(4, (level.size / maxSize) * BAR_MAX_W);
            const op = levOpacity[level.leverage] ?? 0.7;
            return (
              <div key={\`s-\${level.leverage}\`} style={{ position: "absolute", top: y - 8, left: 0, width: bw, height: 16, background: \`rgba(255,59,92,\${op})\`, borderRadius: "0 2px 2px 0", cursor: "pointer", display: "flex", alignItems: "center", paddingLeft: 6 }}
                onMouseEnter={() => setHovered({ label: \`\${level.leverage}x SHORT LIQ\`, price: level.price, size: level.size, type: "SHORT" })}>
                <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.6rem", fontWeight: 600, whiteSpace: "nowrap" as const }}>{level.leverage}x — {fmtPrice(level.price)}</span>
              </div>
            );
          })}
          {coin.longLiqLevels.map((level) => {
            const y = priceToY(level.price);
            if (y < -10 || y > HEIGHT + 10) return null;
            const bw = Math.max(4, (level.size / maxSize) * BAR_MAX_W);
            const op = levOpacity[level.leverage] ?? 0.7;
            return (
              <div key={\`l-\${level.leverage}\`} style={{ position: "absolute", top: y - 8, left: 0, width: bw, height: 16, background: \`rgba(0,200,150,\${op})\`, borderRadius: "0 2px 2px 0", cursor: "pointer", display: "flex", alignItems: "center", paddingLeft: 6 }}
                onMouseEnter={() => setHovered({ label: \`\${level.leverage}x LONG LIQ\`, price: level.price, size: level.size, type: "LONG" })}>
                <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.6rem", fontWeight: 600, whiteSpace: "nowrap" as const }}>{level.leverage}x — {fmtPrice(level.price)}</span>
              </div>
            );
          })}
          <div style={{ position: "absolute", top: markY, left: 0, right: 0, borderTop: "2px dashed rgba(255,255,255,0.6)", pointerEvents: "none", zIndex: 10 }}>
            <span style={{ position: "absolute", right: 6, top: -11, fontSize: "0.65rem", fontWeight: 700, color: "#E8ECF4", background: "#0066FF", borderRadius: 2, padding: "1px 5px" }}>{fmtPrice(markPrice)}</span>
          </div>
          <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 10 }}>
            {[{ color: "#00C896", label: "Long Liq" }, { color: "#FF3B5C", label: "Short Liq" }].map(({ color, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 10, height: 10, background: color, borderRadius: 1 }} />
                <span style={{ color: "#8892A4", fontSize: "0.65rem" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        {hovered && (
          <div style={{ position: "fixed", left: mousePos.x + AXIS_W + 16, top: mousePos.y, background: "#0C1018", border: \`1px solid \${hovered.type === "LONG" ? "#00C896" : "#FF3B5C"}\`, borderRadius: 4, padding: "8px 12px", fontSize: "0.78rem", zIndex: 100, pointerEvents: "none", whiteSpace: "nowrap" as const }}>
            <div style={{ color: hovered.type === "LONG" ? "#00C896" : "#FF3B5C", fontWeight: 700, marginBottom: 4 }}>{hovered.label}</div>
            <div style={{ color: "#E8ECF4" }}>Price: {fmtPrice(hovered.price)}</div>
            <div style={{ color: "#8892A4" }}>Est. Size: {fmtLarge(hovered.size)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function LiqTable({ coin }: { coin: CoinData }) {
  type Row = { type: "LONG" | "SHORT"; leverage: number; price: number; size: number; distPct: number };
  const rows: Row[] = [
    ...coin.longLiqLevels.map((l) => ({ type: "LONG" as const, ...l, distPct: ((coin.markPrice - l.price) / coin.markPrice) * 100 })),
    ...coin.shortLiqLevels.map((l) => ({ type: "SHORT" as const, ...l, distPct: ((l.price - coin.markPrice) / coin.markPrice) * 100 })),
  ].sort((a, b) => a.distPct - b.distPct);

  function risk(d: number) {
    if (d < 3) return { label: "HIGH", color: "#FF3B5C" };
    if (d < 8) return { label: "MEDIUM", color: "#F59E0B" };
    return { label: "LOW", color: "#00C896" };
  }
  return (
    <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, overflow: "hidden", marginBottom: 20 }}>
      <div style={{ background: "#080C14", borderBottom: "2px solid #0066FF", padding: "10px 16px" }}>
        <span style={{ color: "#E8ECF4", fontWeight: 700, fontSize: "0.88rem" }}>Liquidation Level Details</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
          <thead>
            <tr>{["Type","Leverage","Liq Price","Distance from Mark","Est. Size","Risk"].map((h) => (
              <th key={h} style={{ padding: "8px 14px", color: "#8892A4", fontWeight: 600, textAlign: "left" as const, fontSize: "0.65rem", textTransform: "uppercase" as const, letterSpacing: "0.05em", whiteSpace: "nowrap" as const }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isEven = i % 2 === 0;
              const r = risk(row.distPct);
              return (
                <tr key={\`\${row.type}-\${row.leverage}\`} style={{ background: isEven ? "#0C1018" : "#090D15", borderBottom: "1px solid #1C223440" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#131B2E"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = isEven ? "#0C1018" : "#090D15"; }}>
                  <td style={{ padding: "9px 14px" }}>
                    <span style={{ background: row.type === "LONG" ? "rgba(0,200,150,0.15)" : "rgba(255,59,92,0.15)", color: row.type === "LONG" ? "#00C896" : "#FF3B5C", borderRadius: 3, padding: "2px 7px", fontSize: "0.68rem", fontWeight: 700 }}>{row.type}</span>
                  </td>
                  <td style={{ padding: "9px 14px", color: "#E8ECF4", fontWeight: 600 }}>{row.leverage}x</td>
                  <td style={{ padding: "9px 14px", color: "#E8ECF4" }}>{fmtPrice(row.price)}</td>
                  <td style={{ padding: "9px 14px", color: row.distPct < 3 ? "#FF3B5C" : row.distPct < 8 ? "#F59E0B" : "#8892A4", fontWeight: 600 }}>{row.distPct.toFixed(2)}%</td>
                  <td style={{ padding: "9px 14px", color: "#8892A4" }}>{fmtLarge(row.size)}</td>
                  <td style={{ padding: "9px 14px" }}>
                    <span style={{ background: \`\${r.color}15\`, color: r.color, border: \`1px solid \${r.color}30\`, borderRadius: 3, padding: "2px 7px", fontSize: "0.65rem", fontWeight: 600 }}>{r.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LiqCalculator({ markPrice }: { markPrice: number }) {
  const [entryPrice, setEntryPrice] = useState(markPrice);
  const [leverage, setLeverage] = useState(10);
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");

  const liqPrice = side === "LONG"
    ? entryPrice * (1 - 1 / leverage + 0.004)
    : entryPrice * (1 + 1 / leverage - 0.004);
  const distPct = entryPrice > 0 ? Math.abs((liqPrice - entryPrice) / entryPrice) * 100 : 0;
  const riskPct = Math.max(0, Math.min(100, 100 - distPct * 5));
  const riskColor = riskPct > 70 ? "#FF3B5C" : riskPct > 40 ? "#F59E0B" : "#00C896";
  const barLiqPos = side === "LONG"
    ? Math.max(2, Math.min(95, 50 - distPct * 2))
    : Math.max(5, Math.min(98, 50 + distPct * 2));

  return (
    <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderLeft: "3px solid #A855F7", borderRadius: 4, padding: 20, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Calculator size={16} style={{ color: "#A855F7" }} />
        <span style={{ color: "#E8ECF4", fontWeight: 700, fontSize: "0.95rem" }}>Personal Liquidation Calculator</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 16, marginBottom: 20 }}>
        <div>
          <label style={{ display: "block", color: "#8892A4", fontSize: "0.72rem", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6 }}>Entry Price</label>
          <input type="number" value={entryPrice} onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
            style={{ width: "100%", background: "#06080F", border: "1px solid #1C2236", borderRadius: 3, padding: "8px 10px", color: "#E8ECF4", fontSize: "0.88rem", outline: "none", boxSizing: "border-box" as const }} />
        </div>
        <div>
          <label style={{ display: "block", color: "#8892A4", fontSize: "0.72rem", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6 }}>Position Side</label>
          <div style={{ display: "flex", gap: 6 }}>
            {(["LONG","SHORT"] as const).map((s) => (
              <button key={s} onClick={() => setSide(s)} style={{ flex: 1, padding: "8px", borderRadius: 3, border: \`1px solid \${side===s?(s==="LONG"?"#00C896":"#FF3B5C"):"#1C2236"}\`, background: side===s?(s==="LONG"?"rgba(0,200,150,0.15)":"rgba(255,59,92,0.15)"):"#06080F", color: side===s?(s==="LONG"?"#00C896":"#FF3B5C"):"#8892A4", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>{s}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ display: "block", color: "#8892A4", fontSize: "0.72rem", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6 }}>
            Leverage: <span style={{ color: "#E8ECF4", fontWeight: 700 }}>{leverage}x</span>
          </label>
          <input type="range" min={1} max={125} value={leverage} onChange={(e) => setLeverage(parseInt(e.target.value))} style={{ width: "100%", accentColor: "#0066FF" }} />
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            {[5,10,20,50,100].map((lev) => (
              <button key={lev} onClick={() => setLeverage(lev)} style={{ flex: 1, padding: "3px", borderRadius: 2, border: \`1px solid \${leverage===lev?"#0066FF":"#1C2236"}\`, background: leverage===lev?"rgba(0,102,255,0.15)":"#06080F", color: leverage===lev?"#0066FF":"#8892A4", fontSize: "0.65rem", fontWeight: 600, cursor: "pointer" }}>{lev}x</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ background: "#06080F", borderRadius: 4, padding: 16, display: "flex", flexDirection: "column" as const, gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#8892A4", fontSize: "0.78rem" }}>Liquidation Price</span>
          <span style={{ color: side==="LONG"?"#FF3B5C":"#00C896", fontSize: "1.4rem", fontWeight: 900 }}>{fmtPrice(liqPrice)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#8892A4", fontSize: "0.78rem" }}>Distance from entry</span>
          <span style={{ color: "#E8ECF4", fontWeight: 700 }}>{distPct.toFixed(2)}%</span>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ color: "#8892A4", fontSize: "0.72rem" }}>Risk level</span>
            <span style={{ color: riskColor, fontSize: "0.72rem", fontWeight: 700 }}>{riskPct>70?"HIGH RISK":riskPct>40?"MEDIUM RISK":"LOW RISK"}</span>
          </div>
          <div style={{ height: 6, background: "#1C2236", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: \`\${riskPct}%\`, background: \`linear-gradient(90deg,#00C896,\${riskColor})\`, borderRadius: 3, transition: "width 0.2s ease" }} />
          </div>
        </div>
        <div>
          <div style={{ color: "#8892A4", fontSize: "0.72rem", marginBottom: 8 }}>Price visualization</div>
          <div style={{ position: "relative", height: 24, background: "#1C2236", borderRadius: 3 }}>
            <div style={{ position: "absolute", top: 0, bottom: 0, left: side==="LONG"?\`\${barLiqPos}%\`:"50%", right: side==="LONG"?"50%":\`\${100-barLiqPos}%\`, background: "rgba(0,200,150,0.3)", borderRadius: 3 }} />
            <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 2, background: "#0066FF", transform: "translateX(-50%)" }}>
              <span style={{ position: "absolute", bottom: -16, left: "50%", transform: "translateX(-50%)", fontSize: "0.55rem", color: "#0066FF", whiteSpace: "nowrap" as const }}>Entry</span>
            </div>
            <div style={{ position: "absolute", top: 0, bottom: 0, left: \`\${barLiqPos}%\`, width: 2, background: "#FF3B5C", transform: "translateX(-50%)" }}>
              <span style={{ position: "absolute", bottom: -16, left: "50%", transform: "translateX(-50%)", fontSize: "0.55rem", color: "#FF3B5C", whiteSpace: "nowrap" as const }}>Liq</span>
            </div>
          </div>
          <div style={{ height: 18 }} />
        </div>
      </div>
    </div>
  );
}

function MarketBiasCard({ coin }: { coin: CoinData }) {
  const isLongHeavy = coin.longRatio > 60 && coin.fundingRate > 0;
  const isShortHeavy = coin.shortRatio > 60 && coin.fundingRate < 0;
  let icon: string, title: string, desc: string, color: string, bg: string;
  if (isLongHeavy) {
    icon="⚠️"; title="LONG HEAVY MARKET"; color="#FF3B5C"; bg="rgba(255,59,92,0.05)";
    desc=\`Market is heavily long (\${coin.longRatio.toFixed(1)}%) with positive funding (+\${coin.fundingRate.toFixed(4)}%). High risk of long squeeze if price drops.\`;
  } else if (isShortHeavy) {
    icon="⚠️"; title="SHORT HEAVY MARKET"; color="#00C896"; bg="rgba(0,200,150,0.05)";
    desc=\`Market is heavily short (\${coin.shortRatio.toFixed(1)}%) with negative funding (\${coin.fundingRate.toFixed(4)}%). Potential short squeeze if price breaks up.\`;
  } else {
    icon="✓"; title="BALANCED MARKET"; color="#0066FF"; bg="rgba(0,102,255,0.05)";
    desc=\`Long/short ratio is balanced (\${coin.longRatio.toFixed(1)}% longs / \${coin.shortRatio.toFixed(1)}% shorts). No immediate squeeze risk.\`;
  }
  return (
    <div style={{ background: bg, border: \`1px solid \${color}30\`, borderLeft: \`3px solid \${color}\`, borderRadius: 4, padding: 16, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: "1.1rem" }}>{icon}</span>
        <span style={{ color, fontWeight: 700, fontSize: "0.88rem" }}>{title}</span>
      </div>
      <p style={{ color: "#8892A4", fontSize: "0.82rem", lineHeight: 1.6, margin: 0 }}>{desc}</p>
    </div>
  );
}

function AllCoinsOverview({ coins }: { coins: CoinData[] }) {
  return (
    <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, overflow: "hidden", marginTop: 24 }}>
      <div style={{ background: "#080C14", borderBottom: "2px solid #0066FF", padding: "10px 16px" }}>
        <span style={{ color: "#E8ECF4", fontWeight: 700, fontSize: "0.88rem" }}>All Coins Overview</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
          <thead>
            <tr>{["Coin","Price","Open Interest","Funding (8H)","Long %","Short %","Bias"].map((h) => (
              <th key={h} style={{ padding: "8px 14px", color: "#8892A4", fontWeight: 600, textAlign: "left" as const, fontSize: "0.65rem", textTransform: "uppercase" as const, letterSpacing: "0.05em", whiteSpace: "nowrap" as const }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {coins.map((coin, i) => {
              const isEven = i%2===0;
              const isLH = coin.longRatio>60&&coin.fundingRate>0;
              const isSH = coin.shortRatio>60&&coin.fundingRate<0;
              const bLabel = isLH?"LONG HEAVY":isSH?"SHORT HEAVY":"BALANCED";
              const bColor = isLH?"#FF3B5C":isSH?"#00C896":"#0066FF";
              const fColor = coin.fundingRate>0?"#FF3B5C":"#00C896";
              return (
                <tr key={coin.symbol} style={{ background: isEven?"#0C1018":"#090D15", borderBottom: "1px solid #1C223440" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background="#131B2E"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background=isEven?"#0C1018":"#090D15"; }}>
                  <td style={{ padding: "10px 14px", color: "#E8ECF4", fontWeight: 700 }}>{coin.coin}</td>
                  <td style={{ padding: "10px 14px", color: "#E8ECF4" }}>{fmtPrice(coin.markPrice)}</td>
                  <td style={{ padding: "10px 14px", color: "#8892A4" }}>{fmtLarge(coin.openInterestUSD)}</td>
                  <td style={{ padding: "10px 14px", color: fColor, fontWeight: 600 }}>{coin.fundingRate>=0?"+":""}{coin.fundingRate.toFixed(4)}%</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 48, height: 5, background: "#1C2236", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
                        <div style={{ height: "100%", width: \`\${coin.longRatio}%\`, background: "#00C896" }} />
                      </div>
                      <span style={{ color: "#00C896", fontWeight: 600 }}>{coin.longRatio.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", color: "#FF3B5C", fontWeight: 600 }}>{coin.shortRatio.toFixed(1)}%</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ background: \`\${bColor}15\`, color: bColor, border: \`1px solid \${bColor}30\`, borderRadius: 3, padding: "2px 7px", fontSize: "0.65rem", fontWeight: 600 }}>{bLabel}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LiquidationsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCoin, setActiveCoin] = useState("BTC");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showSpin = false) => {
    if (showSpin) setRefreshing(true);
    try {
      const res = await fetch("/api/liquidations");
      const json = await res.json() as ApiResponse;
      if (json.error) { setError(json.error); }
      else { setData(json); setError(null); setLastUpdated(new Date().toLocaleTimeString()); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selectedCoin = data?.coins.find((c) => c.coin === activeCoin);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap" as const, gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={18} style={{ color: "#FF3B5C" }} />
            <h1 style={{ color: "#E8ECF4", fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>Liquidation Analytics</h1>
          </div>
          <p style={{ color: "#8892A4", fontSize: "0.82rem", margin: "6px 0 0", lineHeight: 1.5 }}>
            Real-time open interest, funding rates and estimated liquidation levels powered by Binance Futures
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {lastUpdated && <span style={{ color: "#4A5568", fontSize: "0.72rem" }}>Updated {lastUpdated}</span>}
          <button onClick={() => fetchData(true)} disabled={refreshing}
            style={{ background: "#0C1018", border: "1px solid #1C2236", color: "#8892A4", borderRadius: 3, padding: "7px 12px", fontSize: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(255,59,92,0.1)", border: "1px solid rgba(255,59,92,0.3)", borderRadius: 4, padding: "12px 16px", color: "#FF3B5C", fontSize: "0.82rem", marginBottom: 20 }}>
          ⚠️ {error} — Binance Futures API may be unavailable in your region.
        </div>
      )}

      <div style={{ display: "flex", borderBottom: "1px solid #1C2236", marginBottom: 24 }}>
        {COINS.map((coin) => (
          <button key={coin} onClick={() => setActiveCoin(coin)}
            style={{ padding: "10px 20px", background: "transparent", border: "none", borderBottom: activeCoin===coin?"2px solid #0066FF":"2px solid transparent", color: activeCoin===coin?"#FFFFFF":"#8892A4", fontWeight: activeCoin===coin?700:400, fontSize: "0.85rem", cursor: "pointer", letterSpacing: "0.05em" }}>
            {coin}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
          {[1,2,3,4].map((i) => <div key={i} style={{ height: 100, background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4 }} />)}
        </div>
      )}

      {!loading && selectedCoin && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 16, marginBottom: 20 }}>
            <StatCard label="Open Interest" value={fmtLarge(selectedCoin.openInterestUSD)} accent="#0066FF" Icon={Activity} />
            <FundingCard coin={selectedCoin} />
            <StatCard label="Long Ratio" value={\`\${selectedCoin.longRatio.toFixed(1)}%\`} accent="#00C896" Icon={TrendingUp}
              extra={<div style={{ marginTop: 8, height: 5, background: "#1C2236", borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", width: \`\${selectedCoin.longRatio}%\`, background: "linear-gradient(90deg,#00C896,#FF3B5C)" }} /></div>}
            />
            <StatCard label="Mark Price" value={fmtPrice(selectedCoin.markPrice)} accent="#F59E0B" Icon={Activity} />
          </div>
          <MarketBiasCard coin={selectedCoin} />
          <LiqHeatmap coin={selectedCoin} />
          <LiqTable coin={selectedCoin} />
          <LiqCalculator markPrice={selectedCoin.markPrice} />
        </>
      )}

      {!loading && !selectedCoin && !error && (
        <div style={{ textAlign: "center", padding: "60px 24px", color: "#8892A4" }}>No data available for {activeCoin}</div>
      )}

      {!loading && data?.coins && data.coins.length > 0 && <AllCoinsOverview coins={data.coins} />}

      <style>{\`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}\`}</style>
    </div>
  );
}
`;

writeFileSync(outPath, content, "utf8");
console.log("Written:", outPath);
console.log("Lines:", content.split("\n").length);
