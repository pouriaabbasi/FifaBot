import type { User } from "@prisma/client";

type UserLike = Pick<User, "nickname" | "firstName">;

function userLabel(user: UserLike) {
  return user.nickname ?? user.firstName;
}

/**
 * League-scoped team nickname wins. Otherwise: a solo team shows the
 * player's own nickname/name, a paired team shows "A و B".
 */
export function displayName(member: { nickname: string | null }, users: UserLike[]): string {
  if (member.nickname) return member.nickname;
  if (users.length === 0) return "?";
  if (users.length === 1) return userLabel(users[0]);
  return users.map(userLabel).join(" و ");
}
