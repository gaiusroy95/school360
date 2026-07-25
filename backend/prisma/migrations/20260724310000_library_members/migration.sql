CREATE TABLE IF NOT EXISTS "LibMemberCategory" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "memberType" TEXT NOT NULL DEFAULT 'STUDENT',
    "maxBooks" INTEGER NOT NULL DEFAULT 3,
    "issueDays" INTEGER NOT NULL DEFAULT 14,
    "description" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibMemberCategory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "LibMember" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
ALTER TABLE "LibMember" ADD COLUMN IF NOT EXISTS "erpUserId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LibMember" ADD COLUMN IF NOT EXISTS "erpSource" TEXT NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "LibMember" ADD COLUMN IF NOT EXISTS "barcodeUid" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LibMember" ADD COLUMN IF NOT EXISTS "cardType" TEXT NOT NULL DEFAULT 'VIRTUAL';
ALTER TABLE "LibMember" ADD COLUMN IF NOT EXISTS "cardIssuedAt" TIMESTAMP(3);
ALTER TABLE "LibMember" ADD COLUMN IF NOT EXISTS "welcomeNotifiedAt" TIMESTAMP(3);
ALTER TABLE "LibMember" ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMP(3);
ALTER TABLE "LibMember" ADD COLUMN IF NOT EXISTS "suspendedReason" TEXT NOT NULL DEFAULT '';

UPDATE "LibMember" SET "erpUserId" = "id", "erpSource" = 'MANUAL' WHERE "erpUserId" = '' OR "erpUserId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "LibMemberCategory_institutionId_categoryCode_key" ON "LibMemberCategory"("institutionId", "categoryCode");
CREATE INDEX IF NOT EXISTS "LibMemberCategory_institutionId_memberType_status_idx" ON "LibMemberCategory"("institutionId", "memberType", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "LibMember_institutionId_erpUserId_erpSource_key" ON "LibMember"("institutionId", "erpUserId", "erpSource");
CREATE INDEX IF NOT EXISTS "LibMember_institutionId_status_idx" ON "LibMember"("institutionId", "status");
CREATE INDEX IF NOT EXISTS "LibMember_barcodeUid_idx" ON "LibMember"("barcodeUid");

ALTER TABLE "LibMemberCategory" ADD CONSTRAINT "LibMemberCategory_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibMember" ADD CONSTRAINT "LibMember_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LibMemberCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
