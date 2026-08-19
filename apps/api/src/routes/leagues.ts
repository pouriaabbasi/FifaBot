import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { AuthedRequest, requireAuth } from "../authMiddleware";
import { serializeBigInt } from "../serialize";
import { generateRoundRobin, generateHomeAndAway, generateKnockoutRound1 } from "../fixtures";
import { notifyNextMatch } from "../notifications";
import { generateInviteCode } from "../inviteCode";

export const leaguesRouter = Router();
leaguesRouter.use(requireAuth);

async function assertOwner(leagueId: string, telegramId: string) {
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) return null;
  if (league.ownerId.toString() !== telegramId) return "forbidden";
  return league;
}

leaguesRouter.get("/", async (req: AuthedRequest, res) => {
  const leagues = await prisma.league.findMany({
    where: { members: { some: { userId: BigInt(req.auth!.telegramId) } } },
    include: { members: true, stages: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(serializeBigInt(leagues));
});

const createSchema = z.object({
  name: z.string().min(1).max(80),
  isTwoStage: z.boolean().default(false),
  stages: z
    .array(z.object({ order: z.number().int().min(1).max(2), format: z.enum(["round_robin", "knockout"]), qualifyTopN: z.number().int().positive().optional() }))
    .min(1),
});

leaguesRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const ownerId = BigInt(req.auth!.telegramId);
  const { name, isTwoStage, stages } = parsed.data;

  let league;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      league = await prisma.league.create({
        data: {
          name,
          isTwoStage,
          ownerId,
          inviteCode: generateInviteCode(),
          members: { create: { userId: ownerId, role: "owner" } },
          stages: { create: stages.map((s) => ({ order: s.order, format: s.format, qualifyTopN: s.qualifyTopN })) },
        },
        include: { stages: true, members: true },
      });
      break;
    } catch (err: unknown) {
      const isUniqueViolation = typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
      if (!isUniqueViolation || attempt === 4) throw err;
    }
  }

  res.status(201).json(serializeBigInt(league));
});

leaguesRouter.post("/join/:inviteCode", async (req: AuthedRequest, res) => {
  const league = await prisma.league.findUnique({
    where: { inviteCode: req.params.inviteCode.trim().toUpperCase() },
  });
  if (!league) return res.status(404).json({ error: "invalid invite link" });
  if (league.status !== "draft") return res.status(409).json({ error: "league already started" });

  const userId = BigInt(req.auth!.telegramId);
  const existing = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: league.id, userId } },
  });
  if (existing) return res.json(serializeBigInt({ league, member: existing }));

  const member = await prisma.leagueMember.create({ data: { leagueId: league.id, userId } });
  res.status(201).json(serializeBigInt({ league, member }));
});

const addMemberSchema = z.object({ telegramId: z.string(), nickname: z.string().optional() });

leaguesRouter.post("/:id/members", async (req: AuthedRequest, res) => {
  const owner = await assertOwner(req.params.id, req.auth!.telegramId);
  if (!owner) return res.status(404).json({ error: "league not found" });
  if (owner === "forbidden") return res.status(403).json({ error: "owner only" });

  const parsed = addMemberSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const member = await prisma.leagueMember.create({
    data: { leagueId: req.params.id, userId: BigInt(parsed.data.telegramId), nickname: parsed.data.nickname },
  });
  res.status(201).json(serializeBigInt(member));
});

leaguesRouter.delete("/:id/members/:memberId", async (req: AuthedRequest, res) => {
  const owner = await assertOwner(req.params.id, req.auth!.telegramId);
  if (!owner) return res.status(404).json({ error: "league not found" });
  if (owner === "forbidden") return res.status(403).json({ error: "owner only" });

  const hasMatches = await prisma.match.findFirst({
    where: { OR: [{ homeMemberId: req.params.memberId }, { awayMemberId: req.params.memberId }] },
  });
  if (hasMatches) return res.status(409).json({ error: "cannot remove member after fixture is generated" });

  await prisma.leagueMember.delete({ where: { id: req.params.memberId } });
  res.status(204).send();
});

