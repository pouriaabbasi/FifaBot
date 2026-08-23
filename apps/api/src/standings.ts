import { prisma } from "./prisma";
import { displayName } from "./displayName";

export async function computeStandings(stageId: string) {
  const members = await prisma.leagueMember.findMany({
    where: { OR: [{ homeMatches: { some: { stageId } } }, { awayMatches: { some: { stageId } } }] },
    include: { users: { include: { user: true } } },
  });
  const matches = await prisma.match.findMany({ where: { stageId, status: "played" } });

  const table = members.map((m) => {
    let played = 0, won = 0, drawn = 0, lost = 0, gf = 0, ga = 0;
    for (const match of matches) {
      const isHome = match.homeMemberId === m.id;
      const isAway = match.awayMemberId === m.id;
      if (!isHome && !isAway) continue;
      played++;
      const scored = isHome ? match.homeScore! : match.awayScore!;
      const conceded = isHome ? match.awayScore! : match.homeScore!;
      gf += scored;
      ga += conceded;
      if (scored > conceded) won++;
      else if (scored === conceded) drawn++;
      else lost++;
    }
    return {
      memberId: m.id,
      memberUserIds: m.users.map((u) => u.userId.toString()),
      name: displayName(m, m.users.map((u) => u.user)),
      played, won, drawn, lost, gf, ga,
      goalDiff: gf - ga,
      points: won * 3 + drawn,
    };
  });

  return table.sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.gf - a.gf);
}
