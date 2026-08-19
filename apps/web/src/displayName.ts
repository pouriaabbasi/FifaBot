interface MemberLike {
  nickname: string | null;
  user: { firstName: string; nickname: string | null };
}

/** League-scoped nickname wins, then the user's global nickname, then their Telegram first name. */
export function displayName(member: MemberLike): string {
  return member.nickname ?? member.user.nickname ?? member.user.firstName;
}
