interface UserLike {
  firstName: string;
  nickname: string | null;
}

interface MemberLike {
  nickname: string | null;
  users: { user: UserLike }[];
}

// Isolates a name from the surrounding bidi context (LRI ... PDI) so a
// Latin name mixed into Persian UI text doesn't scramble the ordering of
// adjacent digits/punctuation (scores, list numbering, etc.).
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
export function displayName(member: MemberLike): string {
  if (member.nickname) return isolate(member.nickname);
  const names = member.users.map((u) => userLabel(u.user));
  if (names.length === 0) return "?";
  return names.join(" و ");
}
