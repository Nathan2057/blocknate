"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: "", color: "" };
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[!@#$%^&*(),.?":{}|<>]/].filter((r) => r.test(pw)).length;
  if (pw.length < 6) return { level: 1, label: "Weak", color: "#FF3B5C" };
  if (pw.length < 10 || variety < 3) return { level: 2, label: "Medium", color: "#F59E0B" };
  return { level: 3, label: "Strong", color: "#00C896" };
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(6,8,15,0.8)",
  border: "1px solid #1C2236",
  borderRadius: 3,
  padding: "10px 12px",
  color: "#E8ECF4",
  fontSize: "0.88rem",
  outline: "none",
  boxSizing: "border-box",
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase!.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      } else {
        setError("Invalid or expired reset link. Please request a new one.");
      }
    });

    const { data: { subscription } } = supabase!.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setError("");

    const { error: updateError } = await supabase!.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  const strength = getPasswordStrength(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordsMismatch = password && confirmPassword && password !== confirmPassword;

  return (
    <div style={{ minHeight: "100vh", background: "#06080F", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 24px 40px" }}>

      {/* Background layers */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "60%", background: "radial-gradient(ellipse 80% 60% at 50% -5%, rgba(0,102,255,0.2) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "radial-gradient(ellipse 60% 40% at 50% 100%, rgba(0,200,150,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(28,34,54,0.8) 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none", opacity: 0.6, maskImage: "radial-gradient(ellipse 90% 90% at 50% 50%, black 40%, transparent 100%)", WebkitMaskImage: "radial-gradient(ellipse 90% 90% at 50% 50%, black 40%, transparent 100%)" }} />
      <div style={{ position: "absolute", top: "20%", left: "-5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,102,255,0.1) 0%, transparent 70%)", animation: "float-orb 8s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "40%", right: "-8%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,200,150,0.07) 0%, transparent 70%)", animation: "float-orb 11s ease-in-out infinite reverse", pointerEvents: "none" }} />

      {/* Top nav */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 56, display: "flex", alignItems: "center", padding: "0 24px", background: "rgba(6,8,15,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #1C2236", zIndex: 50 }}>
        <Link href="/" style={{ textDecoration: "none", fontWeight: 900, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
          <span style={{ color: "#FFFFFF" }}>BLOCK</span>
          <span style={{ color: "#0066FF" }}>NATE</span>
        </Link>
      </div>

      {/* Card */}
      <div style={{ background: "rgba(12,16,24,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(28,34,54,0.8)", borderRadius: 4, padding: 40, width: "100%", maxWidth: 420, position: "relative" }}>

        {/* Loading state */}
        {!ready && !error && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ width: 40, height: 40, border: "3px solid #1C2236", borderTop: "3px solid #0066FF", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            <p style={{ color: "#8892A4", fontSize: "0.85rem" }}>Verifying reset link...</p>
          </div>
        )}

        {/* Error state — invalid/expired link */}
        {error && !ready && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>⚠️</div>
            <h3 style={{ color: "white", marginBottom: 8, fontWeight: 700 }}>Link Expired</h3>
            <p style={{ color: "#8892A4", fontSize: "0.85rem", marginBottom: 24 }}>
              This reset link is invalid or has expired. Please request a new one.
            </p>
            <a href="/auth" style={{ color: "white", background: "#0066FF", padding: "10px 24px", borderRadius: 3, textDecoration: "none", fontSize: "0.88rem", fontWeight: 600 }}>
              Back to Sign In
            </a>
          </div>
        )}

        {/* Success state */}
        {success && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(0,200,150,0.1)", border: "2px solid #00C896", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "1.8rem" }}>
              ✓
            </div>
            <h3 style={{ color: "white", fontWeight: 700, marginBottom: 8 }}>Password Updated!</h3>
            <p style={{ color: "#8892A4", fontSize: "0.85rem", marginBottom: 24 }}>
              Your password has been changed successfully. Redirecting to dashboard...
            </p>
          </div>
        )}

        {/* Main form */}
        {ready && !success && (
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(0,102,255,0.12)", border: "1px solid rgba(0,102,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "1.5rem" }}>
                🔒
              </div>
              <h2 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "1.2rem", margin: "0 0 6px" }}>Set New Password</h2>
              <p style={{ color: "#8892A4", fontSize: "0.82rem", margin: 0 }}>Choose a strong password for your account</p>
            </div>

            {/* Error box */}
            {error && (
              <div style={{ background: "rgba(255,59,92,0.08)", border: "1px solid rgba(255,59,92,0.3)", borderRadius: 3, padding: "10px 14px", color: "#FF3B5C", fontSize: "0.82rem", marginBottom: 16 }}>
                {error}
              </div>
            )}

            {/* New password */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", color: "#8892A4", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>NEW PASSWORD</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  style={{ ...inputStyle, paddingRight: 40 }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#4A5568", display: "flex" }}>
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {password && (
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 3, background: "#1C2236", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(strength.level / 3) * 100}%`, background: strength.color, borderRadius: 2, transition: "width 300ms, background 300ms" }} />
                  </div>
                  <span style={{ color: strength.color, fontSize: "0.68rem", fontWeight: 600, minWidth: 40 }}>{strength.label}</span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", color: "#8892A4", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>CONFIRM PASSWORD</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: 40, borderColor: passwordsMismatch ? "#FF3B5C" : "#1C2236" }}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#4A5568", display: "flex" }}>
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {passwordsMismatch && (
                <span style={{ color: "#FF3B5C", fontSize: "0.75rem" }}>Passwords do not match</span>
              )}
              {passwordsMatch && (
                <span style={{ color: "#00C896", fontSize: "0.75rem" }}>✓ Passwords match</span>
              )}
            </div>

            <div style={{ marginTop: 20 }}>
              <button
                type="submit"
                disabled={loading || !!passwordsMismatch || password.length < 6}
                style={{ width: "100%", background: "#0066FF", color: "#fff", border: "none", borderRadius: 3, padding: "11px 0", fontWeight: 700, fontSize: "0.9rem", cursor: loading || !!passwordsMismatch || password.length < 6 ? "default" : "pointer", opacity: loading || !!passwordsMismatch || password.length < 6 ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {loading ? <><Spinner /> Updating...</> : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
