"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

const SIDEBAR_FULL = 240;
const SIDEBAR_COLLAPSED = 60;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const sidebarWidth = isMobile ? 0 : collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_FULL;

  function handleToggle() {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#06080F" }}>
      {/* Sidebar — fixed */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 100,
          transform: isMobile && !mobileOpen ? "translateX(-240px)" : "translateX(0)",
          transition: "transform 240ms ease",
        }}
      >
        <Sidebar
          collapsed={isMobile ? false : collapsed}
          onToggle={handleToggle}
        />
      </div>

      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            zIndex: 99,
          }}
        />
      )}

      {/* TopBar */}
      <TopBar
        sidebarWidth={sidebarWidth}
        onMenuToggle={isMobile ? handleToggle : undefined}
      />

      {/* Main content */}
      <main
        style={{
          marginLeft: sidebarWidth,
          marginTop: 48,
          flex: 1,
          minHeight: "calc(100vh - 48px)",
          padding: "24px",
          transition: "margin-left 240ms ease",
        }}
      >
        {children}
      </main>
    </div>
  );
}
