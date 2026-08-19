-- CreateEnum
CREATE TYPE "LeagueStatus" AS ENUM ('draft', 'active', 'finished');

-- CreateEnum
CREATE TYPE "StageFormat" AS ENUM ('round_robin', 'knockout');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('pending', 'active', 'done');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('owner', 'admin', 'player');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('pending', 'played');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('next_match', 'result_confirmed');

-- CreateTable
CREATE TABLE "User" (
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT NOT NULL,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("telegramId")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" BIGINT NOT NULL,
    "status" "LeagueStatus" NOT NULL DEFAULT 'draft',
    "isTwoStage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueStage" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "format" "StageFormat" NOT NULL,
    "qualifyTopN" INTEGER,
    "status" "StageStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "LeagueStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueMember" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "nickname" TEXT,
    "role" "MemberRole" NOT NULL DEFAULT 'player',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "homeMemberId" TEXT NOT NULL,
    "awayMemberId" TEXT NOT NULL,
    "round" INTEGER,
    "status" "MatchStatus" NOT NULL DEFAULT 'pending',
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "playedAt" TIMESTAMP(3),

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "matchId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeagueStage_leagueId_order_key" ON "LeagueStage"("leagueId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMember_leagueId_userId_key" ON "LeagueMember"("leagueId", "userId");

-- CreateIndex
CREATE INDEX "Match_stageId_status_idx" ON "Match"("stageId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_matchId_type_key" ON "Notification"("userId", "matchId", "type");

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("telegramId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueStage" ADD CONSTRAINT "LeagueStage_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("telegramId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "LeagueStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeMemberId_fkey" FOREIGN KEY ("homeMemberId") REFERENCES "LeagueMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayMemberId_fkey" FOREIGN KEY ("awayMemberId") REFERENCES "LeagueMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("telegramId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
