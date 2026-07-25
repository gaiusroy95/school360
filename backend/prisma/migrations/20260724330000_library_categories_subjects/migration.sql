ALTER TABLE "LibCategory" ADD COLUMN IF NOT EXISTS "parentId" TEXT;
ALTER TABLE "LibCategory" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LibCategory" ADD COLUMN IF NOT EXISTS "ddcRangeStart" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LibCategory" ADD COLUMN IF NOT EXISTS "ddcRangeEnd" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LibCategory" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LibCategory" ADD COLUMN IF NOT EXISTS "issuable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "LibCategory" ADD COLUMN IF NOT EXISTS "issueDaysOverride" INTEGER;
ALTER TABLE "LibCategory" ADD COLUMN IF NOT EXISTS "maxBooksOverride" INTEGER;
ALTER TABLE "LibCategory" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';

CREATE TABLE IF NOT EXISTS "LibSubject" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "academicSubjectId" TEXT,
    "subjectCode" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibSubject_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LibCategory_institutionId_parentId_idx" ON "LibCategory"("institutionId", "parentId");
CREATE UNIQUE INDEX IF NOT EXISTS "LibSubject_institutionId_subjectCode_key" ON "LibSubject"("institutionId", "subjectCode");
CREATE INDEX IF NOT EXISTS "LibSubject_institutionId_categoryId_idx" ON "LibSubject"("institutionId", "categoryId");
CREATE INDEX IF NOT EXISTS "LibSubject_academicSubjectId_idx" ON "LibSubject"("academicSubjectId");

ALTER TABLE "LibCategory" ADD CONSTRAINT "LibCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LibCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibSubject" ADD CONSTRAINT "LibSubject_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibSubject" ADD CONSTRAINT "LibSubject_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LibCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
