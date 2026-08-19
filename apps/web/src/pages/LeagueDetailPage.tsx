import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { StandingsPage } from "./StandingsPage";
import { MatchesPage } from "./MatchesPage";
import { AdminMatchesPage } from "./AdminMatchesPage";
import { api } from "../api";
import type { League } from "../api";
import { getCurrentTelegramId, shareInviteLink } from "../telegram";
import { displayName } from "../displayName";

export function LeagueDetailPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [tab, setTab] = useState<"standings" | "matches" | "admin">("standings");
  const [league, setLeague] = useState<League | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pairingId, setPairingId] = useState<string | null>(null);

  async function reload() {
    if (!leagueId) return;
    const leagues = await api.getLeagues();
    setLeague(leagues.find((l) => l.id === leagueId) ?? null);
  }

  useEffect(() => {
    if (!leagueId) return;
    reload().finally(() => setLoaded(true));
  }, [leagueId]);

  if (!loaded) return <div className="loading-state">در حال بارگذاری…</div>;

  const isOwner = league && getCurrentTelegramId() === league.ownerId;
  const myTelegramId = getCurrentTelegramId();
  const myMembership = league?.members.find((m) => m.users.some((u) => u.userId === myTelegramId));
  const isTeamLeague = (league?.teamSize ?? 1) === 2;
  const incompleteTeams = league?.members.filter((m) => m.status === "incomplete") ?? [];
  const hasIncomplete = incompleteTeams.length > 0;

  async function handleStart() {
    if (!leagueId) return;
    setStarting(true);
    setStartError(null);
    try {
      await api.generateFixture(leagueId);
      await reload();
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "شروع لیگ ناموفق بود");
    } finally {
      setStarting(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!leagueId) return;
    setRemovingId(memberId);
    try {
      await api.removeMember(leagueId, memberId);
      await reload();
    } finally {
      setRemovingId(null);
    }
  }

  async function handlePair(targetMemberId: string, sourceMemberId?: string) {
    if (!leagueId) return;
    setPairingId(targetMemberId);
    try {
      await api.pairTeam(leagueId, targetMemberId, sourceMemberId);
      await reload();
    } finally {
      setPairingId(null);
    }
  }

  async function handleSetTeamName(memberId: string, name: string) {
    if (!leagueId) return;
    await api.setTeamName(leagueId, memberId, name.trim().length > 0 ? name.trim() : null);
    await reload();
  }

  return (
    <div>
      {league && (
        <div className="screen-header">
          <div>
            <div className="screen-title">{league.name}</div>
            <div className="screen-sub">{league.members.length} {isTeamLeague ? "تیم" : "بازیکن"}</div>
          </div>
        </div>
      )}

      {isOwner && league && league.status === "draft" && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn-gold" style={{ background: "none", border: "1.5px dashed rgba(232,183,63,0.4)", color: "var(--gold)", boxShadow: "none" }} onClick={() => shareInviteLink(league.inviteCode)}>
            🔗 اشتراک‌گذاری لینک دعوت
          </button>

          <div>
            <div className="field-label" style={{ margin: "2px 0 6px" }}>یا کد لیگ را برای دیگران بفرست</div>
            <div style={{ display: "flex", gap: 8 }}>
              <div
                className="date-input"
                style={{ flex: 1, fontFamily: "var(--display)", letterSpacing: "0.15em", textAlign: "center", fontSize: "1rem" }}
              >
                {league.inviteCode}
              </div>
              <button
                className="btn-gold"
                style={{ width: "auto", padding: "0 16px" }}
                onClick={() => navigator.clipboard?.writeText(league.inviteCode)}
              >
                کپی
              </button>
            </div>
          </div>

          <button className="btn-gold" disabled={league.members.length < 2 || hasIncomplete || starting} onClick={handleStart}>
            {starting ? "در حال شروع…" : hasIncomplete ? "ابتدا تیم‌ها را کامل کن" : "شروع لیگ"}
          </button>
          {startError && <p style={{ color: "var(--danger)", fontSize: "0.78rem", margin: 0 }}>{startError}</p>}
        </div>
      )}

      {isTeamLeague && league && league.status === "draft" && hasIncomplete && (
        <div className="card">
          <div className="field-label" style={{ marginTop: 0 }}>
            در انتظار هم‌تیمی ({incompleteTeams.length})
          </div>
          {incompleteTeams.map((m) => {
            const isMine = myMembership?.id === m.id;
            const iCanPair = myMembership?.status === "incomplete" && !isMine;
            return (
              <div key={m.id} className="match-row" style={{ padding: "8px 0" }}>
                <div className="side">
                  <div className="avatar">{displayName(m).charAt(0)}</div>
                  <span className="pname-sm">
                    {displayName(m)} {isMine && "(خودت)"}
                  </span>
                </div>
                {(iCanPair || isOwner) && !isMine && (
                  <button
                    className="btn-gold"
                    style={{ width: "auto", padding: "4px 12px", fontSize: "0.72rem" }}
                    disabled={pairingId === m.id}
                    onClick={() => handlePair(m.id, isOwner && !iCanPair ? undefined : myMembership?.id)}
                  >
                    {pairingId === m.id ? "…" : "هم‌تیمی شو"}
                  </button>
                )}
              </div>
            );
          })}
          {isOwner && incompleteTeams.length >= 2 && (
            <p style={{ fontSize: "0.72rem", color: "var(--text-dim)", margin: "8px 0 0" }}>
              به‌عنوان ادمین، با زدن «هم‌تیمی شو» روی هرکدام، آن‌ها را با یکدیگر جفت کن (اولین دو نفر انتخابی جفت می‌شوند)
            </p>
          )}
        </div>
      )}

      {myMembership && myMembership.status === "complete" && isTeamLeague && league?.status === "draft" && (
        <TeamNameCard member={myMembership} onSave={(name) => handleSetTeamName(myMembership.id, name)} />
      )}

      {league && league.status === "draft" && (
        <div className="card">
          <div className="field-label" style={{ marginTop: 0 }}>
            {isTeamLeague ? "تیم‌های کامل" : "بازیکنان"} ({league.members.filter((m) => m.status === "complete").length})
          </div>
          {league.members
            .filter((m) => m.status === "complete")
            .map((m) => (
              <div key={m.id} className="match-row" style={{ padding: "8px 0" }}>
                <div className="side">
                  <div className="avatar">{displayName(m).charAt(0)}</div>
                  <span className="pname-sm">{displayName(m)}</span>
                </div>
                {m.role === "owner" ? (
                  <span className="pill done">ادمین</span>
                ) : (
                  isOwner && (
                    <button
                      className="btn-gold"
                      style={{ width: "auto", padding: "4px 12px", fontSize: "0.72rem", background: "none", border: "1px solid var(--danger)", color: "var(--danger)", boxShadow: "none" }}
                      disabled={removingId === m.id}
                      onClick={() => handleRemoveMember(m.id)}
                    >
                      {removingId === m.id ? "…" : "حذف"}
                    </button>
                  )
                )}
              </div>
            ))}
        </div>
      )}

      <div className="stage-tabs">
        <button className={`stage-tab${tab === "standings" ? " active" : ""}`} onClick={() => setTab("standings")}>
          جدول
        </button>
        <button className={`stage-tab${tab === "matches" ? " active" : ""}`} onClick={() => setTab("matches")}>
          بازی‌ها
        </button>
        {isOwner && (
          <button className={`stage-tab${tab === "admin" ? " active" : ""}`} onClick={() => setTab("admin")}>
            ثبت نتیجه
          </button>
        )}
      </div>
      {tab === "standings" && <StandingsPage key={leagueId} />}
      {tab === "matches" && <MatchesPage key={leagueId} />}
      {tab === "admin" && isOwner && <AdminMatchesPage key={leagueId} />}
    </div>
  );
}

function TeamNameCard({ member, onSave }: { member: League["members"][number]; onSave: (name: string) => Promise<void> }) {
  const [value, setValue] = useState(member.nickname ?? "");
  const [saving, setSaving] = useState(false);

  const changed = value.trim() !== (member.nickname ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(value);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="field-label" style={{ marginTop: 0 }}>
        اسم تیم شما
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="form-field"
          style={{ marginBottom: 0 }}
          placeholder={displayName(member)}
          value={value}
          maxLength={40}
          onChange={(e) => setValue(e.target.value)}
        />
        <button className="btn-gold" style={{ width: "auto", padding: "0 18px" }} disabled={!changed || saving} onClick={handleSave}>
          {saving ? "…" : "ذخیره"}
        </button>
      </div>
    </div>
  );
}
