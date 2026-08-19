import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import type { Standing } from "../api";

export function StandingsPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [standings, setStandings] = useState<Standing[] | null>(null);

  useEffect(() => {
    if (!leagueId) return;
    api.getStandings(leagueId).then(setStandings).catch(() => setStandings([]));
  }, [leagueId]);

  if (standings === null) return <div className="loading-state">در حال بارگذاری…</div>;

  const leader = standings[0];

  return (
    <div>
      <div className="screen-header">
        <div>
          <div className="screen-title">جدول رده‌بندی</div>
          <div className="screen-sub">{standings.length} بازیکن</div>
        </div>
      </div>

      {standings.length === 0 ? (
        <div className="empty-state">هنوز بازی‌ای ثبت نشده</div>
      ) : (
        <div className="card" style={{ padding: "10px 6px" }}>
          <table className="standings-table">
            <thead>
              <tr>
                <th>بازیکن</th>
                <th>ب</th>
                <th>ت</th>
                <th>گل</th>
                <th>امت</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.memberId} className={i === 0 ? "top-row" : ""}>
                  <td>
                    <div className="rank-cell">
                      <span className={`rank-num${i === 0 ? " gold" : ""}`}>{i + 1}</span>
                      <div className="avatar">{s.name.charAt(0)}</div>
                      <span className="pname">{s.name}</span>
                    </div>
                  </td>
                  <td>{s.played}</td>
                  <td>{s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}</td>
                  <td>
                    {s.gf}-{s.ga}
                  </td>
                  <td className="pts-cell">{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {leader && (
        <>
          <div className="section-label">قهرمان فعلی</div>
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="avatar" style={{ width: 44, height: 44, fontSize: "1rem", borderColor: "var(--gold)" }}>
              {leader.name.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div className="pname" style={{ fontSize: "0.95rem" }}>
                {leader.name}
              </div>
              <div className="role-tag">
                {leader.gf} گل زده در {leader.played} بازی
              </div>
            </div>
            <div style={{ fontSize: "1.4rem" }}>🏆</div>
          </div>
        </>
      )}
    </div>
  );
}
