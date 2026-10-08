-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "businessTaxRate" DECIMAL(5,2),
ADD COLUMN     "commissionRates" JSONB;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "commission" DECIMAL(12,2) NOT NULL DEFAULT 0;
