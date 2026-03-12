// To enable Google OAuth:
// 1. Go to Supabase Dashboard → Authentication → Providers
// 2. Enable Google provider
// 3. Add your Google OAuth credentials
// 4. Add redirect URL: https://your-project.supabase.co/auth/v1/callback
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

/* ─── helpers ─── */
function mapError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "Wrong email or password";
  if (msg.includes("Email not confirmed")) return "Please verify your email first";
  if (msg.includes("User already registered")) return "An account with this email already exists";
  return msg;
}

function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: "", color: "" };
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[!@#$%^&*(),.?":{}|<>]/].filter((r) => r.test(pw)).length;
  if (pw.length < 6) return { level: 1, label: "Weak", color: "#FF3B5C" };
  if (pw.length < 10 || variety < 3) return { level: 2, label: "Medium", color: "#F59E0B" };
  return { level: 3, label: "Strong", color: "#00C896" };
}

/* ─── icons ─── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function Spinner() {
  return (
    <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
  );
}

/* ─── shared input style ─── */
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#06080F",
  border: "1px solid #1C2236",
  borderRadius: 3,
  padding: "10px 12px",
  color: "#E8ECF4",
  fontSize: "0.88rem",
  outline: "none",
  boxSizing: "border-box",
};

/* ─── Error box ─── */
function ErrorBox({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div style={{ background: "rgba(255,59,92,0.08)", border: "1px solid rgba(255,59,92,0.3)", borderRadius: 3, padding: "10px 14px", color: "#FF3B5C", fontSize: "0.82rem", marginBottom: 12 }}>
      {msg}
    </div>
  );
}

