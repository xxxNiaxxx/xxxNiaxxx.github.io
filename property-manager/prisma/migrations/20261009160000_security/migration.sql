-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "bookingToken" TEXT;

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "window" BIGINT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key","window")
);

-- CreateIndex
CREATE INDEX "RateLimit_createdAt_idx" ON "RateLimit"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Property_bookingToken_key" ON "Property"("bookingToken");

