-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "emailHash" TEXT,
ADD COLUMN     "phoneHash" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "totpEnabledAt" TIMESTAMP(3),
ADD COLUMN     "totpLastStep" INTEGER,
ADD COLUMN     "totpRecovery" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "totpSecret" TEXT;

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "kind" TEXT NOT NULL,
    "device" TEXT,
    "ip" TEXT,
    "deviceKey" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityEvent_userId_kind_createdAt_idx" ON "SecurityEvent"("userId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_organizationId_kind_createdAt_idx" ON "SecurityEvent"("organizationId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "Guest_organizationId_emailHash_idx" ON "Guest"("organizationId", "emailHash");

-- CreateIndex
CREATE INDEX "Guest_organizationId_phoneHash_idx" ON "Guest"("organizationId", "phoneHash");

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

