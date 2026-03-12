"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Zap,
  BarChart2,
  Activity,
  TrendingUp,
  Grid3X3,
  Layers,
  AlertTriangle,
  Newspaper,
  BookOpen,
  PieChart,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  soon?: boolean;
}

interface NavSection {
  title: string;
  titleColor?: string;
  items: NavItem[];
  defaultOpen?: boolean;
  noToggle?: boolean;
}

const sections: NavSection[] = [
  {
    title: "MAIN",
    noToggle: true,
    defaultOpen: true,
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "SIGNALS & CALLS",
    defaultOpen: true,
    items: [
      { label: "Live Signals", href: "/signals", icon: Zap },
      { label: "Performance", href: "/performance", icon: BarChart2 },
    ],
  },
  {
    title: "MARKET TOOLS",
    defaultOpen: true,
    items: [
      { label: "Fear & Greed", href: "/tools/fear-greed", icon: Activity },
      { label: "BTC Dominance", href: "/tools/btc-dominance", icon: TrendingUp },
      { label: "Heatmap", href: "/tools/heatmap", icon: Grid3X3 },
      { label: "Altcoin Season", href: "/tools/altcoin-season", icon: Layers },
      { label: "Liquidations", href: "/tools/liquidations", icon: AlertTriangle },
    ],
  },
  {
    title: "CONTENT",
    defaultOpen: true,
    items: [
      { label: "News & Sentiment", href: "/news", icon: Newspaper },
      { label: "Education", href: "/education", icon: BookOpen },
    ],
  },
  {
    title: "ACCOUNT",
    defaultOpen: true,
    items: [
      { label: "Portfolio", href: "/portfolio", icon: PieChart },
      { label: "Settings", href: "/settings", icon: Settings, soon: true },
    ],
  },
  {
    title: "ADMIN",
    titleColor: "#FF3B5C",
    defaultOpen: false,
    items: [{ label: "Admin Panel", href: "/admin", icon: Shield }],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    sections.forEach((s) => { init[s.title] = s.defaultOpen ?? true; });
    return init;
  });

  function toggleSection(title: string) {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  }

  return (
    <div
      style={{
        width: collapsed ? 60 : 240,
        height: "100vh",
        backgroundColor: "#080C14",
        borderRight: "1px solid #1C2236",
        boxShadow: "2px 0 24px rgba(0,102,255,0.06)",
        display: "flex",
        flexDirection: "column",
        transition: "width 240ms ease",
        overflow: "hidden",
      }}
    >
      {/* Logo area */}
      <div
        style={{
          height: 56,
          borderBottom: "1px solid #1C2236",
          display: "flex",
          alignItems: "center",
          padding: collapsed ? "0 12px" : "0 16px",
          justifyContent: collapsed ? "center" : "space-between",
          flexShrink: 0,
        }}
      >
        {collapsed ? (
          <>
            <Link href="/dashboard" style={{ display: "flex", alignItems: "center" }}>
            <div
              className="pulse-dot"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                backgroundColor: "#00C896",
              }}
            />
            </Link>
            <button
              onClick={onToggle}
              style={{
                position: "absolute",
                right: -1,
                width: 18,
                height: 18,
                backgroundColor: "#0C1018",
                border: "1px solid #1C2236",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#8892A4",
              }}
              title="Expand sidebar"
            >
              <ChevronRight size={11} />
            </button>
          </>
        ) : (
          <>
            <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <span style={{ fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.02em" }}>
                <span style={{ color: "#FFFFFF" }}>BLOCK</span>
                <span style={{ color: "#0066FF" }}>NATE</span>
              </span>
              <div
                className="pulse-dot"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: "#00C896",
                  flexShrink: 0,
                }}
              />
            </Link>
            <button
              onClick={onToggle}
              style={{
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#4A5568",
                display: "flex",
                alignItems: "center",
                padding: 4,
                borderRadius: 4,
              }}
              title="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          </>
        )}
      </div>

      {/* Nav sections */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 0" }}>
        {sections.map((section) => {
          const isOpen = openSections[section.title];
          return (
            <div key={section.title} style={{ marginBottom: 4 }}>
              {/* Section header */}
              {!collapsed && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 16px 4px",
                    cursor: section.noToggle ? "default" : "pointer",
                  }}
                  onClick={() => !section.noToggle && toggleSection(section.title)}
                >
                  <span
                    style={{
                      fontSize: "0.63rem",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      color: section.titleColor ?? "#4A5568",
                    }}
                  >
                    {section.title}
                  </span>
                  {!section.noToggle && (
                    <ChevronDown
                      size={12}
                      style={{
                        color: "#4A5568",
                        transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                        transition: "transform 200ms ease",
                      }}
                    />
                  )}
                </div>
              )}

              {/* Nav items */}
              {(isOpen || collapsed) &&
                section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        height: 36,
                        padding: collapsed ? "0" : "0 12px",
                        justifyContent: collapsed ? "center" : "flex-start",
                        gap: 10,
                        textDecoration: "none",
                        backgroundColor: isActive ? "rgba(0,102,255,0.08)" : "transparent",
                        borderLeft: isActive ? "2px solid #0066FF" : "2px solid transparent",
                        transition: "background 150ms, border-color 150ms",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "#1C2236";
                          (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <Icon
                        size={16}
                        style={{
                          color: isActive ? "#0066FF" : "#4A5568",
                          flexShrink: 0,
                        }}
                      />
                      {!collapsed && (
                        <>
                          <span
                            style={{
                              fontSize: "0.82rem",
                              color: isActive ? "#FFFFFF" : "#8892A4",
                              whiteSpace: "nowrap",
                              flex: 1,
                            }}
                          >
                            {item.label}
                          </span>
                          {item.soon && (
                            <span
                              style={{
                                fontSize: "10px",
                                backgroundColor: "#1C2236",
                                color: "#4A5568",
                                padding: "2px 6px",
                                borderRadius: 2,
                                marginLeft: "auto",
                                fontWeight: 600,
                                flexShrink: 0,
                              }}
                            >
                              SOON
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
            </div>
          );
        })}
      </div>

      {/* Bottom info */}
      {!collapsed && (
        <div
          style={{
            borderTop: "1px solid #1C2236",
            padding: "10px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <span style={{ fontSize: "0.72rem", color: "#4A5568" }}>v1.0.0</span>
          <span style={{ fontSize: "0.72rem", color: "#4A5568" }}>Data: Binance · CoinGecko</span>
        </div>
      )}
    </div>
  );
}
