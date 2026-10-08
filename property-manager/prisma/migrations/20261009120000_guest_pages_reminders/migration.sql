-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "aiRepliesDrafted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emailReminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastMonthlyReport" TEXT,
ADD COLUMN     "lastReminderOn" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "checkInTime" TEXT,
ADD COLUMN     "checkOutTime" TEXT,
ADD COLUMN     "directBooking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "houseRules" TEXT,
ADD COLUMN     "publicToken" TEXT;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "arrivalTime" TEXT,
ADD COLUMN     "checkinCompletedAt" TIMESTAMP(3),
ADD COLUMN     "checkinToken" TEXT,
ADD COLUMN     "rulesAcceptedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Property_publicToken_key" ON "Property"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_checkinToken_key" ON "Reservation"("checkinToken");

