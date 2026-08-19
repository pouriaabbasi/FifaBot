import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import type { Match } from "../api";
import { displayName } from "../displayName";

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
    api
      .getMatch(matchId)
      .then((m) => {
        setMatch(m);
        if (m.status === "played") {
          setHomeScore(String(m.homeScore ?? 0));
          setAwayScore(String(m.awayScore ?? 0));
        }
      })
      .catch(() => setMatch(null));
  }, [matchId]);

  const isEditing = match?.status === "played";

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

  const homeName = match ? displayName(match.homeMember) : "…";
  const awayName = match ? displayName(match.awayMember) : "…";

  return (
    <div>
      <div className="screen-header">
        <div>
          <div className="screen-title">{isEditing ? "ویرایش نتیجه" : "ثبت نتیجه"}</div>
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
          onFocus={(e) => e.target.select()}
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
          onFocus={(e) => e.target.select()}
          onChange={(e) => setAwayScore(e.target.value)}
        />
      </div>

      {error && (
        <p style={{ color: "var(--danger)", fontSize: "0.78rem", marginTop: 10 }}>{error}</p>
      )}

      <div style={{ marginTop: 22 }}>
        <button className="btn-gold" disabled={submitting || !match} onClick={handleSubmit}>
          {submitting ? "در حال ثبت…" : isEditing ? "ثبت ویرایش" : "ثبت نهایی نتیجه"}
        </button>
      </div>

      <p style={{ textAlign: "center", color: "var(--text-faint)", fontSize: "0.7rem", marginTop: 10 }}>
        {isEditing
          ? "پس از ویرایش، اعلان به همه اعضای لیگ ارسال می‌شود"
          : "تاریخ و ساعت لحظه ثبت به‌عنوان زمان بازی ذخیره می‌شود. پس از ثبت، اعلان به همه اعضای لیگ ارسال می‌شود"}
      </p>
    </div>
  );
}
