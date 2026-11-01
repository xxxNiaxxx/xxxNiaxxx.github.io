-- «Φέρτε έναν φίλο»: referral link, who brought whom, and the free months earned.
ALTER TABLE "Organization" ADD COLUMN "referralCode" TEXT,
ADD COLUMN "referredById" TEXT,
ADD COLUMN "referralRewardedAt" TIMESTAMP(3),
ADD COLUMN "referralMonths" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "freeUntil" TIMESTAMP(3);

CREATE UNIQUE INDEX "Organization_referralCode_key" ON "Organization"("referralCode");

ALTER TABLE "Organization" ADD CONSTRAINT "Organization_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WaitlistEntry" ADD COLUMN "referralCode" TEXT;
