import TelegramBot from "node-telegram-bot-api";
import { prisma } from "./prisma";
import type { Match, LeagueMember, User } from "@prisma/client";

let bot: TelegramBot | null = null;

export function getBot() {
  if (!bot && process.env.BOT_TOKEN) {
    bot = new TelegramBot(process.env.BOT_TOKEN);
  }
  return bot;
}

type MemberWithUser = LeagueMember & { user: User };
type MatchWithMembers = Match & { homeMember: MemberWithUser; awayMember: MemberWithUser };

function memberLabel(member: MemberWithUser) {
  return member.nickname ?? member.user.firstName;
}

export async function notifyNextMatch(match: MatchWithMembers) {
  const homeName = memberLabel(match.homeMember);
  const awayName = memberLabel(match.awayMember);
  const text = `⚽ بازی جدید آماده است: ${homeName} مقابل ${awayName}`;
  await sendOnce(match.homeMember.userId, match.id, "next_match", text);
  await sendOnce(match.awayMember.userId, match.id, "next_match", text);
}

export async function notifyResultConfirmed(match: MatchWithMembers, leagueId: string) {
  const homeName = memberLabel(match.homeMember);
  const awayName = memberLabel(match.awayMember);
  const text = `✅ نتیجه ثبت شد: ${homeName} ${match.homeScore} - ${match.awayScore} ${awayName}`;

  const members = await prisma.leagueMember.findMany({ where: { leagueId } });
  await Promise.all(members.map((m) => sendOnce(m.userId, match.id, "result_confirmed", text)));
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
