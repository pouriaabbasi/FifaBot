interface UserLike {
  firstName: string;
  nickname: string | null;
}

interface MemberLike {
  nickname: string | null;
  users: { user: UserLike }[];
}

function userLabel(user: UserLike) {
  return user.nickname ?? user.firstName;
}

/**
 * League-scoped team nickname wins. Otherwise: a solo team shows the
 * player's own nickname/name, a paired team shows "A و B".
 */
export function displayName(member: MemberLike): string {
  if (member.nickname) return member.nickname;
  const names = member.users.map((u) => userLabel(u.user));
  if (names.length === 0) return "?";
  return names.join(" و ");
}
