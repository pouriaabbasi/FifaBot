import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { StandingsPage } from "./StandingsPage";
import { MatchesPage } from "./MatchesPage";
import { api } from "../api";
import type { League } from "../api";
import { getCurrentTelegramId, shareInviteLink } from "../telegram";

export function LeagueDetailPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [tab, setTab] = useState<"standings" | "matches">("standings");
  const [league, setLeague] = useState<League | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!leagueId) return;
    api.getLeagues().then((leagues) => {
      setLeague(leagues.find((l) => l.id === leagueId) ?? null);
    });
  }, [leagueId]);

  const isOwner = league && getCurrentTelegramId() === league.ownerId;

  async function handleStart() {
    if (!leagueId) return;
    setStarting(true);
    try {
      await api.generateFixture(leagueId);
      const leagues = await api.getLeagues();
      setLeague(leagues.find((l) => l.id === leagueId) ?? null);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div>
      {league && (
        <div className="screen-header">
          <div>
            <div className="screen-title">{league.name}</div>
            <div className="screen-sub">{league.members.length} بازیکن</div>
          </div>
        </div>
      )}

      {isOwner && league && league.status === "draft" && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn-gold" style={{ background: "none", border: "1.5px dashed rgba(232,183,63,0.4)", color: "var(--gold)", boxShadow: "none" }} onClick={() => shareInviteLink(league.inviteCode)}>
            🔗 اشتراک‌گذاری لینک دعوت
          </button>
          <button className="btn-gold" disabled={league.members.length < 2 || starting} onClick={handleStart}>
            {starting ? "در حال شروع…" : "شروع لیگ"}
          </button>
        </div>
      )}

      <div className="stage-tabs">
        <button className={`stage-tab${tab === "standings" ? " active" : ""}`} onClick={() => setTab("standings")}>
          جدول
        </button>
        <button className={`stage-tab${tab === "matches" ? " active" : ""}`} onClick={() => setTab("matches")}>
          بازی‌ها
        </button>
      </div>
      {tab === "standings" ? <StandingsPage key={leagueId} /> : <MatchesPage key={leagueId} />}
    </div>
  );
}
