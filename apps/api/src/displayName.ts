import type { User } from "@prisma/client";

/** League-scoped nickname wins, then the user's global nickname, then their Telegram first name. */
export function displayName(member: { nickname: string | null }, user: Pick<User, "nickname" | "firstName">) {
  return member.nickname ?? user.nickname ?? user.firstName;
}
