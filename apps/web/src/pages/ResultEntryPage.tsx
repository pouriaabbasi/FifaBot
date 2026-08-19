import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

export function ResultEntryPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [homeScore, setHomeScore] = useState("0");
  const [awayScore, setAwayScore] = useState("0");
  const [playedAt, setPlayedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!matchId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.submitResult(matchId, Number(homeScore), Number(awayScore), playedAt);
      navigate(-1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="screen-header">
        <div>
          <div className="screen-title">ثبت نتیجه</div>
          <div className="screen-sub">فقط ادمین لیگ دسترسی دارد</div>
        </div>
      </div>

      <div className="card player-input-card">
        <div className="player-badge">میزبان</div>
        <div className="player-name-role">
          <div className="pname" style={{ fontSize: "0.9rem" }}>میزبان</div>
          <div className="role-tag">تیم اول</div>
        </div>
        <input
          className="score-input"
          type="number"
          min={0}
          value={homeScore}
          onChange={(e) => setHomeScore(e.target.value)}
        />
      </div>

      <div className="card player-input-card">
        <div className="player-badge">میهمان</div>
        <div className="player-name-role">
          <div className="pname" style={{ fontSize: "0.9rem" }}>میهمان</div>
          <div className="role-tag">تیم دوم</div>
        </div>
        <input
          className="score-input"
          type="number"
          min={0}
          value={awayScore}
          onChange={(e) => setAwayScore(e.target.value)}
        />
      </div>

      <div className="field-label">تاریخ انجام بازی</div>
      <input
        className="date-input"
        type="date"
        value={playedAt}
        onChange={(e) => setPlayedAt(e.target.value)}
      />

      {error && (
        <p style={{ color: "var(--danger)", fontSize: "0.78rem", marginTop: 10 }}>{error}</p>
      )}

      <div style={{ marginTop: 22 }}>
        <button className="btn-gold" disabled={submitting} onClick={handleSubmit}>
          {submitting ? "در حال ثبت…" : "ثبت نهایی نتیجه"}
        </button>
      </div>

      <p style={{ textAlign: "center", color: "var(--text-faint)", fontSize: "0.7rem", marginTop: 10 }}>
        پس از ثبت، اعلان به هر دو بازیکن ارسال می‌شود
      </p>
    </div>
  );
}
