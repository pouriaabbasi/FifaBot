import type { User } from "@prisma/client";

type UserLike = Pick<User, "nickname" | "firstName">;

// Isolates a name from the surrounding bidi context (LRI ... PDI) so a
// Latin name dropped into a Persian sentence — or vice versa — doesn't
// scramble the ordering of adjacent digits/punctuation (e.g. scores, list
// numbering) on RTL-first clients like Telegram.
function isolate(text: string) {
  return `⁦${text}⁩`;
}

function userLabel(user: UserLike) {
  return isolate(user.nickname ?? user.firstName);
}

/**
 * League-scoped team nickname wins. Otherwise: a solo team shows the
 * player's own nickname/name, a paired team shows "A و B".
 */
export function displayName(member: { nickname: string | null }, users: UserLike[]): string {
  if (member.nickname) return isolate(member.nickname);
  if (users.length === 0) return "?";
  if (users.length === 1) return userLabel(users[0]);
  return users.map(userLabel).join(" و ");
}
