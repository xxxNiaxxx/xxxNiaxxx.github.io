-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "icalUid" TEXT;

-- CreateIndex
CREATE INDEX "Reservation_calendarFeedId_icalUid_idx" ON "Reservation"("calendarFeedId", "icalUid");
