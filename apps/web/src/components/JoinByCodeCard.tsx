import { useState } from "react";
import { api } from "../api";

export function JoinByCodeCard({ onJoined }: { onJoined: (leagueId: string) => void }) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    const trimmed = code.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const { league } = await api.joinLeague(trimmed);
      onJoined(league.id);
    } catch {
      setError("کد نامعتبر است یا لیگ قبلا شروع شده");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="field-label" style={{ marginTop: 0 }}>
        عضویت با کد لیگ
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="form-field"
          style={{ marginBottom: 0 }}
          placeholder="کد لیگ را وارد کن"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button className="btn-gold" style={{ width: "auto", padding: "0 18px" }} disabled={!code.trim() || submitting} onClick={handleJoin}>
          {submitting ? "…" : "ورود"}
        </button>
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.78rem", marginTop: 8 }}>{error}</p>}
    </div>
  );
}
