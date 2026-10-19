-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailOptOutAt" TIMESTAMP(3),
ADD COLUMN     "welcomeEmails" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "WaitlistEntry" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);
