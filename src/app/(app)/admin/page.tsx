"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* ─── Constants ─── */
const API_SECRET = "blocknate_secret_2025";

/* ─── Types ─── */
type UserRole = "user" | "admin" | "super_admin";
type SignalStatus = "ACTIVE" | "TP1_HIT" | "TP2_HIT" | "TP3_HIT" | "SL_HIT" | "CLOSED" | "CANCELLED";
type Category = "guide" | "strategy" | "pattern" | "glossary";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  is_banned: boolean;
  banned_reason: string | null;
  banned_at: string | null;
  plan?: string | null;
  created_at: string;
  updated_at?: string;
}

interface Signal {
  id: string;
  coin: string;
  signal_type: "LONG" | "SHORT";
  status: SignalStatus;
  entry_price: number;
  tp1: number;
  stop_loss: number;
  confidence: number;
  created_at: string;
}

interface Article {
  id: string;
  title: string;
  category: Category;
  excerpt: string | null;
  content: string | null;
  read_time: number;
  published: boolean;
  created_at: string;
}

/* ─── Helpers ─── */
function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(s: string | null | undefined): string {
  if (!s) return "never";
  const diff = (Date.now() - new Date(s).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ─── Shared UI ─── */
function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span style={{ background: bg, color, border: `1px solid ${color}30`, borderRadius: 3, padding: "2px 8px", fontSize: "0.65rem", fontWeight: 700 }}>{text}</span>
  );
}

const thStyle: React.CSSProperties = {
  background: "#080C14", color: "#4A5568", fontSize: "0.65rem", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.08em", padding: "10px 16px",
  textAlign: "left", whiteSpace: "nowrap", borderBottom: "1px solid #1C2236",
};
const tdStyle: React.CSSProperties = {
  padding: "12px 16px", borderBottom: "1px solid #1C2236", fontSize: "0.82rem", verticalAlign: "middle",
};
const inputStyle: React.CSSProperties = {
  width: "100%", background: "rgba(6,8,15,0.8)", border: "1px solid #1C2236",
  borderRadius: 3, padding: "9px 12px", color: "#E8ECF4", fontSize: "0.85rem",
  outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", color: "#8892A4", fontSize: "0.68rem", fontWeight: 600,
  letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5,
};

