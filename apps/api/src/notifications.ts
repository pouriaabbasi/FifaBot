import TelegramBot from "node-telegram-bot-api";
import { prisma } from "./prisma";
import type { Match, LeagueMember, League, User, LeagueMemberUser } from "@prisma/client";
import { displayName } from "./displayName";
import { computeStandings } from "./standings";

let bot: TelegramBot | null = null;

export function getBot() {
  if (!bot && process.env.BOT_TOKEN) {
    bot = new TelegramBot(process.env.BOT_TOKEN);
  }
  return bot;
}

type MemberWithUsers = LeagueMember & { users: (LeagueMemberUser & { user: User })[] };
type MatchWithMembers = Match & { homeMember: MemberWithUsers; awayMember: MemberWithUsers };

function memberLabel(member: MemberWithUsers) {
  return displayName(member, member.users.map((u) => u.user));
}

function memberUserIds(member: MemberWithUsers) {
  return member.users.map((u) => u.userId);
}

export async function notifyNextMatch(match: MatchWithMembers) {
  const homeName = memberLabel(match.homeMember);
  const awayName = memberLabel(match.awayMember);
  const text = `⚽ بازی جدید آماده است: ${homeName} مقابل ${awayName}`;
  await Promise.all([
    ...memberUserIds(match.homeMember).map((userId) => sendOnce(userId, match.id, "next_match", text)),
    ...memberUserIds(match.awayMember).map((userId) => sendOnce(userId, match.id, "next_match", text)),
  ]);
}

export async function notifyResultConfirmed(match: MatchWithMembers, leagueId: string) {
  const homeName = memberLabel(match.homeMember);
  const awayName = memberLabel(match.awayMember);
  const resultLine = `✅ نتیجه ثبت شد: ${homeName} ${match.homeScore} - ${match.awayScore} ${awayName}`;
  await broadcastResultWithStandings(leagueId, match, resultLine);
}

export async function notifyResultUpdated(match: MatchWithMembers, leagueId: string) {
  const homeName = memberLabel(match.homeMember);
  const awayName = memberLabel(match.awayMember);
  const resultLine = `✏️ نتیجه ویرایش شد: ${homeName} ${match.homeScore} - ${match.awayScore} ${awayName}`;
  await broadcastResultWithStandings(leagueId, match, resultLine);
}

export async function notifyResultCleared(match: MatchWithMembers, leagueId: string) {
  const homeName = memberLabel(match.homeMember);
  const awayName = memberLabel(match.awayMember);
  const text = `🗑 نتیجه حذف شد: ${homeName} مقابل ${awayName} — بازی دوباره در انتظار ثبت است`;
  await broadcastToLeague(leagueId, match.id, "result_confirmed", text);
}

export async function notifyMemberJoined(leagueId: string, leagueName: string, newMember: MemberWithUsers) {
  const name = memberLabel(newMember);
  const text = `👋 ${name} به لیگ «${leagueName}» پیوست`;
  const joinedUserIds = new Set(memberUserIds(newMember).map((id) => id.toString()));
  const members = await prisma.leagueMember.findMany({ where: { leagueId }, include: { users: true } });
  const client = getBot();
  const userIds = members.flatMap((m) => m.users.map((u) => u.userId)).filter((id) => !joinedUserIds.has(id.toString()));
  await Promise.all(
    userIds.map(async (userId) => {
      if (!client) return;
      try {
        await client.sendMessage(userId.toString(), text);
      } catch (err) {
        console.error("telegram broadcast failed", { userId: userId.toString(), leagueId, type: "member_joined", err });
      }
    })
  );
}

export async function notifyMemberRemoved(leagueId: string, leagueName: string, removedMember: MemberWithUsers) {
  const name = memberLabel(removedMember);
  const text = `🚫 ${name} از لیگ «${leagueName}» حذف شد`;
  const members = await prisma.leagueMember.findMany({ where: { leagueId }, include: { users: true } });
  const client = getBot();
  const userIds = members.flatMap((m) => m.users.map((u) => u.userId));
  await Promise.all(
    userIds.map(async (userId) => {
      if (!client) return;
      try {
        await client.sendMessage(userId.toString(), text);
      } catch (err) {
        console.error("telegram broadcast failed", { userId: userId.toString(), leagueId, type: "member_removed", err });
      }
    })
  );
}

