import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { AuthedRequest, requireAuth } from "../authMiddleware";
import { serializeBigInt } from "../serialize";

export const profileRouter = Router();
profileRouter.use(requireAuth);

profileRouter.get("/me", async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { telegramId: BigInt(req.auth!.telegramId) } });
  if (!user) return res.status(404).json({ error: "user not found" });
  res.json(serializeBigInt(user));
});

const nicknameSchema = z.object({ nickname: z.string().trim().max(40).nullable() });

profileRouter.patch("/nickname", async (req: AuthedRequest, res) => {
  const parsed = nicknameSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const nickname = parsed.data.nickname && parsed.data.nickname.length > 0 ? parsed.data.nickname : null;

  const user = await prisma.user.update({
    where: { telegramId: BigInt(req.auth!.telegramId) },
    data: { nickname },
  });
  res.json(serializeBigInt(user));
});

profileRouter.get("/stats", async (req: AuthedRequest, res) => {
  const userId = BigInt(req.auth!.telegramId);

  const memberships = await prisma.leagueMember.findMany({
    where: { users: { some: { userId } } },
    include: { league: true },
  });

  const leaguesJoined = memberships.length;
  const leaguesActive = memberships.filter((m) => m.league.status === "active").length;
  const leaguesOwned = memberships.filter((m) => m.role === "owner").length;

  const memberIds = memberships.map((m) => m.id);
  const matches = await prisma.match.findMany({
    where: {
      status: "played",
      OR: [{ homeMemberId: { in: memberIds } }, { awayMemberId: { in: memberIds } }],
    },
  });

  let played = 0, won = 0, drawn = 0, lost = 0, goalsFor = 0, goalsAgainst = 0;
  for (const match of matches) {
    const isHome = memberIds.includes(match.homeMemberId);
    const scored = isHome ? match.homeScore! : match.awayScore!;
    const conceded = isHome ? match.awayScore! : match.homeScore!;
    played++;
    goalsFor += scored;
    goalsAgainst += conceded;
    if (scored > conceded) won++;
    else if (scored === conceded) drawn++;
    else lost++;
  }

  res.json(
    serializeBigInt({
      leaguesJoined,
      leaguesActive,
      leaguesOwned,
      played,
      won,
      drawn,
      lost,
      goalsFor,
      goalsAgainst,
      winRate: played > 0 ? Math.round((won / played) * 100) : 0,
      avgGoalsFor: played > 0 ? Number((goalsFor / played).toFixed(2)) : 0,
      avgGoalsAgainst: played > 0 ? Number((goalsAgainst / played).toFixed(2)) : 0,
    })
  );
});
