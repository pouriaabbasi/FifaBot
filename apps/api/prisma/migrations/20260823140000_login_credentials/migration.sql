-- AlterTable
ALTER TABLE "User" ADD COLUMN "loginUsername" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "credentialsSentAt" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "User_loginUsername_key" ON "User"("loginUsername");