leaguesRouter.post("/:id/generate-fixture", async (req: AuthedRequest, res) => {
  const owner = await assertOwner(req.params.id, req.auth!.telegramId);
  if (!owner) return res.status(404).json({ error: "league not found" });
  if (owner === "forbidden") return res.status(403).json({ error: "owner only" });

  const stage = await prisma.leagueStage.findFirst({
    where: { leagueId: req.params.id, order: 1 },
  });
  if (!stage) return res.status(400).json({ error: "no stage defined" });

  const members = await prisma.leagueMember.findMany({ where: { leagueId: req.params.id } });
  if (members.length < 2) return res.status(400).json({ error: "need at least 2 members" });

  const pairings =
    stage.format === "round_robin"
      ? generateHomeAndAway(members.map((m) => m.id))
      : generateKnockoutRound1(members.map((m) => m.id));

  await prisma.$transaction([
    prisma.match.createMany({
      data: pairings.map((p) => ({
        stageId: stage.id,
        homeMemberId: p.homeMemberId,
        awayMemberId: p.awayMemberId,
        round: p.round,
      })),
    }),
    prisma.leagueStage.update({ where: { id: stage.id }, data: { status: "active" } }),
    prisma.league.update({ where: { id: req.params.id }, data: { status: "active" } }),
  ]);

  const created = await prisma.match.findMany({ where: { stageId: stage.id }, include: { homeMember: true, awayMember: true } });
  await Promise.all(created.map((m) => notifyNextMatch(m)));

  res.status(201).json(serializeBigInt(created));
});

const advanceSchema = z.object({ nextFormat: z.enum(["round_robin", "knockout"]) });

leaguesRouter.post("/:id/advance-stage", async (req: AuthedRequest, res) => {
  const owner = await assertOwner(req.params.id, req.auth!.telegramId);
  if (!owner) return res.status(404).json({ error: "league not found" });
  if (owner === "forbidden") return res.status(403).json({ error: "owner only" });
  if (!owner.isTwoStage) return res.status(400).json({ error: "league is not two-stage" });

  const parsed = advanceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const stage1 = await prisma.leagueStage.findFirst({ where: { leagueId: req.params.id, order: 1 } });
  if (!stage1 || !stage1.qualifyTopN) return res.status(400).json({ error: "stage 1 has no qualify rule" });

  const pending = await prisma.match.count({ where: { stageId: stage1.id, status: "pending" } });
  if (pending > 0) return res.status(409).json({ error: "stage 1 still has pending matches" });

  const standings = await computeStandings(stage1.id);
  const qualifiedMemberIds = standings.slice(0, stage1.qualifyTopN).map((s) => s.memberId);

  const stage2 = await prisma.leagueStage.upsert({
    where: { leagueId_order: { leagueId: req.params.id, order: 2 } },
    update: { format: parsed.data.nextFormat, status: "active" },
    create: { leagueId: req.params.id, order: 2, format: parsed.data.nextFormat, status: "active" },
  });

  const pairings =
    parsed.data.nextFormat === "round_robin"
      ? generateRoundRobin(qualifiedMemberIds)
      : generateKnockoutRound1(qualifiedMemberIds);

  await prisma.$transaction([
    prisma.match.createMany({
      data: pairings.map((p) => ({ stageId: stage2.id, homeMemberId: p.homeMemberId, awayMemberId: p.awayMemberId, round: p.round })),
    }),
    prisma.leagueStage.update({ where: { id: stage1.id }, data: { status: "done" } }),
  ]);

  const created = await prisma.match.findMany({ where: { stageId: stage2.id }, include: { homeMember: true, awayMember: true } });
  await Promise.all(created.map((m) => notifyNextMatch(m)));

  res.status(201).json(serializeBigInt(created));
});

leaguesRouter.get("/:id/standings", async (req: AuthedRequest, res) => {
  const stageId = req.query.stageId as string | undefined;
  const stage = stageId
    ? await prisma.leagueStage.findUnique({ where: { id: stageId } })
    : await prisma.leagueStage.findFirst({ where: { leagueId: req.params.id }, orderBy: { order: "desc" } });
  if (!stage) return res.status(404).json({ error: "stage not found" });

  const standings = await computeStandings(stage.id);
  res.json(serializeBigInt(standings));
});

export async function computeStandings(stageId: string) {
  const members = await prisma.leagueMember.findMany({
    where: { OR: [{ homeMatches: { some: { stageId } } }, { awayMatches: { some: { stageId } } }] },
    include: { user: true },
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
      telegramId: m.userId.toString(),
      name: m.nickname ?? m.user.firstName,
      played, won, drawn, lost, gf, ga,
      goalDiff: gf - ga,
      points: won * 3 + drawn,
    };
  });

  return table.sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.gf - a.gf);
}
