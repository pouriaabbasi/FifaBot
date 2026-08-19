import { useEffect, useState } from "react";
import { api } from "../api";
import type { ProfileStats } from "../api";
import { WinLossDonut } from "../components/WinLossDonut";

export function ProfilePage() {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getProfileStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "خطا در دریافت آمار"));
  }, []);

  return (
    <div>
      <div className="screen-header">
        <div>
          <div className="screen-title">پروفایل</div>
          <div className="screen-sub">آمار کلی در همه لیگ‌ها</div>
        </div>
      </div>

      {error && <div className="empty-state">{error}</div>}
      {!error && !stats && <div className="loading-state">در حال بارگذاری…</div>}

      {stats && (
        <>
          <div className="grid-2-stat">
            <StatTile label="لیگ فعال" value={stats.leaguesActive} />
            <StatTile label="عضو لیگ" value={stats.leaguesJoined} />
            <StatTile label="مدیر لیگ" value={stats.leaguesOwned} />
            <StatTile label="بازی انجام‌شده" value={stats.played} />
          </div>

          <div className="section-label">نتایج بازی‌ها</div>
          <div className="card">
            {stats.played === 0 ? (
              <div className="empty-state" style={{ padding: "12px 0" }}>
                هنوز بازی‌ای ثبت نشده
              </div>
            ) : (
              <WinLossDonut won={stats.won} drawn={stats.drawn} lost={stats.lost} />
            )}
          </div>

          <div className="section-label">میانگین گل</div>
          <div className="card" style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
            <div>
              <div style={{ fontFamily: "var(--display)", fontSize: "1.5rem", fontWeight: 600, color: "var(--gold)" }}>
                {stats.avgGoalsFor}
              </div>
              <div className="role-tag">گل زده در هر بازی</div>
            </div>
            <div style={{ width: 1, background: "var(--card-border)" }} />
            <div>
              <div style={{ fontFamily: "var(--display)", fontSize: "1.5rem", fontWeight: 600 }}>
                {stats.avgGoalsAgainst}
              </div>
              <div className="role-tag">گل خورده در هر بازی</div>
            </div>
            <div style={{ width: 1, background: "var(--card-border)" }} />
            <div>
              <div style={{ fontFamily: "var(--display)", fontSize: "1.5rem", fontWeight: 600, color: "var(--live)" }}>
                {stats.winRate}٪
              </div>
              <div className="role-tag">درصد برد</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="card stat-tile">
      <div className="stat-tile-value">{value}</div>
      <div className="stat-tile-label">{label}</div>
    </div>
  );
}
