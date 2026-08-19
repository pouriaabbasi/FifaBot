import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { AuthedRequest, requireAuth } from "../authMiddleware";
import { serializeBigInt } from "../serialize";
import { notifyResultConfirmed } from "../notifications";

export const matchesRouter = Router();
matchesRouter.use(requireAuth);

const leagueMatchesRouter = Router({ mergeParams: true });
leagueMatchesRouter.use(requireAuth);

leagueMatchesRouter.get("/", async (req: AuthedRequest, res) => {
  const status = req.query.status as "pending" | "played" | undefined;
  const mine = req.query.mine === "true";

  const member = mine
    ? await prisma.leagueMember.findUnique({
        where: { leagueId_userId: { leagueId: req.params.id, userId: BigInt(req.auth!.telegramId) } },
      })
    : null;

  const matches = await prisma.match.findMany({
    where: {
      stage: { leagueId: req.params.id },
      ...(status ? { status } : {}),
      ...(member ? { OR: [{ homeMemberId: member.id }, { awayMemberId: member.id }] } : {}),
    },
    include: { homeMember: { include: { user: true } }, awayMember: { include: { user: true } } },
  });

  res.json(serializeBigInt(matches));
});

export { leagueMatchesRouter };

const resultSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  playedAt: z.string().datetime().or(z.string().min(1)),
});

matchesRouter.patch("/:id/result", async (req: AuthedRequest, res) => {
  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
    include: { stage: { include: { league: true } }, homeMember: true, awayMember: true },
  });
  if (!match) return res.status(404).json({ error: "match not found" });

  const isOwner = match.stage.league.ownerId.toString() === req.auth!.telegramId;
  if (!isOwner) {
    const asAdmin = await prisma.leagueMember.findFirst({
      where: { leagueId: match.stage.leagueId, userId: BigInt(req.auth!.telegramId), role: "admin" },
    });
    if (!asAdmin) return res.status(403).json({ error: "owner/admin only" });
  }

  const parsed = resultSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const updated = await prisma.match.update({
    where: { id: req.params.id },
    data: {
      homeScore: parsed.data.homeScore,
      awayScore: parsed.data.awayScore,
      playedAt: new Date(parsed.data.playedAt),
      status: "played",
    },
    include: { homeMember: true, awayMember: true },
  });

  await notifyResultConfirmed(updated);

  res.json(serializeBigInt(updated));
});