function standingsSummary(standings: Awaited<ReturnType<typeof computeStandings>>, memberId: string) {
  const top3 = standings.slice(0, 3);
  const lines = top3.map((s, i) => `${i + 1}. ${s.name} — ${s.points} امتیاز`);
  const ownIndex = standings.findIndex((s) => s.memberId === memberId);
  if (ownIndex >= 3) {
    lines.push(`…`, `${ownIndex + 1}. ${standings[ownIndex].name} — ${standings[ownIndex].points} امتیاز`);
  }
  return `📊 جدول رده‌بندی:\n${lines.join("\n")}`;
}

async function broadcastResultWithStandings(leagueId: string, match: MatchWithMembers, resultLine: string) {
  const standings = await computeStandings(match.stageId);
  const members = await prisma.leagueMember.findMany({ where: { leagueId }, include: { users: true } });
  const client = getBot();
  await Promise.all(
    members.map(async (m) => {
      const text = `${resultLine}\n\n${standingsSummary(standings, m.id)}`;
      for (const { userId } of m.users) {
        if (!client) continue;
        try {
          await client.sendMessage(userId.toString(), text);
        } catch (err) {
          console.error("telegram broadcast failed", { userId: userId.toString(), matchId: match.id, type: "result_confirmed", err });
        }
      }
    })
  );
}

export async function notifyLeagueStarted(league: League, owner: User, members: MemberWithUsers[]) {
  const ownerHandle = owner.username ? `@${owner.username}` : owner.telegramId.toString();
  const ownerName = owner.nickname ?? owner.firstName;
  const text = [
    `🚀 لیگ «${league.name}» استارت شد!`,
    `از امروز می‌تونید بازی‌هاتون رو انجام بدید.`,
    `نتیجه هر بازی رو باید به ادمین لیگ (${ownerName} — ${ownerHandle}) بگید تا توی سیستم ثبت کنه.`,
  ].join("\n");
  const client = getBot();
  const userIds = members.flatMap((m) => m.users.map((u) => u.userId));
  await Promise.all(
    userIds.map(async (userId) => {
      if (!client) return;
      try {
        await client.sendMessage(userId.toString(), text);
      } catch (err) {
        console.error("telegram broadcast failed", { userId: userId.toString(), leagueId: league.id, type: "league_started", err });
      }
    })
  );
}

export async function notifyCustomMessage(leagueName: string, owner: User, targetUserId: bigint, text: string) {
  const ownerName = owner.nickname ?? owner.firstName;
  const message = `✉️ پیام از ادمین لیگ «${leagueName}» (${ownerName}):\n${text}`;
  const client = getBot();
  if (!client) throw new Error("BOT_TOKEN not configured");
  await client.sendMessage(targetUserId.toString(), message);
}

async function broadcastToLeague(leagueId: string, matchId: string, type: "next_match" | "result_confirmed", text: string) {
  const members = await prisma.leagueMember.findMany({ where: { leagueId }, include: { users: true } });
  const client = getBot();
  const userIds = members.flatMap((m) => m.users.map((u) => u.userId));
  await Promise.all(
    userIds.map(async (userId) => {
      if (!client) return;
      try {
        await client.sendMessage(userId.toString(), text);
      } catch (err) {
        console.error("telegram broadcast failed", { userId: userId.toString(), matchId, type, err });
      }
    })
  );
}

async function sendOnce(userId: bigint, matchId: string, type: "next_match" | "result_confirmed", text: string) {
  const existing = await prisma.notification.findUnique({
    where: { userId_matchId_type: { userId, matchId, type } },
  });
  // Only skip if it already went through — a previously failed attempt is retried.
  if (existing?.delivered) return;

  const client = getBot();
  if (!client) {
    await upsertNotification(userId, matchId, type, false, "BOT_TOKEN not configured");
    return;
  }

  try {
    await client.sendMessage(userId.toString(), text);
    await upsertNotification(userId, matchId, type, true, null);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("telegram notify failed", { userId: userId.toString(), matchId, type, message });
    await upsertNotification(userId, matchId, type, false, message);
  }
}

async function upsertNotification(
  userId: bigint,
  matchId: string,
  type: "next_match" | "result_confirmed",
  delivered: boolean,
  error: string | null
) {
  await prisma.notification.upsert({
    where: { userId_matchId_type: { userId, matchId, type } },
    update: { delivered, error, sentAt: new Date() },
    create: { userId, matchId, type, delivered, error },
  });
}
