-- CreateEnum
CREATE TYPE "AIMemoryKind" AS ENUM ('GUEST_INFO', 'PREFERENCE', 'MESSAGE_TEMPLATE');

-- CreateEnum
CREATE TYPE "AIMemorySource" AS ENUM ('MANUAL', 'CHAT', 'EDIT');

-- CreateTable
CREATE TABLE "AIMemory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT,
    "kind" "AIMemoryKind" NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT,
    "messageKind" TEXT,
    "source" "AIMemorySource" NOT NULL DEFAULT 'MANUAL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIMemory_organizationId_kind_active_idx" ON "AIMemory"("organizationId", "kind", "active");

-- AddForeignKey
ALTER TABLE "AIMemory" ADD CONSTRAINT "AIMemory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMemory" ADD CONSTRAINT "AIMemory_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
