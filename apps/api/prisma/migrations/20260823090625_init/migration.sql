-- CreateTable
CREATE TABLE "User" (
    "telegramId" BIGINT NOT NULL PRIMARY KEY,
    "username" TEXT,
    "firstName" TEXT NOT NULL,
    "nickname" TEXT,
    "photoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ownerId" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isTwoStage" BOOLEAN NOT NULL DEFAULT false,
    "teamSize" INTEGER NOT NULL DEFAULT 1,
    "inviteCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "League_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("telegramId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeagueStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "qualifyTopN" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    CONSTRAINT "LeagueStage_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeagueMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "nickname" TEXT,
    "role" TEXT NOT NULL DEFAULT 'player',
    "status" TEXT NOT NULL DEFAULT 'complete',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeagueMember_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeagueMemberUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    CONSTRAINT "LeagueMemberUser_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LeagueMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeagueMemberUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("telegramId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stageId" TEXT NOT NULL,
    "homeMemberId" TEXT NOT NULL,
    "awayMemberId" TEXT NOT NULL,
    "round" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "playedAt" DATETIME,
    CONSTRAINT "Match_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "LeagueStage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Match_homeMemberId_fkey" FOREIGN KEY ("homeMemberId") REFERENCES "LeagueMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_awayMemberId_fkey" FOREIGN KEY ("awayMemberId") REFERENCES "LeagueMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("telegramId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Notification_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "League_inviteCode_key" ON "League"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueStage_leagueId_order_key" ON "LeagueStage"("leagueId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMemberUser_memberId_userId_key" ON "LeagueMemberUser"("memberId", "userId");

-- CreateIndex
CREATE INDEX "Match_stageId_status_idx" ON "Match"("stageId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_matchId_type_key" ON "Notification"("userId", "matchId", "type");
