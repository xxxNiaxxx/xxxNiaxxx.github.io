-- CreateTable
CREATE TABLE "AutofillKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "AutofillKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutofillKey_keyHash_key" ON "AutofillKey"("keyHash");

-- CreateIndex
CREATE INDEX "AutofillKey_userId_idx" ON "AutofillKey"("userId");

-- AddForeignKey
ALTER TABLE "AutofillKey" ADD CONSTRAINT "AutofillKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutofillKey" ADD CONSTRAINT "AutofillKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

