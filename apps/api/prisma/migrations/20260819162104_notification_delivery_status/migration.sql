-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "delivered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "error" TEXT;
