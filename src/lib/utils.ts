export function fmtPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  return `$${price.toFixed(6)}`;
}

export function fmtLarge(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

export function fmtPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function fgColor(value: number): string {
  if (value <= 25) return "#FF3B5C";
  if (value <= 45) return "#FF8C42";
  if (value <= 55) return "#F5C518";
  if (value <= 75) return "#AACC00";
  return "#00C896";
}

export function statusColor(status: string): string {
  if (status === "ACTIVE") return "#0066FF";
  if (status.includes("TP")) return "#00C896";
  if (status === "SL_HIT") return "#FF3B5C";
  return "#8892A4";
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: "ACTIVE",
    TP1_HIT: "TP1 ✓",
    TP2_HIT: "TP2 ✓",
    TP3_HIT: "TP3 ✓",
    SL_HIT: "SL HIT",
    CLOSED: "CLOSED",
    CANCELLED: "CANCELLED",
  };
  return map[status] ?? status;
}

export function riskColor(risk: string): string {
  if (risk === "LOW") return "#00C896";
  if (risk === "HIGH") return "#FF3B5C";
  return "#F59E0B";
}

export function getCoinFromSymbol(symbol: string): string {
  return symbol.replace(/USDT$|BUSD$|USD$/, "");
}
