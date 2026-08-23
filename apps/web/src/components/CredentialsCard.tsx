import { useState } from "react";
import { api } from "../api";
import type { CurrentUser } from "../api";

export function CredentialsCard({ user, onUpdated }: { user: CurrentUser; onUpdated: (user: CurrentUser) => void }) {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState(user.loginUsername ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const usernameChanged = newUsername.trim() !== (user.loginUsername ?? "");
  const canSave = currentPassword.length > 0 && (usernameChanged || newPassword.length > 0);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await api.updateCredentials({
        currentPassword,
        ...(usernameChanged ? { newUsername: newUsername.trim() } : {}),
        ...(newPassword ? { newPassword } : {}),
      });
      onUpdated(updated);
      setCurrentPassword("");
      setNewPassword("");
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <button
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "inherit",
          font: "inherit",
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="field-label" style={{ margin: 0 }}>نام کاربری و رمز ورود مستقیم</span>
        <span style={{ color: "var(--gold)", fontSize: "0.8rem" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: "0.76rem", color: "var(--text-dim)", margin: "0 0 10px" }}>
            برای ورود از خارج تلگرام استفاده می‌شن
          </p>
          <input
            className="form-field"
            placeholder="نام کاربری جدید"
            value={newUsername}
            maxLength={32}
            onChange={(e) => setNewUsername(e.target.value)}
          />
          <input
            className="form-field"
            type="password"
            placeholder="رمز عبور جدید (اختیاری)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <input
            className="form-field"
            type="password"
            placeholder="رمز عبور فعلی"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          {error && <p style={{ color: "var(--danger)", fontSize: "0.78rem", margin: "0 0 8px" }}>{error}</p>}
          {success && <p style={{ color: "var(--gold)", fontSize: "0.78rem", margin: "0 0 8px" }}>ذخیره شد ✓</p>}
          <button className="btn-gold" disabled={!canSave || saving} onClick={handleSave}>
            {saving ? "…" : "ذخیره"}
          </button>
        </div>
      )}
    </div>
  );
}
