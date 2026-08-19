import TelegramBot from "node-telegram-bot-api";
import { prisma } from "./prisma";
import type { Match, LeagueMember } from "@prisma/client";

let bot: TelegramBot | null = null;

export function getBot() {
  if (!bot && process.env.BOT_TOKEN) {
    bot = new TelegramBot(process.env.BOT_TOKEN);
  }
  return bot;
}

type MatchWithMembers = Match & { homeMember: LeagueMember; awayMember: LeagueMember };

export async function notifyNextMatch(match: MatchWithMembers) {
  await sendOnce(match.homeMember.userId, match.id, "next_match", `⚽ بازی جدید آماده است. حریف: بازیکن ${match.awayMemberId.slice(0, 6)}`);
  await sendOnce(match.awayMember.userId, match.id, "next_match", `⚽ بازی جدید آماده است. حریف: بازیکن ${match.homeMemberId.slice(0, 6)}`);
}

export async function notifyResultConfirmed(match: MatchWithMembers) {
  const text = `✅ نتیجه ثبت شد: ${match.homeScore} - ${match.awayScore}`;
  await sendOnce(match.homeMember.userId, match.id, "result_confirmed", text);
  await sendOnce(match.awayMember.userId, match.id, "result_confirmed", text);
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
