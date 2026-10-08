-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "icalToken" TEXT;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "calendarFeedId" TEXT;

-- CreateTable
CREATE TABLE "CalendarFeed" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "source" "ReservationSource" NOT NULL,
    "url" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarFeed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarFeed_organizationId_idx" ON "CalendarFeed"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarFeed_propertyId_url_key" ON "CalendarFeed"("propertyId", "url");

-- CreateIndex
CREATE UNIQUE INDEX "Property_icalToken_key" ON "Property"("icalToken");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_calendarFeedId_fkey" FOREIGN KEY ("calendarFeedId") REFERENCES "CalendarFeed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarFeed" ADD CONSTRAINT "CalendarFeed_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarFeed" ADD CONSTRAINT "CalendarFeed_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

