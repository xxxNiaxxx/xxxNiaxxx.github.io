-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;


-- The demo organization created by the seed before this flag existed.
UPDATE "Organization" o SET "isDemo" = true, "billingExempt" = true
WHERE o."name" = 'Demo Hospitality'
  AND EXISTS (
    SELECT 1 FROM "OrganizationMember" m JOIN "User" u ON u."id" = m."userId"
    WHERE m."organizationId" = o."id" AND u."email" LIKE '%@demo-hospitality.test'
  );
