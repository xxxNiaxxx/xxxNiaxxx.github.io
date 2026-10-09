-- CreateEnum
CREATE TYPE "FeedbackKind" AS ENUM ('BUG', 'IDEA', 'OTHER');

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "organizationId" TEXT,
    "kind" "FeedbackKind" NOT NULL DEFAULT 'OTHER',
    "message" TEXT NOT NULL,
    "page" TEXT,
    "client" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_resolvedAt_createdAt_idx" ON "Feedback"("resolvedAt", "createdAt");

