"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  User,
  Palette,
  Bell,
  LayoutDashboard,
  TrendingUp,
  Shield,
  AlertTriangle,
  Save,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  theme: string | null;
  default_pair: string | null;
  default_leverage: number | null;
  notif_signals: boolean | null;
  notif_news: boolean | null;
  notif_price_alerts: boolean | null;
  dashboard_show_ticker: boolean | null;
  dashboard_show_fear_greed: boolean | null;
  dashboard_show_live_signals: boolean | null;
  dashboard_show_market_movers: boolean | null;
}

// ─── Small components ─────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: type === "success" ? "rgba(0,200,150,0.12)" : "rgba(255,59,92,0.12)",
        border: `1px solid ${type === "success" ? "#00C896" : "#FF3B5C"}`,
        borderRadius: 4,
        padding: "12px 20px",
        color: type === "success" ? "#00C896" : "#FF3B5C",
        fontSize: "0.85rem",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 8,
        minWidth: 260,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        animation: "slideUp 200ms ease",
      }}
    >
      {type === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}
      {message}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        background: checked ? "#0066FF" : "#1C2236",
        border: `1px solid ${checked ? "#0066FF" : "#2A3350"}`,
        position: "relative",
        cursor: "pointer",
        transition: "background 200ms, border-color 200ms",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 19 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 200ms",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      />
    </div>
  );
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: "2px solid rgba(255,255,255,0.2)",
        borderTop: "2px solid #fff",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

// ─── Input styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(6,8,15,0.8)",
  border: "1px solid #1C2236",
  borderRadius: 3,
  padding: "9px 12px",
  color: "#E8ECF4",
  fontSize: "0.85rem",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#8892A4",
  fontSize: "0.72rem",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const sectionTitle: React.CSSProperties = {
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: "0.95rem",
  marginBottom: 4,
};

const sectionDesc: React.CSSProperties = {
  color: "#4A5568",
  fontSize: "0.78rem",
  marginBottom: 20,
};

const card: React.CSSProperties = {
  background: "rgba(12,16,24,0.7)",
  border: "1px solid #1C2236",
  borderRadius: 4,
  padding: 24,
  marginBottom: 16,
};

const rowBetween: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: "profile",       label: "Profile",       icon: User },
  { id: "appearance",    label: "Appearance",    icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "dashboard",     label: "Dashboard",     icon: LayoutDashboard },
  { id: "trading",       label: "Trading",       icon: TrendingUp },
  { id: "security",      label: "Security",      icon: Shield },
  { id: "danger",        label: "Danger Zone",   icon: AlertTriangle },
];