function SmallBtn({ onClick, color, children, disabled }: { onClick: () => void; color: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: "none", border: `1px solid ${color}50`, color, borderRadius: 3, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 600, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1 }}>
      {children}
    </button>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderLeft: `3px solid ${color}`, borderRadius: 4, padding: "14px 18px", flex: 1, minWidth: 120 }}>
      <div style={{ color: "#4A5568", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</div>
      <div style={{ color: "#FFFFFF", fontSize: "1.5rem", fontWeight: 900, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

/* ─── Role / Status badges ─── */
function RoleBadge({ role }: { role: UserRole }) {
  const map = {
    super_admin: { text: "SUPER ADMIN", color: "#FF3B5C", bg: "rgba(255,59,92,0.12)" },
    admin: { text: "ADMIN", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
    user: { text: "USER", color: "#4A5568", bg: "#1C2236" },
  };
  const s = map[role] ?? map.user;
  return <Badge text={s.text} color={s.color} bg={s.bg} />;
}

function StatusBadge({ banned }: { banned: boolean }) {
  return banned
    ? <Badge text="BANNED" color="#FF3B5C" bg="rgba(255,59,92,0.1)" />
    : <Badge text="ACTIVE" color="#00C896" bg="rgba(0,200,150,0.1)" />;
}

/* ─── Ban Modal ─── */
function BanModal({ user, onClose, onBanned }: { user: Profile; onClose: () => void; onBanned: () => void }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleBan(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) { setError("Reason is required"); return; }
    setLoading(true);
    const { error: dbErr } = await supabase!.from("profiles").update({
      is_banned: true,
      banned_at: new Date().toISOString(),
      banned_reason: reason.trim(),
    }).eq("id", user.id);
    setLoading(false);
    if (dbErr) { setError(dbErr.message); return; }
    onBanned(); onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, padding: 32, width: "100%", maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ color: "#FF3B5C", fontWeight: 700, fontSize: "1rem", margin: 0 }}>Ban User</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4A5568", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
        </div>
        <div style={{ background: "#080C14", border: "1px solid #1C2236", borderRadius: 3, padding: "10px 14px", marginBottom: 20 }}>
          <div style={{ color: "#8892A4", fontSize: "0.72rem" }}>Banning account:</div>
          <div style={{ color: "#FFFFFF", fontWeight: 600, fontSize: "0.88rem", marginTop: 2 }}>{user.email}</div>
        </div>
        {error && <div style={{ background: "rgba(255,59,92,0.08)", border: "1px solid rgba(255,59,92,0.3)", borderRadius: 3, padding: "8px 12px", color: "#FF3B5C", fontSize: "0.78rem", marginBottom: 12 }}>{error}</div>}
        <form onSubmit={handleBan}>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Reason (required)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="State the reason for banning this user..." rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
          </div>
          <button type="submit" disabled={loading} style={{ width: "100%", background: "#FF3B5C", color: "#fff", border: "none", borderRadius: 3, padding: "10px 0", fontWeight: 700, fontSize: "0.88rem", cursor: loading ? "default" : "pointer", opacity: loading ? 0.8 : 1 }}>
            {loading ? "Banning..." : "Confirm Ban"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── User Detail Modal ─── */
function UserDetailModal({ user, viewerRole, currentUserId, onClose, onUpdate }: {
  user: Profile; viewerRole: UserRole; currentUserId: string; onClose: () => void; onUpdate: () => void;
}) {
  const [tradeCount, setTradeCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [banningUser, setBanningUser] = useState(false);
  const isSelf = user.id === currentUserId;
  const isSuperAdmin = viewerRole === "super_admin";
  const isAdminViewer = viewerRole === "admin" || viewerRole === "super_admin";

  useEffect(() => {
    supabase!.from("portfolio_trades").select("*", { count: "exact", head: true }).eq("user_id", user.id)
      .then(({ count }) => setTradeCount(count ?? 0));
  }, [user.id]);

  async function changeRole(newRole: "admin" | "user") {
    setLoading(true);
    await supabase!.from("profiles").update({ role: newRole }).eq("id", user.id);
    setLoading(false);
    onUpdate(); onClose();
  }

  async function handleUnban() {
    if (!window.confirm(`Unban ${user.email}?`)) return;
    setLoading(true);
    await supabase!.from("profiles").update({ is_banned: false, banned_at: null, banned_reason: null }).eq("id", user.id);
    setLoading(false);
    onUpdate(); onClose();
  }

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
        <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, padding: 32, width: "100%", maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "1rem", margin: 0 }}>User Details</h2>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#4A5568", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
          </div>

          {/* Avatar + info */}
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(0,102,255,0.15)", border: "1px solid rgba(0,102,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0066FF", fontSize: "1.2rem", fontWeight: 700, flexShrink: 0 }}>
              {(user.email?.[0] ?? "?").toUpperCase()}
            </div>
            <div>
              <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "0.95rem" }}>{user.full_name || "—"}</div>
              <div style={{ color: "#8892A4", fontSize: "0.8rem" }}>{user.email}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <RoleBadge role={user.role} />
                <StatusBadge banned={user.is_banned} />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Joined", value: fmtDate(user.created_at) },
              { label: "Total Trades", value: tradeCount == null ? "..." : tradeCount },
              { label: "Plan", value: user.plan ?? "free" },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#080C14", border: "1px solid #1C2236", borderRadius: 3, padding: "10px 14px" }}>
                <div style={{ color: "#4A5568", fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                <div style={{ color: "#FFFFFF", fontSize: "0.85rem", fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Ban info */}
          {user.is_banned && (
            <div style={{ background: "rgba(255,59,92,0.06)", border: "1px solid rgba(255,59,92,0.2)", borderRadius: 3, padding: "12px 14px", marginBottom: 20 }}>
              <div style={{ color: "#FF3B5C", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Banned</div>
              <div style={{ color: "#8892A4", fontSize: "0.78rem" }}>{fmtDate(user.banned_at)}</div>
              {user.banned_reason && <div style={{ color: "#FF3B5C", fontSize: "0.82rem", marginTop: 4 }}>{user.banned_reason}</div>}
            </div>
          )}

          {/* Actions */}
          {!isSelf && isAdminViewer && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {isSuperAdmin && user.role === "user" && (
                <button onClick={() => changeRole("admin")} disabled={loading} style={{ background: "none", border: "1px solid rgba(245,158,11,0.5)", color: "#F59E0B", borderRadius: 3, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                  Make Admin
                </button>
              )}
              {isSuperAdmin && user.role === "admin" && (
                <button onClick={() => changeRole("user")} disabled={loading} style={{ background: "none", border: "1px solid rgba(245,158,11,0.5)", color: "#F59E0B", borderRadius: 3, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                  Revoke Admin
                </button>
              )}
              {(isSuperAdmin || (isAdminViewer && user.role === "user")) && !user.is_banned && (
                <button onClick={() => setBanningUser(true)} disabled={loading} style={{ background: "none", border: "1px solid rgba(255,59,92,0.5)", color: "#FF3B5C", borderRadius: 3, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                  Ban User
                </button>
              )}
              {(isSuperAdmin || (isAdminViewer && user.role === "user")) && user.is_banned && (
                <button onClick={handleUnban} disabled={loading} style={{ background: "none", border: "1px solid rgba(0,200,150,0.5)", color: "#00C896", borderRadius: 3, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                  Unban
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {banningUser && (
        <BanModal user={user} onClose={() => setBanningUser(false)} onBanned={() => { onUpdate(); onClose(); }} />
      )}
    </>
  );
}

/* ─── Article Modal ─── */
function ArticleModal({ article, onClose, onSaved }: { article: Article | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(article?.title ?? "");
  const [category, setCategory] = useState<Category>(article?.category ?? "guide");
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [readTime, setReadTime] = useState(String(article?.read_time ?? 5));
  const [published, setPublished] = useState(article?.published ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    setLoading(true); setError("");
    const payload = { title: title.trim(), category, excerpt: excerpt.trim() || null, content: content.trim() || null, read_time: parseInt(readTime) || 5, published };
    const { error: dbErr } = article
      ? await supabase!.from("articles").update(payload).eq("id", article.id)
      : await supabase!.from("articles").insert(payload);
    setLoading(false);
    if (dbErr) { setError(dbErr.message); return; }
    onSaved(); onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, padding: 32, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "1rem", margin: 0 }}>{article ? "Edit Article" : "Add Article"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4A5568", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
        </div>
        {error && <div style={{ background: "rgba(255,59,92,0.08)", border: "1px solid rgba(255,59,92,0.3)", borderRadius: 3, padding: "9px 12px", color: "#FF3B5C", fontSize: "0.8rem", marginBottom: 16 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article title" style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as Category)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="guide">Guide</option><option value="strategy">Strategy</option>
                <option value="pattern">Pattern</option><option value="glossary">Glossary</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Read Time (min)</label>
              <input type="number" value={readTime} onChange={(e) => setReadTime(e.target.value)} min="1" max="60" style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Excerpt</label>
            <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Content (Markdown)</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace" }} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, cursor: "pointer" }}>
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} style={{ accentColor: "#0066FF" }} />
            <span style={{ color: "#8892A4", fontSize: "0.82rem" }}>Published</span>
          </label>
          <button type="submit" disabled={loading} style={{ width: "100%", background: "#0066FF", color: "#fff", border: "none", borderRadius: 3, padding: "11px 0", fontWeight: 700, fontSize: "0.9rem", cursor: loading ? "default" : "pointer", opacity: loading ? 0.8 : 1 }}>
            {loading ? "Saving..." : article ? "Update Article" : "Add Article"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── USERS TAB ─── */
function UsersTab({ viewerRole, currentUserId }: { viewerRole: UserRole; currentUserId: string }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [banningUser, setBanningUser] = useState<Profile | null>(null);
  const isSuperAdmin = viewerRole === "super_admin";
  const isAdminViewer = viewerRole === "admin" || viewerRole === "super_admin";

  const fetchUsers = useCallback(() => {
    supabase!.from("profiles").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { setUsers((data as Profile[]) ?? []); setLoading(false); });
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function changeRole(user: Profile, newRole: "admin" | "user") {
    await supabase!.from("profiles").update({ role: newRole }).eq("id", user.id);
    fetchUsers();
  }

  async function handleUnban(user: Profile) {
    if (!window.confirm(`Unban ${user.email}?`)) return;
    await supabase!.from("profiles").update({ is_banned: false, banned_at: null, banned_reason: null }).eq("id", user.id);
    fetchUsers();
  }

  const filtered = users.filter((u) => {
    const matchSearch = !search || (u.email ?? "").toLowerCase().includes(search.toLowerCase()) || (u.full_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "ALL" || (roleFilter === "Admins" && (u.role === "admin" || u.role === "super_admin")) || (roleFilter === "Users" && u.role === "user") || (roleFilter === "Banned" && u.is_banned);
    return matchSearch && matchRole;
  });

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#4A5568" }}>Loading users...</div>;

  return (
    <div>
      <div style={{ padding: "16px 0 12px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by email or name..." style={{ ...inputStyle, maxWidth: 280 }} />
        <div style={{ display: "flex", gap: 6 }}>
          {["ALL", "Users", "Admins", "Banned"].map((f) => (
            <button key={f} onClick={() => setRoleFilter(f)} style={{ background: roleFilter === f ? "#0066FF" : "transparent", border: `1px solid ${roleFilter === f ? "#0066FF" : "#1C2236"}`, borderRadius: 3, padding: "4px 12px", color: roleFilter === f ? "#fff" : "#8892A4", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>{f}</button>
          ))}
        </div>
      </div>
      <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#4A5568" }}>No users found</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Avatar", "Email", "Full Name", "Role", "Status", "Joined", "Actions"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const isSelf = user.id === currentUserId;
                  return (
                    <tr key={user.id} onClick={() => setSelectedUser(user)} style={{ cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={tdStyle}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,102,255,0.15)", border: "1px solid rgba(0,102,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0066FF", fontSize: "0.72rem", fontWeight: 700 }}>
                          {(user.email?.[0] ?? "?").toUpperCase()}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color: "#FFFFFF" }}>{user.email ?? "—"}{isSelf && <span style={{ color: "#4A5568", fontSize: "0.68rem", marginLeft: 6 }}>(you)</span>}</td>
                      <td style={{ ...tdStyle, color: "#8892A4" }}>{user.full_name ?? "—"}</td>
                      <td style={tdStyle}><RoleBadge role={user.role ?? "user"} /></td>
                      <td style={tdStyle}><StatusBadge banned={user.is_banned} /></td>
                      <td style={{ ...tdStyle, color: "#4A5568" }}>{fmtDate(user.created_at)}</td>
                      <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                        {!isSelf && isAdminViewer && (
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {isSuperAdmin && user.role === "user" && (
                              <SmallBtn onClick={() => changeRole(user, "admin")} color="#F59E0B">Make Admin</SmallBtn>
                            )}
                            {isSuperAdmin && user.role === "admin" && (
                              <SmallBtn onClick={() => changeRole(user, "user")} color="#F59E0B">Revoke</SmallBtn>
                            )}
                            {(isSuperAdmin || user.role === "user") && !user.is_banned && (
                              <SmallBtn onClick={() => setBanningUser(user)} color="#FF3B5C">Ban</SmallBtn>
                            )}
                            {(isSuperAdmin || user.role === "user") && user.is_banned && (
                              <SmallBtn onClick={() => handleUnban(user)} color="#00C896">Unban</SmallBtn>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: "10px 16px", borderTop: "1px solid #1C2236" }}>
          <span style={{ color: "#4A5568", fontSize: "0.72rem" }}>Total: {filtered.length} users</span>
        </div>
      </div>

      {selectedUser && (
        <UserDetailModal user={selectedUser} viewerRole={viewerRole} currentUserId={currentUserId} onClose={() => setSelectedUser(null)} onUpdate={fetchUsers} />
      )}
      {banningUser && (
        <BanModal user={banningUser} onClose={() => setBanningUser(null)} onBanned={fetchUsers} />
      )}
    </div>
  );
}

/* ─── SIGNALS TAB ─── */
function SignalsTab() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pairFilter, setPairFilter] = useState("ALL");
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchSignals = useCallback(() => {
    supabase!.from("signals").select("id,coin,signal_type,status,entry_price,tp1,stop_loss,confidence,created_at")
      .order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { setSignals((data as Signal[]) ?? []); setLoading(false); });
  }, []);

  useEffect(() => { fetchSignals(); }, [fetchSignals]);

  async function runAction(url: string, setRunning: (v: boolean) => void) {
    setRunning(true); setActionMsg(null);
    try {
      const res = await fetch(url);
      const json = await res.json().catch(() => ({}));
      setActionMsg({ text: json.message ?? (res.ok ? "Success" : "Error"), ok: res.ok });
      if (res.ok) fetchSignals();
    } catch { setActionMsg({ text: "Network error", ok: false }); }
    setRunning(false);
  }

  async function deleteSignal(id: string) {
    if (!window.confirm("Delete this signal?")) return;
    await supabase!.from("signals").delete().eq("id", id);
    setSignals((prev) => prev.filter((s) => s.id !== id));
  }

  const STATUSES = ["ALL", "ACTIVE", "TP1_HIT", "TP2_HIT", "TP3_HIT", "SL_HIT", "CLOSED", "CANCELLED"];
  const PAIRS = ["ALL", "BTC", "ETH", "SOL", "BNB", "XRP"];
  const filtered = signals.filter((s) => (statusFilter === "ALL" || s.status === statusFilter) && (pairFilter === "ALL" || s.coin.toUpperCase().includes(pairFilter)));
  const closed = signals.filter((s) => ["TP1_HIT", "TP2_HIT", "TP3_HIT", "SL_HIT", "CLOSED"].includes(s.status));
  const wins = closed.filter((s) => s.status.includes("TP"));
  const winRate = closed.length > 0 ? ((wins.length / closed.length) * 100).toFixed(1) : "—";
  const avgConf = signals.length > 0 ? (signals.reduce((s, sig) => s + sig.confidence, 0) / signals.length).toFixed(1) : "—";

  function sbadge(s: SignalStatus) {
    if (s === "ACTIVE") return { color: "#00C896", bg: "rgba(0,200,150,0.1)" };
    if (s.includes("TP")) return { color: "#00C896", bg: "rgba(0,200,150,0.08)" };
    if (s === "SL_HIT") return { color: "#FF3B5C", bg: "rgba(255,59,92,0.1)" };
    return { color: "#4A5568", bg: "#1C2236" };
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#4A5568" }}>Loading...</div>;

  return (
    <div>
      <div style={{ padding: "16px 0 12px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{ background: statusFilter === s ? "#0066FF" : "transparent", border: `1px solid ${statusFilter === s ? "#0066FF" : "#1C2236"}`, borderRadius: 3, padding: "4px 10px", color: statusFilter === s ? "#fff" : "#8892A4", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer" }}>{s}</button>
        ))}
        <select value={pairFilter} onChange={(e) => setPairFilter(e.target.value)} style={{ ...inputStyle, width: "auto", cursor: "pointer", padding: "4px 10px", fontSize: "0.75rem" }}>
          {PAIRS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Pair", "Dir", "Entry", "TP1", "SL", "Conf", "Status", "Created", ""].map((h, i) => <th key={i} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ ...tdStyle, textAlign: "center", color: "#4A5568", padding: 32 }}>No signals</td></tr>
              ) : filtered.map((sig) => {
                const sc = sbadge(sig.status);
                return (
                  <tr key={sig.id} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ ...tdStyle, color: "#FFFFFF", fontWeight: 700 }}>{sig.coin}</td>
                    <td style={tdStyle}><Badge text={sig.signal_type} color={sig.signal_type === "LONG" ? "#00C896" : "#FF3B5C"} bg={sig.signal_type === "LONG" ? "rgba(0,200,150,0.1)" : "rgba(255,59,92,0.1)"} /></td>
                    <td style={{ ...tdStyle, color: "#E8ECF4" }}>${sig.entry_price.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td>
                    <td style={{ ...tdStyle, color: "#00C896" }}>${sig.tp1.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td>
                    <td style={{ ...tdStyle, color: "#FF3B5C" }}>${sig.stop_loss.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td>
                    <td style={{ ...tdStyle, color: "#0066FF", fontWeight: 600 }}>{sig.confidence}%</td>
                    <td style={tdStyle}><Badge text={sig.status} color={sc.color} bg={sc.bg} /></td>
                    <td style={{ ...tdStyle, color: "#4A5568" }}>{fmtDate(sig.created_at)}</td>
                    <td style={tdStyle}><SmallBtn onClick={() => deleteSignal(sig.id)} color="#FF3B5C">Delete</SmallBtn></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {[{ label: "Win Rate", value: `${winRate}%`, color: "#00C896" }, { label: "Avg Confidence", value: `${avgConf}%`, color: "#0066FF" }, { label: "Total", value: signals.length, color: "#8892A4" }, { label: "Active", value: signals.filter((s) => s.status === "ACTIVE").length, color: "#F59E0B" }].map(({ label, value, color }) => (
          <StatCard key={label} label={label} value={value} color={color} />
        ))}
      </div>
      <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, padding: 18 }}>
        <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "0.88rem", marginBottom: 12 }}>Manual Triggers</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button disabled={generating} onClick={() => runAction(`/api/generate-signals?secret=${API_SECRET}`, setGenerating)} style={{ background: "none", border: "1px solid #0066FF", color: "#0066FF", borderRadius: 3, padding: "8px 16px", fontSize: "0.8rem", fontWeight: 600, cursor: generating ? "default" : "pointer", opacity: generating ? 0.7 : 1 }}>
            {generating ? "Running..." : "🔄 Run Signal Engine"}
          </button>
          <button disabled={updating} onClick={() => runAction(`/api/update-signal-status?secret=${API_SECRET}`, setUpdating)} style={{ background: "none", border: "1px solid #0066FF", color: "#0066FF", borderRadius: 3, padding: "8px 16px", fontSize: "0.8rem", fontWeight: 600, cursor: updating ? "default" : "pointer", opacity: updating ? 0.7 : 1 }}>
            {updating ? "Updating..." : "📊 Update Signal Status"}
          </button>
        </div>
        {actionMsg && (
          <div style={{ marginTop: 10, padding: "8px 12px", background: actionMsg.ok ? "rgba(0,200,150,0.06)" : "rgba(255,59,92,0.06)", border: `1px solid ${actionMsg.ok ? "rgba(0,200,150,0.3)" : "rgba(255,59,92,0.3)"}`, borderRadius: 3, color: actionMsg.ok ? "#00C896" : "#FF3B5C", fontSize: "0.78rem" }}>
            {actionMsg.text}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── ARTICLES TAB ─── */
function ArticlesTab() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Article | null | "new">(null);

  const fetchArticles = useCallback(() => {
    supabase!.from("articles").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { setArticles((data as Article[]) ?? []); setLoading(false); });
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  async function togglePublished(art: Article) {
    await supabase!.from("articles").update({ published: !art.published }).eq("id", art.id);
    setArticles((prev) => prev.map((a) => a.id === art.id ? { ...a, published: !a.published } : a));
  }

  async function deleteArticle(id: string) {
    if (!window.confirm("Delete this article?")) return;
    await supabase!.from("articles").delete().eq("id", id);
    setArticles((prev) => prev.filter((a) => a.id !== id));
  }

  const catColor = (c: Category) => ({ guide: "#0066FF", strategy: "#00C896", pattern: "#F59E0B", glossary: "#8892A4" }[c] ?? "#4A5568");
  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#4A5568" }}>Loading...</div>;

  return (
    <div>
      <div style={{ padding: "16px 0 12px", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setEditing("new")} style={{ background: "#0066FF", color: "#fff", border: "none", borderRadius: 3, padding: "8px 16px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>+ Add Article</button>
      </div>
      <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, overflow: "hidden" }}>
        {articles.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: "#4A5568" }}>No articles yet.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Title", "Category", "Read Time", "Published", "Created", "Actions"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {articles.map((art) => (
                  <tr key={art.id} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ ...tdStyle, color: "#FFFFFF", maxWidth: 260 }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{art.title}</div></td>
                    <td style={tdStyle}><Badge text={art.category} color={catColor(art.category)} bg={`${catColor(art.category)}15`} /></td>
                    <td style={{ ...tdStyle, color: "#8892A4" }}>{art.read_time} min</td>
                    <td style={tdStyle}>
                      <div onClick={() => togglePublished(art)} style={{ width: 36, height: 20, borderRadius: 10, background: art.published ? "#00C896" : "#1C2236", position: "relative", cursor: "pointer", transition: "background 200ms", display: "inline-block" }}>
                        <div style={{ position: "absolute", top: 3, left: art.published ? 18 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 200ms" }} />
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: "#4A5568" }}>{fmtDate(art.created_at)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <SmallBtn onClick={() => setEditing(art)} color="#0066FF">Edit</SmallBtn>
                        <SmallBtn onClick={() => deleteArticle(art.id)} color="#FF3B5C">Delete</SmallBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing !== null && <ArticleModal article={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={fetchArticles} />}
    </div>
  );
}

/* ─── SYSTEM TAB ─── */
function SystemTab() {
  const [statuses, setStatuses] = useState<Record<string, { ok: boolean; msg: string; checked: string }>>({});
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [checking, setChecking] = useState(false);
  const [actionResults, setActionResults] = useState<Record<string, { text: string; ok: boolean } | null>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [lastSignal, setLastSignal] = useState<string | null>(null);

  const checkStatuses = useCallback(async () => {
    setChecking(true);
    const now = new Date().toLocaleTimeString();
    const { error: sbErr } = await supabase!.from("signals").select("id").limit(1);
    let tickerOk = false; try { const r = await fetch("/api/ticker"); tickerOk = r.ok; } catch { /* ignore */ }
    let newsOk = false; try { const r = await fetch("/api/news"); newsOk = r.ok; } catch { /* ignore */ }
    const { data: lastSig } = await supabase!.from("signals").select("created_at").order("created_at", { ascending: false }).limit(1).single();
    const age = lastSig ? (Date.now() - new Date(lastSig.created_at).getTime()) / 1000 : Infinity;
    setLastSignal(lastSig?.created_at ?? null);
    setStatuses({
      Supabase: { ok: !sbErr, msg: sbErr ? "Error" : "Connected", checked: now },
      "Binance API": { ok: tickerOk, msg: tickerOk ? "Online" : "Error", checked: now },
      "News API": { ok: newsOk, msg: newsOk ? "Online" : "Error", checked: now },
      "Signal Engine": { ok: age < 86400, msg: age < 7200 ? "Recent" : age < 86400 ? "Stale (>2h)" : "Very old", checked: now },
    });
    const tables = ["signals", "articles", "profiles", "portfolio_trades", "watched_pairs"];
    const countRes: Record<string, number | null> = {};
    await Promise.all(tables.map(async (t) => { const { count } = await supabase!.from(t).select("*", { count: "exact", head: true }); countRes[t] = count ?? null; }));
    setCounts(countRes);
    setChecking(false);
  }, []);

  useEffect(() => { checkStatuses(); }, [checkStatuses]);

  async function runAction(key: string, url: string) {
    setActionLoading((p) => ({ ...p, [key]: true })); setActionResults((p) => ({ ...p, [key]: null }));
    try { const res = await fetch(url); const json = await res.json().catch(() => ({})); setActionResults((p) => ({ ...p, [key]: { text: json.message ?? (res.ok ? "Done" : "Error"), ok: res.ok } })); }
    catch { setActionResults((p) => ({ ...p, [key]: { text: "Network error", ok: false } })); }
    setActionLoading((p) => ({ ...p, [key]: false }));
  }

  const ACTIONS = [
    { key: "seed", label: "🌱 Seed Articles", url: `/api/seed-articles?secret=${API_SECRET}` },
    { key: "gen", label: "🔄 Generate Signals", url: `/api/generate-signals?secret=${API_SECRET}` },
    { key: "upd", label: "📊 Update Status", url: `/api/update-signal-status?secret=${API_SECRET}` },
  ];

  function sc(name: string, ok: boolean) {
    if (name === "Signal Engine" && statuses[name]?.msg === "Stale (>2h)") return "#F59E0B";
    return ok ? "#00C896" : "#FF3B5C";
  }

  return (
    <div>
      <div style={{ marginTop: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ color: "#FFFFFF", fontSize: "0.88rem", fontWeight: 700, margin: 0 }}>Environment Status</h3>
          <button onClick={checkStatuses} disabled={checking} style={{ background: "none", border: "1px solid #1C2236", color: "#8892A4", borderRadius: 3, padding: "4px 12px", fontSize: "0.72rem", cursor: "pointer", opacity: checking ? 0.7 : 1 }}>{checking ? "Checking..." : "↻ Refresh"}</button>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {Object.entries(statuses).map(([name, s]) => (
            <div key={name} style={{ background: "#0C1018", border: "1px solid #1C2236", borderLeft: `3px solid ${sc(name, s.ok)}`, borderRadius: 4, padding: "12px 16px", flex: 1, minWidth: 150 }}>
              <div style={{ color: "#8892A4", fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>{name}</div>
              <Badge text={s.msg} color={sc(name, s.ok)} bg={`${sc(name, s.ok)}15`} />
              <div style={{ color: "#4A5568", fontSize: "0.6rem", marginTop: 5 }}>Checked {s.checked}</div>
            </div>
          ))}
          {Object.keys(statuses).length === 0 && [1,2,3,4].map((n) => <div key={n} style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, flex: 1, minWidth: 150, height: 70, opacity: 0.4 }} />)}
        </div>
        {lastSignal && <div style={{ color: "#4A5568", fontSize: "0.72rem", marginTop: 8 }}>Last signal: {timeAgo(lastSignal)}</div>}
      </div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ color: "#FFFFFF", fontSize: "0.88rem", fontWeight: 700, marginBottom: 12 }}>Database Stats</h3>
        <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={thStyle}>Table</th><th style={thStyle}>Rows</th></tr></thead>
            <tbody>
              {(["signals", "articles", "profiles", "portfolio_trades", "watched_pairs"] as const).map((t) => (
                <tr key={t} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ ...tdStyle, color: "#8892A4", fontFamily: "monospace" }}>{t}</td>
                  <td style={{ ...tdStyle, color: "#FFFFFF", fontWeight: 700 }}>{counts[t] == null ? <span style={{ color: "#4A5568" }}>—</span> : counts[t]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3 style={{ color: "#FFFFFF", fontSize: "0.88rem", fontWeight: 700, marginBottom: 12 }}>Quick Actions</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {ACTIONS.map(({ key, label, url }) => (
            <div key={key} style={{ flex: 1, minWidth: 160 }}>
              <button disabled={!!actionLoading[key]} onClick={() => runAction(key, url)} style={{ width: "100%", background: "none", border: "1px solid #1C2236", color: "#8892A4", borderRadius: 3, padding: "10px 16px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", opacity: actionLoading[key] ? 0.7 : 1 }}>
                {actionLoading[key] ? "Running..." : label}
              </button>
              {actionResults[key] && (
                <div style={{ marginTop: 6, color: actionResults[key]!.ok ? "#00C896" : "#FF3B5C", fontSize: "0.72rem", padding: "4px 8px", background: actionResults[key]!.ok ? "rgba(0,200,150,0.06)" : "rgba(255,59,92,0.06)", border: `1px solid ${actionResults[key]!.ok ? "rgba(0,200,150,0.3)" : "rgba(255,59,92,0.3)"}`, borderRadius: 3 }}>
                  {actionResults[key]!.text}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── CRON JOBS TAB ─── */
function CronJobsTab() {
  const [lastSignal, setLastSignal] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    supabase!.from("signals").select("created_at").order("created_at", { ascending: false }).limit(1).single()
      .then(({ data }) => setLastSignal(data?.created_at ?? null));
  }, []);

  function copyUrl(url: string, key: string) {
    navigator.clipboard.writeText(url).then(() => { setCopied(key); setTimeout(() => setCopied(null), 2000); });
  }

  const CRONS = [
    { key: "gen", title: "Signal Generator", url: `https://blocknate1.vercel.app/api/generate-signals?secret=${API_SECRET}`, schedule: "Every 1 hour", desc: "Generates new trading signals" },
    { key: "upd", title: "Signal Status Updater", url: `https://blocknate1.vercel.app/api/update-signal-status?secret=${API_SECRET}`, schedule: "Every 30 minutes", desc: "Updates TP/SL hit status" },
  ];

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ color: "#FFFFFF", fontSize: "0.88rem", fontWeight: 700, marginBottom: 4 }}>Cron Job Configuration</h3>
      <p style={{ color: "#4A5568", fontSize: "0.78rem", margin: "0 0 20px" }}>Set these up on cron-job.org for automated signals</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
        {CRONS.map(({ key, title, url, schedule, desc }) => (
          <div key={key} style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
              <div>
                <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "0.88rem" }}>{title}</div>
                <div style={{ color: "#4A5568", fontSize: "0.72rem" }}>{desc}</div>
              </div>
              <Badge text="Active" color="#00C896" bg="rgba(0,200,150,0.1)" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "center", background: "#080C14", border: "1px solid #1C2236", borderRadius: 3, padding: "7px 10px", marginBottom: 10 }}>
              <span style={{ color: "#4A5568", fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase" }}>URL</span>
              <span style={{ color: "#8892A4", fontSize: "0.7rem", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</span>
              <button onClick={() => copyUrl(url, key)} style={{ background: copied === key ? "rgba(0,200,150,0.1)" : "none", border: `1px solid ${copied === key ? "#00C896" : "#1C2236"}`, color: copied === key ? "#00C896" : "#8892A4", borderRadius: 3, padding: "3px 10px", fontSize: "0.68rem", cursor: "pointer" }}>
                {copied === key ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <span style={{ color: "#4A5568", fontSize: "0.68rem" }}>Schedule: <span style={{ color: "#8892A4" }}>{schedule}</span></span>
              <span style={{ color: "#4A5568", fontSize: "0.68rem" }}>Method: <span style={{ color: "#8892A4" }}>GET</span></span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderLeft: "3px solid #0066FF", borderRadius: 4, padding: 18, marginBottom: 16 }}>
        <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "0.85rem", marginBottom: 10 }}>How to set up on cron-job.org</div>
        {["Go to cron-job.org and create a free account", "Click New Cronjob", "Paste the URL above", "Set the schedule", "Save and enable"].map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(0,102,255,0.15)", border: "1px solid rgba(0,102,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0066FF", fontSize: "0.6rem", fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
            <span style={{ color: "#8892A4", fontSize: "0.8rem" }}>{step}</span>
          </div>
        ))}
      </div>
      <div style={{ background: "#0C1018", border: "1px solid #1C2236", borderRadius: 4, padding: "12px 18px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#4A5568", fontSize: "0.78rem" }}>Last signal generated</span>
        <span style={{ color: lastSignal ? "#00C896" : "#FF3B5C", fontWeight: 700, fontSize: "0.82rem" }}>{lastSignal ? timeAgo(lastSignal) : "Never"}</span>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─── */
type Tab = "users" | "signals" | "articles" | "system" | "cron";

export default function AdminPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("user");
  const [currentUserId, setCurrentUserId] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, bannedUsers: 0, totalSignals: 0, activeSignals: 0, totalTrades: 0, articles: 0 });
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) { router.push("/auth"); return; }

      const { data: profile, error } = await supabase!
        .from("profiles")
        .select("role, email")
        .eq("id", user.id)
        .single();

      console.log("Admin check:", user.email, profile, error);

      if (!profile) {
        await supabase!.from("profiles").upsert({
          id: user.id,
          email: user.email,
          full_name: (user.user_metadata as Record<string, string>)?.full_name ?? "",
          role: "user",
        });
        router.push("/dashboard");
        return;
      }

      const role = profile.role as UserRole;
      if (role !== "admin" && role !== "super_admin") {
        router.push("/dashboard");
        return;
      }

      setUserRole(role);
      setCurrentUserId(user.id);
      setAuthChecked(true);
    };
    checkAccess();
  }, [router]);

  const fetchStats = useCallback(async () => {
    const [totalRes, activeRes, bannedRes, sigRes, activeSigRes, tradesRes, artRes] = await Promise.all([
      supabase!.from("profiles").select("*", { count: "exact", head: true }),
      supabase!.from("profiles").select("*", { count: "exact", head: true }).eq("is_banned", false),
      supabase!.from("profiles").select("*", { count: "exact", head: true }).eq("is_banned", true),
      supabase!.from("signals").select("*", { count: "exact", head: true }),
      supabase!.from("signals").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
      supabase!.from("portfolio_trades").select("*", { count: "exact", head: true }),
      supabase!.from("articles").select("*", { count: "exact", head: true }),
    ]);
    setStats({
      totalUsers: totalRes.count ?? 0,
      activeUsers: activeRes.count ?? 0,
      bannedUsers: bannedRes.count ?? 0,
      totalSignals: sigRes.count ?? 0,
      activeSignals: activeSigRes.count ?? 0,
      totalTrades: tradesRes.count ?? 0,
      articles: artRes.count ?? 0,
    });
    setLastUpdated(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }, []);

  useEffect(() => { if (authChecked) fetchStats(); }, [authChecked, fetchStats]);

  if (!authChecked) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <div style={{ width: 32, height: 32, border: "3px solid #1C2236", borderTop: "3px solid #0066FF", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  const isSuperAdmin = userRole === "super_admin";

  const TABS: { key: Tab; label: string }[] = [
    { key: "users", label: "Users" },
    { key: "signals", label: "Signals" },
    { key: "articles", label: "Articles" },
    { key: "system", label: "System" },
    { key: "cron", label: "Cron Jobs" },
  ];

  const STAT_CARDS = [
    { label: "Total Users", value: stats.totalUsers, color: "#0066FF" },
    { label: "Active Users", value: stats.activeUsers, color: "#00C896" },
    { label: "Banned", value: stats.bannedUsers, color: "#FF3B5C" },
    { label: "Total Signals", value: stats.totalSignals, color: "#F59E0B" },
    { label: "Active Signals", value: stats.activeSignals, color: "#00C896" },
    { label: "Total Trades", value: stats.totalTrades, color: "#0066FF" },
    { label: "Articles", value: stats.articles, color: "#8B5CF6" },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "1.4rem", margin: 0 }}>Admin Panel</h1>
            {isSuperAdmin
              ? <span style={{ background: "rgba(255,59,92,0.15)", color: "#FF3B5C", border: "1px solid rgba(255,59,92,0.3)", borderRadius: 3, padding: "2px 10px", fontSize: "0.65rem", fontWeight: 700 }}>SUPER ADMIN</span>
              : <span style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 3, padding: "2px 10px", fontSize: "0.65rem", fontWeight: 700 }}>ADMIN</span>
            }
          </div>
          <p style={{ color: "#4A5568", fontSize: "0.82rem", margin: 0 }}>Platform management and analytics</p>
        </div>
        {lastUpdated && <div style={{ color: "#4A5568", fontSize: "0.72rem", alignSelf: "flex-end" }}>Updated {lastUpdated}</div>}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        {STAT_CARDS.map((c) => <StatCard key={c.label} label={c.label} value={c.value} color={c.color} />)}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #1C2236" }}>
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{ background: "transparent", border: "none", borderBottom: activeTab === key ? "2px solid #0066FF" : "2px solid transparent", padding: "10px 18px", marginBottom: -1, color: activeTab === key ? "#FFFFFF" : "#4A5568", fontSize: "0.85rem", fontWeight: activeTab === key ? 700 : 400, cursor: "pointer", transition: "color 150ms, border-color 150ms", whiteSpace: "nowrap" }}>
            {label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "users" && <UsersTab viewerRole={userRole} currentUserId={currentUserId} />}
        {activeTab === "signals" && <SignalsTab />}
        {activeTab === "articles" && <ArticlesTab />}
        {activeTab === "system" && <SystemTab />}
        {activeTab === "cron" && <CronJobsTab />}
      </div>
    </div>
  );
}
