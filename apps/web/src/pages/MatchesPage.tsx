import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import type { Match } from "../api";

export function MatchesPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [pending, setPending] = useState<Match[] | null>(null);
  const [played, setPlayed] = useState<Match[] | null>(null);

  useEffect(() => {
    if (!leagueId) return;
    api.getMatches(leagueId, { status: "pending", mine: true }).then(setPending).catch(() => setPending([]));
    api.getMatches(leagueId, { status: "played", mine: true }).then(setPlayed).catch(() => setPlayed([]));
  }, [leagueId]);

  const name = (m: Match, side: "home" | "away") =>
    side === "home" ? m.homeMember.nickname ?? m.homeMember.user.firstName : m.awayMember.nickname ?? m.awayMember.user.firstName;

  return (
    <div>
      <div className="screen-header">
        <div>
          <div className="screen-title">بازی‌های من</div>
          <div className="screen-sub">هر زمان آماده‌ای بازی کن</div>
        </div>
      </div>

      <div className="section-label">در انتظار</div>
      {pending === null ? (
        <div className="loading-state">…</div>
      ) : pending.length === 0 ? (
        <div className="empty-state">بازی در انتظاری نداری</div>
      ) : (
        <div className="card">
          {pending.map((m) => (
            <Link key={m.id} to={`/leagues/${leagueId}/matches/${m.id}/result`} className="match-row" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="side">
                <div className="avatar">{name(m, "home").charAt(0)}</div>
                <span className="pname-sm">{name(m, "home")}</span>
              </div>
              <div className="vs-box">
                <span className="vs-text">مقابل</span>
                <span className="pill draft">در انتظار</span>
              </div>
              <div className="side right">
                <div className="avatar">{name(m, "away").charAt(0)}</div>
                <span className="pname-sm">{name(m, "away")}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="section-label">بازی‌شده</div>
      {played === null ? (
        <div className="loading-state">…</div>
      ) : played.length === 0 ? (
        <div className="empty-state">هنوز بازی‌ای انجام نشده</div>
      ) : (
        <div className="card">
          {played.map((m) => (
            <div key={m.id} className="match-row">
              <div className="side">
                <div className="avatar">{name(m, "home").charAt(0)}</div>
                <span className="pname-sm">{name(m, "home")}</span>
              </div>
              <div className="vs-box">
                <div className="score-box">
                  {m.homeScore}
                  <span className="sep">-</span>
                  {m.awayScore}
                </div>
              </div>
              <div className="side right">
                <div className="avatar">{name(m, "away").charAt(0)}</div>
                <span className="pname-sm">{name(m, "away")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
