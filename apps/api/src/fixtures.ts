interface Pairing {
  homeMemberId: string;
  awayMemberId: string;
  round: number | null;
}

/**
 * Round-robin via the circle method: fixes player 0, rotates the rest.
 * Produces a home/away pairing for every unique pair — no explicit "round"
 * ordering is kept since match order is player-driven, not fixed.
 */
export function generateRoundRobin(memberIds: string[]): Pairing[] {
  const ids = [...memberIds];
  const bye = ids.length % 2 === 1 ? "BYE" : null;
  if (bye) ids.push(bye);

  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const pairings: Pairing[] = [];

  const rotating = ids.slice(1);
  for (let r = 0; r < rounds; r++) {
    const round = [ids[0], ...rotating];
    for (let i = 0; i < half; i++) {
      const a = round[i];
      const b = round[n - 1 - i];
      if (a !== bye && b !== bye) {
        pairings.push({ homeMemberId: a, awayMemberId: b, round: null });
      }
    }
    rotating.push(rotating.shift()!);
  }

  return pairings;
}

/** Round-robin home+away (double round-robin): mirror the single round-robin pairings. */
export function generateHomeAndAway(memberIds: string[]): Pairing[] {
  const single = generateRoundRobin(memberIds);
  const reverse = single.map((p) => ({
    homeMemberId: p.awayMemberId,
    awayMemberId: p.homeMemberId,
    round: null,
  }));
  return [...single, ...reverse];
}

/**
 * Single-elimination bracket, round 1 only. Byes are given to a random
 * subset when the player count isn't a power of two; later rounds are
 * generated on-demand once round 1 results are in (see advance logic).
 */
export function generateKnockoutRound1(memberIds: string[]): Pairing[] {
  const shuffled = [...memberIds].sort(() => Math.random() - 0.5);
  const pairings: Pairing[] = [];
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    pairings.push({ homeMemberId: shuffled[i], awayMemberId: shuffled[i + 1], round: 1 });
  }
  return pairings;
}
