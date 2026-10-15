-- AlterTable
ALTER TABLE "WaitlistEntry" ADD COLUMN     "linkOpenCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "linkOpenedAt" TIMESTAMP(3);
