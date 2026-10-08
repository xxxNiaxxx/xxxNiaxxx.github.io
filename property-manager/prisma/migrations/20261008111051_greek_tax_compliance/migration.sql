-- CreateEnum
CREATE TYPE "TaxRegimeSetting" AS ENUM ('AUTO', 'INDIVIDUAL', 'BUSINESS');

-- CreateEnum
CREATE TYPE "PropertyKind" AS ENUM ('APARTMENT', 'DETACHED_HOUSE');

-- CreateEnum
CREATE TYPE "StayDeclarationStatus" AS ENUM ('PENDING', 'DECLARED', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "TaxFilingKind" AS ENUM ('CLIMATE_FEE', 'PRESENCE_FEE', 'VAT');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "taxRegime" "TaxRegimeSetting" NOT NULL DEFAULT 'AUTO';

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "ama" TEXT,
ADD COLUMN     "areaSqm" INTEGER,
ADD COLUMN     "compliance" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "kind" "PropertyKind" NOT NULL DEFAULT 'APARTMENT';

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "declarationStatus" "StayDeclarationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "declaredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TaxFiling" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "TaxFilingKind" NOT NULL,
    "period" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reference" TEXT,
    "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filedByUserId" TEXT,

    CONSTRAINT "TaxFiling_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxFiling_organizationId_kind_period_key" ON "TaxFiling"("organizationId", "kind", "period");

-- AddForeignKey
ALTER TABLE "TaxFiling" ADD CONSTRAINT "TaxFiling_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
