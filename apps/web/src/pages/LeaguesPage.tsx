import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import type { League } from "../api";
import { JoinByCodeCard } from "../components/JoinByCodeCard";
import { getTelegramWebApp } from "../telegram";

function DebugPanel() {
  const webApp = getTelegramWebApp();
  const info = {
    href: window.location.href,
    initData: webApp?.initData ?? null,
    initDataUnsafe: webApp?.initDataUnsafe ?? null,
  };
  return (
    <pre
      style={{
        fontSize: "0.62rem",
        background: "rgba(0,0,0,0.4)",
        padding: 10,
        borderRadius: 8,
        marginBottom: 14,
        direction: "ltr",
        textAlign: "left",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        maxHeight: 220,
        overflow: "auto",
      }}
    >
      {JSON.stringify(info, null, 2)}
    </pre>
  );
}

const statusPill: Record<League["status"], { label: string; cls: string }> = {
  draft: { label: "پیش‌نویس", cls: "draft" },
  active: { label: "فعال", cls: "live" },
  finished: { label: "پایان", cls: "done" },
};

const formatLabel: Record<string, string> = {
  round_robin: "رفت و برگشت",
  knockout: "حذفی",
};

export function LeaguesPage({ inviteError }: { inviteError?: string | null } = {}) {
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getLeagues()
      .then(setLeagues)
      .catch((err) => setError(err instanceof Error ? err.message : "خطا در دریافت لیگ‌ها"));
  }, []);

  if (error) {
    return (
      <div className="empty-state">
        <p>{error}</p>
        <button className="btn-gold" style={{ marginTop: 14 }} onClick={() => window.location.reload()}>
          تلاش دوباره
        </button>
      </div>
    );
  }

  if (leagues === null) return <div className="loading-state">در حال بارگذاری…</div>;

  const active = leagues.filter((l) => l.status !== "finished");
  const finished = leagues.filter((l) => l.status === "finished");

  return (
    <div>
      <DebugPanel />
      <div className="screen-header">
        <div>
          <div className="screen-title">لیگ‌های من</div>
          <div className="screen-sub">{active.length} لیگ فعال · عضو {leagues.length} لیگ</div>
        </div>
      </div>

      {inviteError && (
        <div className="card" style={{ borderColor: "var(--danger)" }}>
          <p style={{ color: "var(--danger)", fontSize: "0.84rem", margin: 0 }}>
            پیوستن با لینک دعوت ناموفق بود: {inviteError}
          </p>
        </div>
      )}

      {active.length > 0 && (
        <>
          <div className="section-label">در جریان</div>
          {active.map((league) => (
            <LeagueCard key={league.id} league={league} />
          ))}
        </>
      )}

      {finished.length > 0 && (
        <>
          <div className="section-label">تمام‌شده</div>
          {finished.map((league) => (
            <LeagueCard key={league.id} league={league} />
          ))}
        </>
      )}

      {leagues.length === 0 && <div className="empty-state">هنوز عضو هیچ لیگی نیستی</div>}

      <JoinByCodeCard onJoined={(leagueId) => navigate(`/leagues/${leagueId}`)} />

      <button className="fab-add" onClick={() => navigate("/leagues/new")}>
        ＋ ساخت لیگ جدید
      </button>
    </div>
  );
}

function LeagueCard({ league }: { league: League }) {
  const pill = statusPill[league.status];
  const primaryFormat = league.stages[0]?.format ? formatLabel[league.stages[0].format] : "";
  return (
    <Link to={`/leagues/${league.id}`} className="card league-card">
      <div className="league-crest">{league.name.charAt(0)}</div>
      <div className="league-info">
        <div className="league-name">{league.name}</div>
        <div className="league-meta">
          {league.members.length} بازیکن
          <span className="dot" />
          {league.isTwoStage ? "دو‌مرحله‌ای" : primaryFormat}
        </div>
      </div>
      <span className={`pill ${pill.cls}`}>{pill.label}</span>
    </Link>
  );
}
