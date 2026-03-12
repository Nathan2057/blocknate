"use client";

import { useInView } from "@/hooks/useInView";

const STEPS = [
  {
    num: "01",
    icon: "📡",
    color: "#0066FF",
    title: "Automated Analysis",
    desc: "Our engine fetches live candle data from Binance and runs RSI, MACD, EMA, Bollinger Bands and SMC analysis every hour.",
  },
  {
    num: "02",
    icon: "⚡",
    color: "#00C896",
    title: "Signal Generated",
    desc: "When multiple indicators align with 50%+ confidence, a signal is generated with precise entry, TP and SL levels.",
  },
  {
    num: "03",
    icon: "📈",
    color: "#F59E0B",
    title: "You Execute",
    desc: "Receive the signal instantly, review the analysis, and execute on your preferred exchange with full context.",
  },
];

export default function HowItWorks() {
  const { ref: headerRef, inView: headerIn } = useInView();
  const { ref: ref1, inView: inView1 } = useInView();
  const { ref: ref2, inView: inView2 } = useInView();
  const { ref: ref3, inView: inView3 } = useInView();

  const stepRefs = [
    { ref: ref1, inView: inView1 },
    { ref: ref2, inView: inView2 },
    { ref: ref3, inView: inView3 },
  ];

  return (
    <section style={{ padding: "100px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div ref={headerRef} style={{
          textAlign: "center", marginBottom: 64,
          opacity: headerIn ? 1 : 0,
          transform: headerIn ? "translateY(0)" : "translateY(30px)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0066FF" }} />
            <span style={{ color: "#0066FF", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>The Process</span>
          </div>
          <h2 style={{ color: "#FFFFFF", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 900, letterSpacing: "-0.02em" }}>
            How Blocknate Works
          </h2>
        </div>

        {/* Steps */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, position: "relative" }}>
          {/* Connecting line */}
          <div style={{ position: "absolute", top: 44, left: "16.67%", right: "16.67%", height: 1, borderTop: "2px dashed #1C2236", zIndex: 0 }} />

          {STEPS.map((step, i) => {
            const { ref: sRef, inView: sIn } = stepRefs[i];
            return (
              <div key={step.num} ref={sRef} style={{
                padding: "0 32px", textAlign: "center", position: "relative", zIndex: 1,
                opacity: sIn ? 1 : 0,
                transform: sIn ? "translateY(0)" : "translateY(30px)",
                transition: `opacity 0.6s ease ${i * 0.15}s, transform 0.6s ease ${i * 0.15}s`,
              }}>
                <div style={{
                  width: 88, height: 88, borderRadius: "50%",
                  background: `${step.color}12`,
                  border: `2px solid ${step.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 24px",
                  fontSize: "1.8rem",
                  position: "relative",
                }}>
                  {step.icon}
                  <div style={{
                    position: "absolute", top: -8, right: -8,
                    background: step.color, color: "#fff",
                    borderRadius: "50%", width: 26, height: 26,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.6rem", fontWeight: 900, letterSpacing: "0.05em",
                  }}>
                    {step.num}
                  </div>
                </div>
                <div style={{ color: "#E8ECF4", fontWeight: 700, fontSize: "1.05rem", marginBottom: 12 }}>{step.title}</div>
                <p style={{ color: "#8892A4", fontSize: "0.85rem", lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
