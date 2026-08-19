import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import type { Match } from "../api";

export function ResultEntryPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [homeScore, setHomeScore] = useState("0");
  const [awayScore, setAwayScore] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) return;
    api.getMatch(matchId).then(setMatch).catch(() => setMatch(null));
  }, [matchId]);

  async function handleSubmit() {
    if (!matchId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.submitResult(matchId, Number(homeScore), Number(awayScore));
      navigate(-1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const homeName = match ? match.homeMember.nickname ?? match.homeMember.user.firstName : "…";
  const awayName = match ? match.awayMember.nickname ?? match.awayMember.user.firstName : "…";

  return (
    <div>
      <div className="screen-header">
        <div>
          <div className="screen-title">ثبت نتیجه</div>
          <div className="screen-sub">فقط ادمین لیگ دسترسی دارد</div>
        </div>
      </div>

      <div className="card player-input-card">
        <div className="player-badge">{homeName.charAt(0)}</div>
        <div className="player-name-role">
          <div className="pname" style={{ fontSize: "0.9rem" }}>{homeName}</div>
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
        <div className="player-badge">{awayName.charAt(0)}</div>
        <div className="player-name-role">
          <div className="pname" style={{ fontSize: "0.9rem" }}>{awayName}</div>
        </div>
        <input
          className="score-input"
          type="number"
          min={0}
          value={awayScore}
          onChange={(e) => setAwayScore(e.target.value)}
        />
      </div>

      {error && (
        <p style={{ color: "var(--danger)", fontSize: "0.78rem", marginTop: 10 }}>{error}</p>
      )}

      <div style={{ marginTop: 22 }}>
        <button className="btn-gold" disabled={submitting || !match} onClick={handleSubmit}>
          {submitting ? "در حال ثبت…" : "ثبت نهایی نتیجه"}
        </button>
      </div>

      <p style={{ textAlign: "center", color: "var(--text-faint)", fontSize: "0.7rem", marginTop: 10 }}>
        تاریخ و ساعت لحظه ثبت به‌عنوان زمان بازی ذخیره می‌شود. پس از ثبت، اعلان به هر دو بازیکن ارسال می‌شود
      </p>
    </div>
  );
}
