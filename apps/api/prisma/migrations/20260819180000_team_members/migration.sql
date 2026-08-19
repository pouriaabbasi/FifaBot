-- New enum for team-completeness state
CREATE TYPE "TeamStatus" AS ENUM ('incomplete', 'complete');

-- League gets a fixed team size (1 = solo, 2 = pairs)
ALTER TABLE "League" ADD COLUMN "teamSize" INTEGER NOT NULL DEFAULT 1;

-- LeagueMember becomes a team container instead of a single-user row
ALTER TABLE "LeagueMember" ADD COLUMN "status" "TeamStatus" NOT NULL DEFAULT 'complete';

-- Junction table: 1 row per (member, user) — 1 row for solo leagues, up to 2 for team leagues
CREATE TABLE "LeagueMemberUser" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    CONSTRAINT "LeagueMemberUser_pkey" PRIMARY KEY ("id")
);

-- Backfill: every existing LeagueMember row becomes a 1-user team
INSERT INTO "LeagueMemberUser" ("id", "memberId", "userId")
SELECT gen_random_uuid()::text, "id", "userId" FROM "LeagueMember";

-- Drop the old direct FK/unique now that membership lives in the junction table
ALTER TABLE "LeagueMember" DROP CONSTRAINT "LeagueMember_userId_fkey";
DROP INDEX "LeagueMember_leagueId_userId_key";
ALTER TABLE "LeagueMember" DROP COLUMN "userId";

CREATE UNIQUE INDEX "LeagueMemberUser_memberId_userId_key" ON "LeagueMemberUser"("memberId", "userId");

ALTER TABLE "LeagueMemberUser" ADD CONSTRAINT "LeagueMemberUser_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LeagueMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeagueMemberUser" ADD CONSTRAINT "LeagueMemberUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("telegramId") ON DELETE RESTRICT ON UPDATE CASCADE;
