ALTER TABLE "Feedback" ADD COLUMN "reply" TEXT, ADD COLUMN "repliedAt" TIMESTAMP(3), ADD COLUMN "replySeenAt" TIMESTAMP(3);
CREATE INDEX "Feedback_userId_repliedAt_idx" ON "Feedback"("userId", "repliedAt");
