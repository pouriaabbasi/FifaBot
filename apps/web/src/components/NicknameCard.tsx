import { useState } from "react";
import { api } from "../api";
import type { CurrentUser } from "../api";

export function NicknameCard({ user, onUpdated }: { user: CurrentUser; onUpdated: (user: CurrentUser) => void }) {
  const [value, setValue] = useState(user.nickname ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = value.trim();
  const changed = trimmed !== (user.nickname ?? "");

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateNickname(trimmed.length > 0 ? trimmed : null);
      onUpdated(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ثبت نام مستعار ناموفق بود");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="field-label" style={{ marginTop: 0 }}>
        نام مستعار
      </div>
      <p style={{ fontSize: "0.76rem", color: "var(--text-dim)", margin: "0 0 10px" }}>
        در همه لیگ‌ها به‌جای نام تلگرامت («{user.firstName}») نمایش داده می‌شود
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="form-field"
          style={{ marginBottom: 0 }}
          placeholder={user.firstName}
          value={value}
          maxLength={40}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          className="btn-gold"
          style={{ width: "auto", padding: "0 18px" }}
          disabled={!changed || saving}
          onClick={handleSave}
        >
          {saving ? "…" : "ذخیره"}
        </button>
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.78rem", marginTop: 8 }}>{error}</p>}
    </div>
  );
}