const PAIRS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT", "DOGE/USDT", "ADA/USDT", "AVAX/USDT"];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      const { data } = await supabase!.from("profiles").select("*").eq("id", user.id).single();
      if (data) setProfile(data as Profile);
      setLoading(false);
    };
    load();
  }, [router]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!profile) return;
    const { error } = await supabase!.from("profiles").update(updates).eq("id", profile.id);
    if (error) { showToast(error.message, "error"); return; }
    setProfile((p) => p ? { ...p, ...updates } : p);
    showToast("Changes saved");
  }, [profile, showToast]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <Spinner size={28} />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: "1.5rem", margin: 0 }}>Settings</h1>
        <p style={{ color: "#4A5568", fontSize: "0.82rem", marginTop: 4 }}>
          Manage your account preferences and platform settings
        </p>
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        {/* Sidebar nav */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <nav style={{ background: "rgba(12,16,24,0.7)", border: "1px solid #1C2236", borderRadius: 4, overflow: "hidden" }}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    background: active ? "rgba(0,102,255,0.1)" : "transparent",
                    border: "none",
                    borderLeft: active ? "2px solid #0066FF" : "2px solid transparent",
                    cursor: "pointer",
                    color: active ? "#FFFFFF" : "#8892A4",
                    fontSize: "0.82rem",
                    fontWeight: active ? 600 : 400,
                    textAlign: "left",
                    transition: "all 150ms",
                  }}
                >
                  <Icon size={14} style={{ color: active ? "#0066FF" : "#4A5568", flexShrink: 0 }} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {activeTab === "profile"       && <ProfileTab profile={profile} updateProfile={updateProfile} />}
          {activeTab === "appearance"    && <AppearanceTab profile={profile} updateProfile={updateProfile} />}
          {activeTab === "notifications" && <NotificationsTab profile={profile} updateProfile={updateProfile} />}
          {activeTab === "dashboard"     && <DashboardTab profile={profile} updateProfile={updateProfile} />}
          {activeTab === "trading"       && <TradingTab profile={profile} updateProfile={updateProfile} />}
          {activeTab === "security"      && <SecurityTab showToast={showToast} />}
          {activeTab === "danger"        && <DangerTab profile={profile} showToast={showToast} />}
        </div>
      </div>
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({
  profile,
  updateProfile,
}: {
  profile: Profile;
  updateProfile: (u: Partial<Profile>) => Promise<void>;
}) {
  const [name, setName] = useState(profile.full_name ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await updateProfile({ full_name: name.trim() || null });
    setSaving(false);
  };

  return (
    <div>
      <div style={card}>
        <p style={sectionTitle}>Profile Information</p>
        <p style={sectionDesc}>Update your display name and account details.</p>

        {/* Avatar placeholder */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #0066FF, #00C896)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
              fontWeight: 800,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {(profile.full_name ?? profile.email).slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p style={{ color: "#FFFFFF", fontWeight: 600, margin: 0, fontSize: "0.95rem" }}>
              {profile.full_name ?? "—"}
            </p>
            <p style={{ color: "#4A5568", margin: "2px 0 0", fontSize: "0.78rem" }}>{profile.email}</p>
            <span
              style={{
                display: "inline-block",
                marginTop: 4,
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "2px 8px",
                borderRadius: 2,
                background: profile.role === "super_admin"
                  ? "rgba(255,59,92,0.15)"
                  : profile.role === "admin"
                  ? "rgba(0,102,255,0.15)"
                  : "rgba(74,85,104,0.2)",
                color: profile.role === "super_admin"
                  ? "#FF3B5C"
                  : profile.role === "admin"
                  ? "#0066FF"
                  : "#4A5568",
              }}
            >
              {profile.role}
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Display Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              value={profile.email}
              disabled
              style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }}
            />
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <button
            onClick={save}
            disabled={saving}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#0066FF",
              color: "#fff",
              border: "none",
              borderRadius: 3,
              padding: "9px 20px",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? <Spinner /> : <Save size={13} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Appearance Tab ───────────────────────────────────────────────────────────

const THEMES = [
  { id: "dark",      label: "Dark",       bg: "#06080F", accent: "#0066FF", desc: "Default dark theme" },
  { id: "midnight",  label: "Midnight",   bg: "#080010", accent: "#7C3AED", desc: "Deep purple tones" },
  { id: "carbon",    label: "Carbon",     bg: "#0A0A0A", accent: "#00C896", desc: "Pure black + green" },
  { id: "navy",      label: "Navy Blue",  bg: "#050B18", accent: "#38BDF8", desc: "Ocean-inspired" },
];

function AppearanceTab({
  profile,
  updateProfile,
}: {
  profile: Profile;
  updateProfile: (u: Partial<Profile>) => Promise<void>;
}) {
  const currentTheme = profile.theme ?? "dark";

  return (
    <div>
      <div style={card}>
        <p style={sectionTitle}>Theme</p>
        <p style={sectionDesc}>Choose your preferred color theme. More themes coming soon.</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {THEMES.map((t) => {
            const active = currentTheme === t.id;
            return (
              <div
                key={t.id}
                onClick={() => updateProfile({ theme: t.id })}
                style={{
                  border: `2px solid ${active ? t.accent : "#1C2236"}`,
                  borderRadius: 6,
                  padding: 16,
                  cursor: "pointer",
                  background: active ? `rgba(${hexToRgb(t.accent)},0.06)` : "rgba(28,34,54,0.3)",
                  transition: "all 150ms",
                  position: "relative",
                }}
              >
                {active && (
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: t.accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={10} color="#fff" />
                  </div>
                )}
                {/* Color preview */}
                <div
                  style={{
                    height: 40,
                    borderRadius: 4,
                    background: t.bg,
                    border: "1px solid #2A3350",
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.accent }} />
                  <div style={{ width: 30, height: 3, borderRadius: 2, background: t.accent, opacity: 0.4 }} />
                  <div style={{ width: 20, height: 3, borderRadius: 2, background: "#1C2236" }} />
                </div>
                <p style={{ color: "#FFFFFF", fontWeight: 600, fontSize: "0.85rem", margin: "0 0 2px" }}>{t.label}</p>
                <p style={{ color: "#4A5568", fontSize: "0.72rem", margin: 0 }}>{t.desc}</p>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 16,
            padding: "10px 14px",
            background: "rgba(0,102,255,0.06)",
            border: "1px solid rgba(0,102,255,0.15)",
            borderRadius: 3,
            color: "#4A5568",
            fontSize: "0.75rem",
          }}
        >
          Theme switching is stored in your profile. Full theme application across the platform is coming in a future update.
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab({
  profile,
  updateProfile,
}: {
  profile: Profile;
  updateProfile: (u: Partial<Profile>) => Promise<void>;
}) {
  const items = [
    { key: "notif_signals",      label: "Live Signals",     desc: "Get notified when new trading signals are published" },
    { key: "notif_news",         label: "News & Sentiment", desc: "Breaking crypto news and sentiment updates" },
    { key: "notif_price_alerts", label: "Price Alerts",     desc: "Significant price movements for tracked assets" },
  ] as const;

  return (
    <div>
      <div style={card}>
        <p style={sectionTitle}>Notification Preferences</p>
        <p style={sectionDesc}>Choose what you want to be notified about.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {items.map((item, i) => {
            const val = (profile[item.key] ?? true) as boolean;
            return (
              <div
                key={item.key}
                style={{
                  ...rowBetween,
                  padding: "14px 0",
                  borderBottom: i < items.length - 1 ? "1px solid #1C2236" : "none",
                }}
              >
                <div>
                  <p style={{ color: "#E8ECF4", fontWeight: 600, fontSize: "0.85rem", margin: "0 0 2px" }}>
                    {item.label}
                  </p>
                  <p style={{ color: "#4A5568", fontSize: "0.75rem", margin: 0 }}>{item.desc}</p>
                </div>
                <Toggle checked={val} onChange={(v) => updateProfile({ [item.key]: v })} />
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ ...card, background: "rgba(0,102,255,0.05)", borderColor: "rgba(0,102,255,0.15)" }}>
        <p style={{ color: "#8892A4", fontSize: "0.78rem", margin: 0 }}>
          In-app notifications are coming soon. Email and push notifications will be configurable in a future update.
        </p>
      </div>
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({
  profile,
  updateProfile,
}: {
  profile: Profile;
  updateProfile: (u: Partial<Profile>) => Promise<void>;
}) {
  const widgets = [
    { key: "dashboard_show_ticker",       label: "Market Ticker",      desc: "Live price ticker at the top of the dashboard" },
    { key: "dashboard_show_fear_greed",   label: "Fear & Greed Index", desc: "Market sentiment gauge widget" },
    { key: "dashboard_show_live_signals", label: "Live Signals Feed",  desc: "Recent trading signals on the dashboard" },
    { key: "dashboard_show_market_movers", label: "Market Movers",    desc: "Top gainers and losers section" },
  ] as const;

  return (
    <div>
      <div style={card}>
        <p style={sectionTitle}>Dashboard Widgets</p>
        <p style={sectionDesc}>Choose which widgets appear on your dashboard.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {widgets.map((w, i) => {
            const val = (profile[w.key] ?? true) as boolean;
            return (
              <div
                key={w.key}
                style={{
                  ...rowBetween,
                  padding: "14px 0",
                  borderBottom: i < widgets.length - 1 ? "1px solid #1C2236" : "none",
                }}
              >
                <div>
                  <p style={{ color: "#E8ECF4", fontWeight: 600, fontSize: "0.85rem", margin: "0 0 2px" }}>{w.label}</p>
                  <p style={{ color: "#4A5568", fontSize: "0.75rem", margin: 0 }}>{w.desc}</p>
                </div>
                <Toggle checked={val} onChange={(v) => updateProfile({ [w.key]: v })} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Trading Tab ──────────────────────────────────────────────────────────────

function TradingTab({
  profile,
  updateProfile,
}: {
  profile: Profile;
  updateProfile: (u: Partial<Profile>) => Promise<void>;
}) {
  const [pair, setPair] = useState(profile.default_pair ?? "BTC/USDT");
  const [leverage, setLeverage] = useState(String(profile.default_leverage ?? 10));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await updateProfile({ default_pair: pair, default_leverage: Number(leverage) || 1 });
    setSaving(false);
  };

  return (
    <div>
      <div style={card}>
        <p style={sectionTitle}>Trading Defaults</p>
        <p style={sectionDesc}>Set your default values when adding new trades to your portfolio.</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Default Pair</label>
            <select
              value={pair}
              onChange={(e) => setPair(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {PAIRS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Default Leverage</label>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                min={1}
                max={125}
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                style={inputStyle}
              />
              <span
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#4A5568",
                  fontSize: "0.78rem",
                  pointerEvents: "none",
                }}
              >
                ×
              </span>
            </div>
          </div>
        </div>

        {/* Leverage quick-select */}
        <div style={{ marginTop: 12 }}>
          <label style={labelStyle}>Quick Select</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[1, 2, 5, 10, 20, 25, 50, 100, 125].map((lev) => (
              <button
                key={lev}
                onClick={() => setLeverage(String(lev))}
                style={{
                  padding: "5px 12px",
                  borderRadius: 3,
                  border: `1px solid ${String(lev) === leverage ? "#0066FF" : "#1C2236"}`,
                  background: String(lev) === leverage ? "rgba(0,102,255,0.15)" : "transparent",
                  color: String(lev) === leverage ? "#0066FF" : "#8892A4",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {lev}×
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <button
            onClick={save}
            disabled={saving}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#0066FF",
              color: "#fff",
              border: "none",
              borderRadius: 3,
              padding: "9px 20px",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? <Spinner /> : <Save size={13} />}
            Save Defaults
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <Eye size={15} />
  ) : (
    <EyeOff size={15} />
  );
}

function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: "", color: "" };
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[!@#$%^&*(),.?":{}|<>]/].filter((r) => r.test(pw)).length;
  if (pw.length < 6) return { level: 1, label: "Weak", color: "#FF3B5C" };
  if (pw.length < 10 || variety < 3) return { level: 2, label: "Medium", color: "#F59E0B" };
  return { level: 3, label: "Strong", color: "#00C896" };
}

function SecurityTab({ showToast }: { showToast: (m: string, t?: "success" | "error") => void }) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const strength = getPasswordStrength(newPw);
  const mismatch = newPw && confirmPw && newPw !== confirmPw;
  const match = newPw && confirmPw && newPw === confirmPw;

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) { showToast("Passwords do not match", "error"); return; }
    if (newPw.length < 6) { showToast("Password must be at least 6 characters", "error"); return; }
    setSaving(true);

    // Re-authenticate then update
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user?.email) { showToast("Unable to verify user", "error"); setSaving(false); return; }

    const { error: signInError } = await supabase!.auth.signInWithPassword({
      email: user.email,
      password: currentPw,
    });
    if (signInError) {
      showToast("Current password is incorrect", "error");
      setSaving(false);
      return;
    }

    const { error } = await supabase!.auth.updateUser({ password: newPw });
    if (error) { showToast(error.message, "error"); setSaving(false); return; }

    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    showToast("Password changed successfully");
    setSaving(false);
  };

  return (
    <div>
      <div style={card}>
        <p style={sectionTitle}>Change Password</p>
        <p style={sectionDesc}>Use a strong, unique password to keep your account secure.</p>

        <form onSubmit={handleChange} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Current password */}
          <div>
            <label style={labelStyle}>Current Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showCurrent ? "text" : "password"}
                required
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Enter current password"
                style={{ ...inputStyle, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#4A5568", display: "flex" }}
              >
                <EyeIcon open={showCurrent} />
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label style={labelStyle}>New Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showNew ? "text" : "password"}
                required
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Min. 6 characters"
                style={{ ...inputStyle, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#4A5568", display: "flex" }}
              >
                <EyeIcon open={showNew} />
              </button>
            </div>
            {newPw && (
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 3, background: "#1C2236", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(strength.level / 3) * 100}%`, background: strength.color, borderRadius: 2, transition: "width 300ms, background 300ms" }} />
                </div>
                <span style={{ color: strength.color, fontSize: "0.68rem", fontWeight: 600, minWidth: 40 }}>{strength.label}</span>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label style={labelStyle}>Confirm New Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirm ? "text" : "password"}
                required
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                style={{ ...inputStyle, paddingRight: 40, borderColor: mismatch ? "#FF3B5C" : "#1C2236" }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#4A5568", display: "flex" }}
              >
                <EyeIcon open={showConfirm} />
              </button>
            </div>
            {mismatch && <span style={{ color: "#FF3B5C", fontSize: "0.75rem" }}>Passwords do not match</span>}
            {match    && <span style={{ color: "#00C896", fontSize: "0.75rem" }}>✓ Passwords match</span>}
          </div>

          <div>
            <button
              type="submit"
              disabled={saving || !!mismatch || newPw.length < 6}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#0066FF",
                color: "#fff",
                border: "none",
                borderRadius: 3,
                padding: "9px 20px",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: saving || !!mismatch || newPw.length < 6 ? "default" : "pointer",
                opacity: saving || !!mismatch || newPw.length < 6 ? 0.6 : 1,
              }}
            >
              {saving ? <Spinner /> : <Shield size={13} />}
              Update Password
            </button>
          </div>
        </form>
      </div>

      {/* Session info */}
      <div style={card}>
        <p style={sectionTitle}>Active Session</p>
        <p style={sectionDesc}>You are currently signed in. Sign out to end your session.</p>
        <button
          onClick={async () => {
            await supabase!.auth.signOut();
            window.location.href = "/auth";
          }}
          style={{
            background: "transparent",
            border: "1px solid #1C2236",
            color: "#8892A4",
            borderRadius: 3,
            padding: "8px 18px",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ─── Danger Zone Tab ──────────────────────────────────────────────────────────

function DangerTab({
  profile,
  showToast,
}: {
  profile: Profile;
  showToast: (m: string, t?: "success" | "error") => void;
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    // Delete profile data, then sign out (full account deletion requires service key / edge function)
    await supabase!.from("profiles").delete().eq("id", profile.id);
    await supabase!.auth.signOut();
    showToast("Account deleted. Goodbye.");
    setTimeout(() => router.push("/"), 1500);
  };

  return (
    <div>
      {/* Delete modal */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              background: "#0C1018",
              border: "1px solid rgba(255,59,92,0.3)",
              borderRadius: 6,
              padding: 32,
              width: "100%",
              maxWidth: 440,
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: 12, textAlign: "center" }}>⚠️</div>
            <h3 style={{ color: "#FF3B5C", fontWeight: 800, textAlign: "center", margin: "0 0 8px" }}>
              Delete Account
            </h3>
            <p style={{ color: "#8892A4", fontSize: "0.82rem", textAlign: "center", marginBottom: 20 }}>
              This will permanently delete your profile and all trade data. This action cannot be undone.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ ...labelStyle, color: "#FF3B5C" }}>Type DELETE to confirm</label>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                style={{ ...inputStyle, borderColor: confirmText === "DELETE" ? "#FF3B5C" : "#1C2236" }}
                autoFocus
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => { setShowDeleteModal(false); setConfirmText(""); }}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "1px solid #1C2236",
                  color: "#8892A4",
                  borderRadius: 3,
                  padding: "9px 0",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== "DELETE" || deleting}
                style={{
                  flex: 1,
                  background: confirmText === "DELETE" ? "#FF3B5C" : "rgba(255,59,92,0.15)",
                  border: "1px solid rgba(255,59,92,0.3)",
                  color: confirmText === "DELETE" ? "#fff" : "#FF3B5C",
                  borderRadius: 3,
                  padding: "9px 0",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: confirmText !== "DELETE" || deleting ? "default" : "pointer",
                  opacity: deleting ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {deleting ? <Spinner /> : null}
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          ...card,
          borderColor: "rgba(255,59,92,0.25)",
          background: "rgba(255,59,92,0.03)",
        }}
      >
        <p style={{ ...sectionTitle, color: "#FF3B5C" }}>Danger Zone</p>
        <p style={sectionDesc}>Irreversible actions. Proceed with caution.</p>

        <div
          style={{
            ...rowBetween,
            padding: "16px 0",
            borderTop: "1px solid rgba(255,59,92,0.1)",
          }}
        >
          <div>
            <p style={{ color: "#E8ECF4", fontWeight: 600, fontSize: "0.88rem", margin: "0 0 3px" }}>
              Delete Account
            </p>
            <p style={{ color: "#4A5568", fontSize: "0.75rem", margin: 0 }}>
              Permanently delete your account, profile, and all trade history.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{
              flexShrink: 0,
              background: "rgba(255,59,92,0.1)",
              border: "1px solid rgba(255,59,92,0.3)",
              color: "#FF3B5C",
              borderRadius: 3,
              padding: "8px 16px",
              fontWeight: 700,
              fontSize: "0.82rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
