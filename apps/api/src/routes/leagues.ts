import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { AuthedRequest, requireAuth } from "../authMiddleware";
import { serializeBigInt } from "../serialize";
import { generateRoundRobin, generateHomeAndAway, generateKnockoutRound1 } from "../fixtures";
import {
  notifyMemberJoined,
  notifyMemberRemoved,
  notifyLeagueStarted,
  notifyCustomMessageToMany,
  notifyMessageToOwner,
} from "../notifications";
import { generateInviteCode } from "../inviteCode";
import { displayName } from "../displayName";
import { computeStandings } from "../standings";

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
    where: { members: { some: { users: { some: { userId: BigInt(req.auth!.telegramId) } } } } },
    include: { members: { include: { users: { include: { user: true } } } }, stages: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(serializeBigInt(leagues));
});

const createSchema = z.object({
  name: z.string().min(1).max(80),
  isTwoStage: z.boolean().default(false),
  teamSize: z.union([z.literal(1), z.literal(2)]).default(1),
  stages: z
    .array(z.object({ order: z.number().int().min(1).max(2), format: z.enum(["round_robin", "knockout"]), qualifyTopN: z.number().int().positive().optional() }))
    .min(1),
});

leaguesRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const ownerId = BigInt(req.auth!.telegramId);
  const { name, isTwoStage, teamSize, stages } = parsed.data;

  let league;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      league = await prisma.league.create({
        data: {
          name,
          isTwoStage,
          teamSize,
          ownerId,
          inviteCode: generateInviteCode(),
          members: { create: { role: "owner", status: "complete", users: { create: { userId: ownerId } } } },
          stages: { create: stages.map((s) => ({ order: s.order, format: s.format, qualifyTopN: s.qualifyTopN })) },
        },
        include: { stages: true, members: { include: { users: true } } },
      });
      break;
    } catch (err: unknown) {
      const isUniqueViolation = typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
      if (!isUniqueViolation || attempt === 4) throw err;
    }
  }

  res.status(201).json(serializeBigInt(league));
});

async function findMembershipForUser(leagueId: string, userId: bigint) {
  return prisma.leagueMember.findFirst({
    where: { leagueId, users: { some: { userId } } },
    include: { users: true },
  });
}

leaguesRouter.post("/join/:inviteCode", async (req: AuthedRequest, res) => {
  const league = await prisma.league.findFirst({
    where: { inviteCode: req.params.inviteCode.trim().toUpperCase() },
  });
  if (!league) return res.status(404).json({ error: "invalid invite link" });
  if (league.status !== "draft") return res.status(409).json({ error: "league already started" });

  const userId = BigInt(req.auth!.telegramId);
  const existing = await findMembershipForUser(league.id, userId);
  if (existing) return res.json(serializeBigInt({ league, member: existing }));

  const member = await prisma.leagueMember.create({
    data: {
      leagueId: league.id,
      status: league.teamSize === 1 ? "complete" : "incomplete",
      users: { create: { userId } },
    },
    include: { users: { include: { user: true } } },
  });
  await notifyMemberJoined(league.id, league.name, member);
  res.status(201).json(serializeBigInt({ league, member }));
});

leaguesRouter.get("/:id/incomplete-teams", async (req: AuthedRequest, res) => {
  const members = await prisma.leagueMember.findMany({
    where: { leagueId: req.params.id, status: "incomplete" },
    include: { users: { include: { user: true } } },
  });
  res.json(serializeBigInt(members));
});

const pairSchema = z.object({ memberId: z.string() });

leaguesRouter.post("/:id/teams/:memberId/pair", async (req: AuthedRequest, res) => {
  const league = await prisma.league.findUnique({ where: { id: req.params.id } });
  if (!league) return res.status(404).json({ error: "league not found" });
  if (league.teamSize !== 2) return res.status(400).json({ error: "league is not team-based" });

  const target = await prisma.leagueMember.findUnique({ where: { id: req.params.memberId }, include: { users: true } });
  if (!target || target.leagueId !== req.params.id) return res.status(404).json({ error: "team not found" });
  if (target.status !== "incomplete") return res.status(409).json({ error: "team is already complete" });

  const userId = BigInt(req.auth!.telegramId);
  const isOwner = league.ownerId.toString() === req.auth!.telegramId;

  let sourceMemberId: string;
  if (isOwner && req.body?.memberId) {
    const parsed = pairSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const source = await prisma.leagueMember.findUnique({ where: { id: parsed.data.memberId }, include: { users: true } });
    if (!source || source.leagueId !== req.params.id || source.status !== "incomplete") {
      return res.status(404).json({ error: "source team not found" });
    }
    sourceMemberId = source.id;
  } else {
    const own = await findMembershipForUser(req.params.id, userId);
    if (!own || own.status !== "incomplete") return res.status(403).json({ error: "you have no incomplete team to pair" });
    if (own.id === target.id) return res.status(400).json({ error: "cannot pair a team with itself" });
    sourceMemberId = own.id;
  }

  const source = await prisma.leagueMember.findUnique({ where: { id: sourceMemberId }, include: { users: true } });
  if (!source) return res.status(404).json({ error: "source team not found" });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.leagueMemberUser.updateMany({
      where: { memberId: source.id },
      data: { memberId: target.id },
    });
    await tx.leagueMember.delete({ where: { id: source.id } });
    return tx.leagueMember.update({
      where: { id: target.id },
      data: { status: "complete" },
      include: { users: { include: { user: true } } },
    });
  });

  res.json(serializeBigInt(updated));
});

const teamNameSchema = z.object({ name: z.string().trim().max(40).nullable() });