/* ─── Mock signal preview (left column) ─── */
function MockSignal() {
  return (
    <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderTop: "2px solid #00C896", borderRadius: 6, padding: "14px 16px", maxWidth: 300 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ color: "#E8ECF4", fontWeight: 700, fontSize: "0.88rem" }}>BTCUSDT</span>
        <span style={{ background: "#00C89618", color: "#00C896", border: "1px solid #00C89630", borderRadius: 3, padding: "1px 7px", fontSize: "0.65rem", fontWeight: 700 }}>LONG</span>
        <div className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#00C896", marginLeft: "auto" }} />
      </div>
      {[{ l: "Entry", v: "$71,000", c: "#0066FF" }, { l: "TP1", v: "$73,000", c: "#00C896" }, { l: "SL", v: "$68,000", c: "#FF3B5C" }].map(({ l, v, c }) => (
        <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: "#4A5568", fontSize: "0.72rem" }}>{l}</span>
          <span style={{ color: c, fontWeight: 700, fontSize: "0.82rem" }}>{v}</span>
        </div>
      ))}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ color: "#4A5568", fontSize: "0.65rem" }}>Confidence</span>
          <span style={{ color: "#0066FF", fontWeight: 700, fontSize: "0.72rem" }}>78%</span>
        </div>
        <div style={{ height: 4, background: "#1C2236", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: "78%", background: "linear-gradient(to right, #0066FF, #00C896)", borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [isMobile, setIsMobile] = useState(false);

  // Sign in
  const [siEmail, setSiEmail] = useState("");
  const [siPw, setSiPw] = useState("");
  const [siShowPw, setSiShowPw] = useState(false);
  const [siLoading, setSiLoading] = useState(false);
  const [siError, setSiError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");

  // Sign up
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPw, setSuPw] = useState("");
  const [suConfirm, setSuConfirm] = useState("");
  const [suShowPw, setSuShowPw] = useState(false);
  const [suShowConfirm, setSuShowConfirm] = useState(false);
  const [suTerms, setSuTerms] = useState(false);
  const [suLoading, setSuLoading] = useState(false);
  const [suError, setSuError] = useState("");
  const [suSuccess, setSuSuccess] = useState("");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ── auth handlers ── */
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSiError("");
    setSiLoading(true);
    const { error } = await supabase!.auth.signInWithPassword({ email: siEmail, password: siPw });
    if (error) { setSiError(mapError(error.message)); setSiLoading(false); return; }
    router.push("/dashboard");
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setSuError("");
    if (suPw !== suConfirm) { setSuError("Passwords do not match"); return; }
    if (!suTerms) { setSuError("Please accept the Terms of Service"); return; }
    setSuLoading(true);
    const { error } = await supabase!.auth.signUp({
      email: suEmail,
      password: suPw,
      options: { data: { full_name: suName } },
    });
    if (error) { setSuError(mapError(error.message)); setSuLoading(false); return; }
    setSuSuccess("Account created! Check your email to verify your account.");
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  async function handleGoogle() {
    await supabase!.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    const { error } = await supabase!.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setForgotLoading(false);
    if (error) { setForgotMsg(`Error: ${error.message}`); return; }
    setForgotMsg("Reset link sent! Check your email.");
  }

  const strength = getPasswordStrength(suPw);

  /* ── shared divider + google button ── */
  function OAuthSection() {
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#1C2236" }} />
          <span style={{ color: "#4A5568", fontSize: "0.72rem", whiteSpace: "nowrap" }}>or continue with</span>
          <div style={{ flex: 1, height: 1, background: "#1C2236" }} />
        </div>
        <button onClick={handleGoogle} type="button" style={{ width: "100%", background: "transparent", border: "1px solid #1C2236", borderRadius: 3, padding: "10px 16px", color: "#E8ECF4", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <GoogleIcon />
          Continue with Google
        </button>
      </>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#06080F", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      {/* Background layers */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 100% 60% at 50% 0%, rgba(0,102,255,0.12) 0%, transparent 60%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(28,34,54,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(28,34,54,0.3) 1px, transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none", maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)", WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)" }} />

      {/* Top nav */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 56, display: "flex", alignItems: "center", padding: "0 24px", background: "rgba(6,8,15,0.8)", backdropFilter: "blur(12px)", borderBottom: "1px solid #1C2236", zIndex: 50 }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 900, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
          <span style={{ color: "#FFFFFF" }}>BLOCK</span>
          <span style={{ color: "#0066FF" }}>NATE</span>
        </Link>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 64, maxWidth: 900, width: "100%", marginTop: 32, alignItems: "center" }}>

        {/* Left column */}
        {!isMobile && (
          <div>
            <div style={{ fontWeight: 900, fontSize: "2rem", letterSpacing: "-0.02em", marginBottom: 8 }}>
              <span style={{ color: "#FFFFFF" }}>BLOCK</span>
              <span style={{ color: "#0066FF" }}>NATE</span>
            </div>
            <p style={{ color: "#8892A4", fontSize: "0.92rem", marginBottom: 32 }}>Professional Crypto Signals</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 40 }}>
              {[
                "Automated signals powered by technical analysis",
                "Live charts with RSI, MACD and Volume",
                "Market tools, news and education hub",
              ].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(0,200,150,0.12)", border: "1px solid #00C89640", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <span style={{ color: "#00C896", fontSize: "0.65rem" }}>✓</span>
                  </div>
                  <span style={{ color: "#8892A4", fontSize: "0.88rem", lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>

            <MockSignal />

            <p style={{ color: "#4A5568", fontSize: "0.72rem", marginTop: 20 }}>Trusted by serious traders</p>
          </div>
        )}

        {/* Right column — auth card */}
        <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, padding: 40 }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #1C2236", marginBottom: 28, gap: 0 }}>
            {(["signin", "signup"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setSiError(""); setSuError(""); setShowForgot(false); setForgotMsg(""); }} style={{ flex: 1, background: "transparent", border: "none", borderBottom: tab === t ? "2px solid #0066FF" : "2px solid transparent", padding: "10px 0", marginBottom: -1, color: tab === t ? "#FFFFFF" : "#4A5568", fontSize: "0.88rem", fontWeight: tab === t ? 700 : 400, cursor: "pointer", transition: "color 150ms, border-color 150ms" }}>
                {t === "signin" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* ── SIGN IN ── */}
          {tab === "signin" && (
            <div>
              {!showForgot ? (
                <form onSubmit={handleSignIn}>
                  <ErrorBox msg={siError} />

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", color: "#8892A4", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Email</label>
                    <input type="email" required value={siEmail} onChange={(e) => setSiEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <label style={{ display: "block", color: "#8892A4", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Password</label>
                    <div style={{ position: "relative" }}>
                      <input type={siShowPw ? "text" : "password"} required value={siPw} onChange={(e) => setSiPw(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, paddingRight: 40 }} />
                      <button type="button" onClick={() => setSiShowPw(!siShowPw)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#4A5568", display: "flex" }}>
                        <EyeIcon open={siShowPw} />
                      </button>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", marginBottom: 20 }}>
                    <button type="button" onClick={() => { setShowForgot(true); setForgotEmail(siEmail); }} style={{ background: "none", border: "none", color: "#0066FF", fontSize: "0.78rem", cursor: "pointer", padding: 0 }}>
                      Forgot password?
                    </button>
                  </div>

                  <button type="submit" disabled={siLoading} style={{ width: "100%", background: "#0066FF", color: "#fff", border: "none", borderRadius: 3, padding: "11px 0", fontWeight: 700, fontSize: "0.9rem", cursor: siLoading ? "default" : "pointer", opacity: siLoading ? 0.8 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {siLoading ? <><Spinner /> Signing in...</> : "Sign In"}
                  </button>

                  <OAuthSection />

                  <p style={{ textAlign: "center", color: "#4A5568", fontSize: "0.8rem", marginTop: 20 }}>
                    Don&apos;t have an account?{" "}
                    <button type="button" onClick={() => setTab("signup")} style={{ background: "none", border: "none", color: "#0066FF", cursor: "pointer", fontSize: "0.8rem", padding: 0 }}>
                      Create one →
                    </button>
                  </p>
                </form>
              ) : (
                /* Forgot password */
                <form onSubmit={handleForgotPassword}>
                  <button type="button" onClick={() => { setShowForgot(false); setForgotMsg(""); }} style={{ background: "none", border: "none", color: "#4A5568", cursor: "pointer", fontSize: "0.78rem", marginBottom: 16, padding: 0 }}>
                    ← Back to Sign In
                  </button>
                  <p style={{ color: "#8892A4", fontSize: "0.85rem", marginBottom: 20 }}>Enter your email and we&apos;ll send you a reset link.</p>

                  {forgotMsg && (
                    <div style={{ background: forgotMsg.startsWith("Error") ? "rgba(255,59,92,0.08)" : "rgba(0,200,150,0.08)", border: `1px solid ${forgotMsg.startsWith("Error") ? "rgba(255,59,92,0.3)" : "rgba(0,200,150,0.3)"}`, borderRadius: 3, padding: "10px 14px", color: forgotMsg.startsWith("Error") ? "#FF3B5C" : "#00C896", fontSize: "0.82rem", marginBottom: 12 }}>
                      {forgotMsg}
                    </div>
                  )}

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", color: "#8892A4", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Email</label>
                    <input type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
                  </div>

                  <button type="submit" disabled={forgotLoading} style={{ width: "100%", background: "#0066FF", color: "#fff", border: "none", borderRadius: 3, padding: "11px 0", fontWeight: 700, fontSize: "0.9rem", cursor: forgotLoading ? "default" : "pointer", opacity: forgotLoading ? 0.8 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {forgotLoading ? <><Spinner /> Sending...</> : "Send Reset Link"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ── SIGN UP ── */}
          {tab === "signup" && (
            <form onSubmit={handleSignUp}>
              <ErrorBox msg={suError} />

              {suSuccess && (
                <div style={{ background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.3)", borderRadius: 3, padding: "10px 14px", color: "#00C896", fontSize: "0.82rem", marginBottom: 12 }}>
                  {suSuccess}
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: "#8892A4", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Full Name</label>
                <input type="text" required value={suName} onChange={(e) => setSuName(e.target.value)} placeholder="Your name" style={inputStyle} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: "#8892A4", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Email</label>
                <input type="email" required value={suEmail} onChange={(e) => setSuEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", color: "#8892A4", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Password</label>
                <div style={{ position: "relative" }}>
                  <input type={suShowPw ? "text" : "password"} required value={suPw} onChange={(e) => setSuPw(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, paddingRight: 40 }} />
                  <button type="button" onClick={() => setSuShowPw(!suShowPw)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#4A5568", display: "flex" }}>
                    <EyeIcon open={suShowPw} />
                  </button>
                </div>
                {suPw && (
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 3, background: "#1C2236", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(strength.level / 3) * 100}%`, background: strength.color, borderRadius: 2, transition: "width 300ms, background 300ms" }} />
                    </div>
                    <span style={{ color: strength.color, fontSize: "0.68rem", fontWeight: 600, minWidth: 40 }}>{strength.label}</span>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", color: "#8892A4", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <input type={suShowConfirm ? "text" : "password"} required value={suConfirm} onChange={(e) => setSuConfirm(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, paddingRight: 40, borderColor: suConfirm && suConfirm !== suPw ? "#FF3B5C" : "#1C2236" }} />
                  <button type="button" onClick={() => setSuShowConfirm(!suShowConfirm)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#4A5568", display: "flex" }}>
                    <EyeIcon open={suShowConfirm} />
                  </button>
                </div>
              </div>

              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20, cursor: "pointer" }}>
                <input type="checkbox" checked={suTerms} onChange={(e) => setSuTerms(e.target.checked)} style={{ marginTop: 2, accentColor: "#0066FF", flexShrink: 0 }} />
                <span style={{ color: "#8892A4", fontSize: "0.8rem", lineHeight: 1.5 }}>
                  I agree to the{" "}
                  <span style={{ color: "#0066FF" }}>Terms of Service</span>{" "}
                  and{" "}
                  <span style={{ color: "#0066FF" }}>Privacy Policy</span>
                </span>
              </label>

              <button type="submit" disabled={suLoading || !!suSuccess} style={{ width: "100%", background: "#0066FF", color: "#fff", border: "none", borderRadius: 3, padding: "11px 0", fontWeight: 700, fontSize: "0.9rem", cursor: suLoading || !!suSuccess ? "default" : "pointer", opacity: suLoading || !!suSuccess ? 0.8 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {suLoading ? <><Spinner /> Creating account...</> : "Create Account"}
              </button>

              <OAuthSection />

              <p style={{ textAlign: "center", color: "#4A5568", fontSize: "0.8rem", marginTop: 20 }}>
                Already have an account?{" "}
                <button type="button" onClick={() => setTab("signin")} style={{ background: "none", border: "none", color: "#0066FF", cursor: "pointer", fontSize: "0.8rem", padding: 0 }}>
                  Sign in →
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
