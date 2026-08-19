import { useState } from "react";
import { useParams } from "react-router-dom";
import { StandingsPage } from "./StandingsPage";
import { MatchesPage } from "./MatchesPage";

export function LeagueDetailPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [tab, setTab] = useState<"standings" | "matches">("standings");

  return (
    <div>
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