leaguesRouter.patch("/:id/teams/:memberId/name", async (req: AuthedRequest, res) => {
  const member = await findMembershipForUser(req.params.id, BigInt(req.auth!.telegramId));
  const league = await prisma.league.findUnique({ where: { id: req.params.id } });
  const isOwner = league?.ownerId.toString() === req.auth!.telegramId;
  if ((!member || member.id !== req.params.memberId) && !isOwner) {
    return res.status(403).json({ error: "not a member of this team" });
  }

  const parsed = teamNameSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const nickname = parsed.data.name && parsed.data.name.length > 0 ? parsed.data.name : null;
  const updated = await prisma.leagueMember.update({
    where: { id: req.params.memberId },
    data: { nickname },
    include: { users: { include: { user: true } } },
  });
  res.json(serializeBigInt(updated));
});

leaguesRouter.delete("/:id/members/:memberId", async (req: AuthedRequest, res) => {
  const owner = await assertOwner(req.params.id, req.auth!.telegramId);
  if (!owner) return res.status(404).json({ error: "league not found" });
  if (owner === "forbidden") return res.status(403).json({ error: "owner only" });

  const member = await prisma.leagueMember.findUnique({
    where: { id: req.params.memberId },
    include: { users: { include: { user: true } } },
  });
  if (!member || member.leagueId !== req.params.id) return res.status(404).json({ error: "member not found" });
  if (member.role === "owner") return res.status(400).json({ error: "cannot remove the league owner" });

  const hasMatches = await prisma.match.findFirst({
    where: { OR: [{ homeMemberId: req.params.memberId }, { awayMemberId: req.params.memberId }] },
  });
  if (hasMatches) return res.status(409).json({ error: "cannot remove member after fixture is generated" });

  await prisma.leagueMember.delete({ where: { id: req.params.memberId } });
  await notifyMemberRemoved(req.params.id, owner.name, member);
  res.status(204).send();
});

const messageSchema = z.object({ text: z.string().trim().min(1).max(1000) });

leaguesRouter.post("/:id/members/:memberId/message", async (req: AuthedRequest, res) => {
  const owner = await assertOwner(req.params.id, req.auth!.telegramId);
  if (!owner) return res.status(404).json({ error: "league not found" });
  if (owner === "forbidden") return res.status(403).json({ error: "owner only" });

  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const member = await prisma.leagueMember.findUnique({ where: { id: req.params.memberId }, include: { users: true } });
  if (!member || member.leagueId !== req.params.id) return res.status(404).json({ error: "member not found" });

  const ownerUser = await prisma.user.findUnique({ where: { telegramId: owner.ownerId } });
  if (!ownerUser) return res.status(500).json({ error: "owner profile not found" });

  await notifyCustomMessageToMany(owner.name, ownerUser, member.users.map((u) => u.userId), parsed.data.text);

  res.status(204).send();
});

leaguesRouter.post("/:id/message", async (req: AuthedRequest, res) => {
  const owner = await assertOwner(req.params.id, req.auth!.telegramId);
  if (!owner) return res.status(404).json({ error: "league not found" });
  if (owner === "forbidden") return res.status(403).json({ error: "owner only" });

  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const ownerUser = await prisma.user.findUnique({ where: { telegramId: owner.ownerId } });
  if (!ownerUser) return res.status(500).json({ error: "owner profile not found" });

  const members = await prisma.leagueMember.findMany({ where: { leagueId: req.params.id }, include: { users: true } });
  const userIds = members.flatMap((m) => m.users.map((u) => u.userId));

  await notifyCustomMessageToMany(owner.name, ownerUser, userIds, parsed.data.text);

  res.status(204).send();
});

leaguesRouter.post("/:id/message-owner", async (req: AuthedRequest, res) => {
  const league = await prisma.league.findUnique({ where: { id: req.params.id } });
  if (!league) return res.status(404).json({ error: "league not found" });

  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const senderId = BigInt(req.auth!.telegramId);
  if (league.ownerId === senderId) return res.status(400).json({ error: "you are the owner" });

  const member = await prisma.leagueMember.findFirst({
    where: { leagueId: league.id, users: { some: { userId: senderId } } },
    include: { users: { include: { user: true } } },
  });
  if (!member) return res.status(403).json({ error: "not a member of this league" });

  const senderName = displayName(member, member.users.map((u) => u.user));
  await notifyMessageToOwner(league.name, league.ownerId, senderName, parsed.data.text);

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

  const allMembers = await prisma.leagueMember.findMany({ where: { leagueId: req.params.id } });
  const incomplete = allMembers.filter((m) => m.status === "incomplete");
  if (incomplete.length > 0) {
    return res.status(409).json({ error: "some teams are still incomplete", count: incomplete.length });
  }

  const members = allMembers.filter((m) => m.status === "complete");
  if (members.length < 2) return res.status(400).json({ error: "need at least 2 teams" });

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

  const created = await prisma.match.findMany({
    where: { stageId: stage.id },
    include: {
      homeMember: { include: { users: { include: { user: true } } } },
      awayMember: { include: { users: { include: { user: true } } } },
    },
  });

  const ownerUser = await prisma.user.findUnique({ where: { telegramId: owner.ownerId } });
  const membersWithUsers = await prisma.leagueMember.findMany({
    where: { leagueId: req.params.id },
    include: { users: { include: { user: true } } },
  });
  if (ownerUser) await notifyLeagueStarted(owner, ownerUser, membersWithUsers);

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

  const created = await prisma.match.findMany({
    where: { stageId: stage2.id },
    include: {
      homeMember: { include: { users: { include: { user: true } } } },
      awayMember: { include: { users: { include: { user: true } } } },
    },
  });

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

