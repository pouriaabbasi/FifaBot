-- Add inviteCode as nullable first so existing rows don't violate NOT NULL
ALTER TABLE "League" ADD COLUMN "inviteCode" TEXT;

-- Backfill existing rows with a unique value derived from their id
UPDATE "League" SET "inviteCode" = "id" WHERE "inviteCode" IS NULL;

-- Now enforce NOT NULL and uniqueness
ALTER TABLE "League" ALTER COLUMN "inviteCode" SET NOT NULL;
CREATE UNIQUE INDEX "League_inviteCode_key" ON "League"("inviteCode");
