import TelegramBot from "node-telegram-bot-api";
import { prisma } from "./prisma";
import type { Match, LeagueMember, League, User, LeagueMemberUser } from "@prisma/client";
import { displayName } from "./displayName";
import { computeStandings } from "./standings";

const NOTIFY_CONCURRENCY = 5;

async function runLimited<T>(items: T[], worker: (item: T) => Promise<void>) {
  let cursor = 0;
  async function next(): Promise<void> {
    const index = cursor++;
    if (index >= items.length) return;
    await worker(items[index]);
    await next();
  }
  await Promise.all(Array.from({ length: Math.min(NOTIFY_CONCURRENCY, items.length) }, next));
}

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
  await runLimited(userIds, async (userId) => {
    if (!client) return;
    try {
      await client.sendMessage(userId.toString(), text);
    } catch (err) {
      console.error("telegram broadcast failed", { userId: userId.toString(), leagueId, type: "member_joined", err });
    }
  });
}

export async function notifyMemberRemoved(leagueId: string, leagueName: string, removedMember: MemberWithUsers) {
  const name = memberLabel(removedMember);
  const text = `🚫 ${name} از لیگ «${leagueName}» حذف شد`;
  const members = await prisma.leagueMember.findMany({ where: { leagueId }, include: { users: true } });
  const client = getBot();
  const userIds = members.flatMap((m) => m.users.map((u) => u.userId));
  await runLimited(userIds, async (userId) => {
    if (!client) return;
    try {
      await client.sendMessage(userId.toString(), text);
    } catch (err) {
      console.error("telegram broadcast failed", { userId: userId.toString(), leagueId, type: "member_removed", err });
    }
  });
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
  const recipients = members.flatMap((m) => m.users.map((u) => ({ userId: u.userId, memberId: m.id })));
  await runLimited(recipients, async ({ userId, memberId }) => {
    if (!client) return;
    const text = `${resultLine}\n\n${standingsSummary(standings, memberId)}`;
    try {
      await client.sendMessage(userId.toString(), text);
    } catch (err) {
      console.error("telegram broadcast failed", { userId: userId.toString(), matchId: match.id, type: "result_confirmed", err });
    }
  });
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
  await runLimited(userIds, async (userId) => {
    if (!client) return;
    try {
      await client.sendMessage(userId.toString(), text);
    } catch (err) {
      console.error("telegram broadcast failed", { userId: userId.toString(), leagueId: league.id, type: "league_started", err });
    }
  });
}

export async function notifyCustomMessageToMany(leagueName: string, owner: User, targetUserIds: bigint[], text: string) {
  const ownerName = owner.nickname ?? owner.firstName;
  const message = `✉️ پیام از ادمین لیگ «${leagueName}» (${ownerName}):\n${text}`;
  const client = getBot();
  await runLimited(targetUserIds, async (userId) => {
    if (!client) return;
    try {
      await client.sendMessage(userId.toString(), message);
    } catch (err) {
      console.error("telegram custom message failed", { userId: userId.toString(), leagueName, err });
    }
  });
}

async function broadcastToLeague(leagueId: string, matchId: string, type: "result_confirmed", text: string) {
  const members = await prisma.leagueMember.findMany({ where: { leagueId }, include: { users: true } });
  const client = getBot();
  const userIds = members.flatMap((m) => m.users.map((u) => u.userId));
  await runLimited(userIds, async (userId) => {
    if (!client) return;
    try {
      await client.sendMessage(userId.toString(), text);
    } catch (err) {
      console.error("telegram broadcast failed", { userId: userId.toString(), matchId, type, err });
    }
  });
}

