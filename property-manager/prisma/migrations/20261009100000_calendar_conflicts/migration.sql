-- CreateTable
CREATE TABLE "CalendarConflict" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "icalUid" TEXT NOT NULL,
    "start" DATE NOT NULL,
    "end" DATE NOT NULL,
    "code" TEXT,
    "reservationIds" TEXT[],
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarConflict_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarConflict_organizationId_resolvedAt_dismissedAt_idx" ON "CalendarConflict"("organizationId", "resolvedAt", "dismissedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarConflict_feedId_icalUid_start_end_key" ON "CalendarConflict"("feedId", "icalUid", "start", "end");

-- AddForeignKey
ALTER TABLE "CalendarConflict" ADD CONSTRAINT "CalendarConflict_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarConflict" ADD CONSTRAINT "CalendarConflict_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "CalendarFeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

