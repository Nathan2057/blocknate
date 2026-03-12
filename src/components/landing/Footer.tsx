"use client";

import Link from "next/link";

const COL2 = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Live Signals", href: "/signals" },
  { label: "Performance", href: "/performance" },
  { label: "Market Tools", href: "/tools/fear-greed" },
];
const COL3 = [
  { label: "Fear & Greed", href: "/tools/fear-greed" },
  { label: "BTC Dominance", href: "/tools/btc-dominance" },
  { label: "Heatmap", href: "/tools/heatmap" },
  { label: "Liquidations", href: "/tools/liquidations" },
];
const COL4 = [
  { label: "Education Hub", href: "/education" },
  { label: "Chart Patterns", href: "/education" },
  { label: "Glossary", href: "/education" },
  { label: "News", href: "/news" },
];

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <div style={{ color: "#E8ECF4", fontWeight: 700, fontSize: "0.82rem", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {links.map(({ label, href }) => (
          <Link key={label} href={href} style={{ color: "#4A5568", fontSize: "0.82rem", textDecoration: "none", transition: "color 150ms" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#8892A4")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#4A5568")}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer style={{ background: "#080C14", borderTop: "1px solid #1C2236", padding: "48px 24px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <div style={{ fontWeight: 900, fontSize: "1.1rem", letterSpacing: "-0.02em", marginBottom: 12 }}>
              <span style={{ color: "#FFFFFF" }}>BLOCK</span>
              <span style={{ color: "#0066FF" }}>NATE</span>
            </div>
            <p style={{ color: "#4A5568", fontSize: "0.8rem", lineHeight: 1.6, maxWidth: 260, marginBottom: 12 }}>
              Professional crypto trading signals and market intelligence for serious traders.
            </p>
            <p style={{ color: "#2A3448", fontSize: "0.7rem" }}>Data: Binance · CoinGecko · Alternative.me</p>
          </div>
          <FooterCol title="Platform" links={COL2} />
          <FooterCol title="Tools" links={COL3} />
          <FooterCol title="Learn" links={COL4} />
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: "1px solid #1C2236", paddingTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ color: "#2A3448", fontSize: "0.72rem" }}>
            © 2025 Blocknate. For educational purposes only. Not financial advice.
          </div>
          <div style={{ color: "#2A3448", fontSize: "0.7rem" }}>v1.0.0</div>
        </div>
      </div>
    </footer>
  );
}
