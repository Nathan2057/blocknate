"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { supabase } from "@/lib/supabase";

const SIDEBAR_FULL = 240;
const SIDEBAR_COLLAPSED = 60;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    supabase!.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/auth");
      } else {
        setAuthChecked(true);
      }
    });
  }, [router]);

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

  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", background: "#06080F", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #1C2236", borderTop: "3px solid #0066FF", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#8892A4", fontSize: "0.82rem" }}>Loading...</p>
        </div>
      </div>
    );
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
