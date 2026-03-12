"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Menu } from "lucide-react";
import { supabase } from "@/lib/supabase";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/signals": "Live Signals",
  "/performance": "Performance",
  "/tools/fear-greed": "Fear & Greed",
  "/tools/btc-dominance": "BTC Dominance",
  "/tools/heatmap": "Heatmap",
  "/tools/altcoin-season": "Altcoin Season",
  "/tools/liquidations": "Liquidations",
  "/news": "News & Sentiment",
  "/education": "Education",
  "/portfolio": "Portfolio",
  "/settings": "Settings",
  "/admin": "Admin Panel",
};

const COIN_LABELS: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  binancecoin: "BNB",
  solana: "SOL",
  ripple: "XRP",
};

const COIN_ORDER = ["bitcoin", "ethereum", "binancecoin", "solana", "ripple"];

interface TickerData {
  usd: number;
  usd_24h_change: number;
}

interface TopBarProps {
  sidebarWidth: number;
  onMenuToggle?: () => void;
}

export default function TopBar({ sidebarWidth, onMenuToggle }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [ticker, setTicker] = useState<Record<string, TickerData>>({});
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [user, setUser] = useState<{ email?: string; user_metadata?: { full_name?: string } } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const pageTitle = PAGE_TITLES[pathname] ?? "Blocknate";

  async function fetchTicker() {
    try {
      const res = await fetch("/api/ticker");
      if (!res.ok) return;
      const data = await res.json();
      console.log("[TopBar] ticker data:", data);
      setTicker(data);
      const now = new Date();
      setLastUpdated(
        now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    fetchTicker();
    intervalRef.current = setInterval(fetchTicker, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    supabase!.auth.getUser().then(({ data }) => setUser(data.user as typeof user));
    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_, session) => {
      setUser((session?.user ?? null) as typeof user);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    await supabase!.auth.signOut();
    router.push("/");
  }

  const menuItemStyle: React.CSSProperties = {
    display: "block", width: "100%", background: "none", border: "none",
    padding: "8px 12px", color: "#8892A4", fontSize: "0.82rem",
    textAlign: "left", cursor: "pointer", borderRadius: 2,
  };

  const tickerItems = COIN_ORDER.filter((k) => ticker[k]).map((key) => {
    const coin = ticker[key];
    const change = coin.usd_24h_change ?? 0;
    const changeColor = change >= 0 ? "#00C896" : "#FF3B5C";
    const changeStr = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
    const usd = coin.usd ?? 0;
    const price =
      usd >= 1000
        ? `$${usd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
        : usd >= 1
        ? `$${usd.toFixed(2)}`
        : `$${usd.toFixed(4)}`;

    return { key, label: COIN_LABELS[key], price, changeStr, changeColor, usd };
  });

  // Duplicate for seamless loop
  const allItems = [...tickerItems, ...tickerItems];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: sidebarWidth,
        right: 0,
        height: 48,
        backgroundColor: "rgba(8,12,20,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #1C2236",
        display: "flex",
        alignItems: "center",
        zIndex: 90,
        transition: "left 240ms ease",
      }}
    >
      {/* Mobile hamburger */}
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#8892A4",
            flexShrink: 0,
          }}
        >
          <Menu size={18} />
        </button>
      )}

      {/* Page title */}
      <div
        style={{
          minWidth: 180,
          padding: "0 20px",
          borderRight: "1px solid #1C2236",
          height: "100%",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#FFFFFF" }}>
          {pageTitle}
        </span>
      </div>

      {/* Ticker */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
          height: "100%",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Left fade mask */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 40,
            background: "linear-gradient(to right, rgba(8,12,20,0.95), transparent)",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />
        {/* Right fade mask */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 40,
            background: "linear-gradient(to left, rgba(8,12,20,0.95), transparent)",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />

        {tickerItems.length > 0 ? (
          <div className="ticker-animate" style={{ gap: 0 }}>
            {allItems.map((item, i) => (
              <div
                key={`${item.key}-${i}`}
                style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0 20px",
                  }}
                >
                  <span style={{ fontSize: "0.75rem", color: "#8892A4", fontWeight: 500 }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "#FFFFFF", fontWeight: 600 }}>
                    {item.price}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: item.changeColor, fontWeight: 500 }}>
                    {item.changeStr}
                  </span>
                </div>
                <span style={{ color: "#1C2236", fontSize: "0.9rem", userSelect: "none" }}>|</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "0 20px", display: "flex", gap: 16 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="skeleton"
                style={{ width: 100, height: 14, borderRadius: 3 }}
              />
            ))}
          </div>
        )}
      </div>

      {/* LIVE indicator */}
      <div
        style={{
          borderLeft: "1px solid #1C2236",
          padding: "0 16px",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ position: "relative", width: 10, height: 10, flexShrink: 0 }}>
          <div
            className="pulse-ring"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              backgroundColor: "#00C896",
              opacity: 0.4,
            }}
          />
          <div
            className="pulse-dot"
            style={{
              position: "absolute",
              inset: "2px",
              borderRadius: "50%",
              backgroundColor: "#00C896",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              color: "#00C896",
              letterSpacing: "0.15em",
              lineHeight: 1,
            }}
          >
            LIVE
          </span>
          {lastUpdated && (
            <span style={{ fontSize: "0.6rem", color: "#4A5568", lineHeight: 1 }}>
              {lastUpdated}
            </span>
          )}
        </div>
      </div>

      {/* User menu */}
      {user ? (
        <div ref={menuRef} style={{ borderLeft: "1px solid #1C2236", paddingLeft: 16, paddingRight: 12, height: "100%", display: "flex", alignItems: "center", position: "relative", flexShrink: 0 }}>
          <div
            onClick={() => setShowMenu((v) => !v)}
            style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(0,102,255,0.2)", border: "1px solid #0066FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#0066FF", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
          >
            {user.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          {showMenu && (
            <div style={{ position: "absolute", top: 48, right: 0, background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, padding: 8, minWidth: 200, zIndex: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid #1C2236", marginBottom: 4 }}>
                <div style={{ color: "#FFFFFF", fontSize: "0.82rem", fontWeight: 600 }}>{user.user_metadata?.full_name || "Trader"}</div>
                <div style={{ color: "#8892A4", fontSize: "0.72rem" }}>{user.email}</div>
              </div>
              <button onClick={() => { router.push("/portfolio"); setShowMenu(false); }} style={menuItemStyle}>Portfolio</button>
              <button onClick={handleSignOut} style={{ ...menuItemStyle, color: "#FF3B5C" }}>Sign Out</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ borderLeft: "1px solid #1C2236", paddingLeft: 16, paddingRight: 12, display: "flex", alignItems: "center", gap: 8, height: "100%", flexShrink: 0 }}>
          <a href="/auth" style={{ color: "#8892A4", fontSize: "0.78rem", padding: "4px 12px", border: "1px solid #1C2236", borderRadius: 3, textDecoration: "none" }}>Sign In</a>
          <a href="/auth" style={{ color: "#fff", fontSize: "0.78rem", padding: "4px 12px", background: "#0066FF", borderRadius: 3, textDecoration: "none", fontWeight: 600 }}>Sign Up</a>
        </div>
      )}
    </div>
  );
}
