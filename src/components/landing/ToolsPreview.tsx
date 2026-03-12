"use client";

import { useInView } from "@/hooks/useInView";

const TOOLS = [
  { icon: "😱", color: "#FF3B5C", name: "Fear & Greed Index", desc: "Market sentiment on a 0–100 scale, updated daily.", href: "/tools/fear-greed" },
  { icon: "₿", color: "#F59E0B", name: "BTC Dominance", desc: "Bitcoin's share of total crypto market cap.", href: "/tools/btc-dominance" },
  { icon: "🗺️", color: "#00C896", name: "Market Heatmap", desc: "Visual heatmap of top 100 coins by performance.", href: "/tools/heatmap" },
  { icon: "🌙", color: "#8B5CF6", name: "Altcoin Season", desc: "Is it altcoin season or Bitcoin season right now?", href: "/tools/altcoin-season" },
  { icon: "💥", color: "#0066FF", name: "Liquidation Map", desc: "Estimated liquidation levels for major pairs.", href: "/tools/liquidations" },
];

export default function ToolsPreview() {
  const { ref: headerRef, inView: headerIn } = useInView();
  const { ref: ref1, inView: inView1 } = useInView();
  const { ref: ref2, inView: inView2 } = useInView();
  const { ref: ref3, inView: inView3 } = useInView();
  const { ref: ref4, inView: inView4 } = useInView();
  const { ref: ref5, inView: inView5 } = useInView();

  const toolRefs = [
    { ref: ref1, inView: inView1 },
    { ref: ref2, inView: inView2 },
    { ref: ref3, inView: inView3 },
    { ref: ref4, inView: inView4 },
    { ref: ref5, inView: inView5 },
  ];

  return (
    <section id="tools" style={{ padding: "100px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div ref={headerRef} style={{
          textAlign: "center", marginBottom: 48,
          opacity: headerIn ? 1 : 0,
          transform: headerIn ? "translateY(0)" : "translateY(30px)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0066FF" }} />
            <span style={{ color: "#0066FF", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Market Tools</span>
          </div>
          <h2 style={{ color: "#FFFFFF", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 900, letterSpacing: "-0.02em" }}>
            Powerful Market Tools
          </h2>
          <p style={{ color: "#8892A4", fontSize: "1rem", marginTop: 16 }}>
            Professional analytics to support every trading decision.
          </p>
        </div>

        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
          {TOOLS.map((tool, i) => {
            const { ref: tRef, inView: tIn } = toolRefs[i];
            return (
              <div key={tool.name} ref={tRef} style={{
                flex: "0 0 260px",
                background: "#0C1018",
                border: "1px solid #1C2236",
                borderTop: "3px solid " + tool.color,
                borderRadius: 4,
                padding: 24,
                opacity: tIn ? 1 : 0,
                transform: tIn ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.5s ease " + (i * 0.08) + "s, transform 0.5s ease " + (i * 0.08) + "s",
              }}>
                <div style={{ fontSize: "2rem", marginBottom: 14 }}>{tool.icon}</div>
                <div style={{ color: "#E8ECF4", fontWeight: 700, fontSize: "0.95rem", marginBottom: 8 }}>{tool.name}</div>
                <p style={{ color: "#8892A4", fontSize: "0.8rem", lineHeight: 1.6, marginBottom: 16 }}>{tool.desc}</p>
                <a href={tool.href} style={{ color: tool.color, fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}>
                  Open Tool
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
