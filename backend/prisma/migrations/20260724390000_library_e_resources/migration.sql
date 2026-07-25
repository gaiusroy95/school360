-- AlterTable
ALTER TABLE "LibSettings" ADD COLUMN "eResourceMaxUploadMb" INTEGER NOT NULL DEFAULT 50;

-- CreateTable
CREATE TABLE "LibEResource" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "branchId" TEXT,
    "resourceCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "author" TEXT NOT NULL DEFAULT '',
    "format" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL DEFAULT 'E_BOOK',
    "externalUrl" TEXT NOT NULL DEFAULT '',
    "fileName" TEXT NOT NULL DEFAULT '',
    "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT NOT NULL DEFAULT '',
    "storageProvider" TEXT NOT NULL DEFAULT 'LOCAL',
    "storageKey" TEXT NOT NULL DEFAULT '',
    "drmEnabled" BOOLEAN NOT NULL DEFAULT true,
    "expiryDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "bandwidthBytes" INTEGER NOT NULL DEFAULT 0,
    "syllabusLinked" BOOLEAN NOT NULL DEFAULT false,
    "lessonPlanId" TEXT NOT NULL DEFAULT '',
    "accessClasses" JSONB NOT NULL DEFAULT '[]',
    "accessRoles" JSONB NOT NULL DEFAULT '["STUDENT","TEACHER","STAFF"]',
    "subjectTags" JSONB NOT NULL DEFAULT '[]',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "uploadedBy" TEXT NOT NULL DEFAULT 'Librarian',
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibEResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibEAccessLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL DEFAULT '',
    "memberCode" TEXT NOT NULL DEFAULT '',
    "memberName" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL DEFAULT '',
    "accessType" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL DEFAULT 'WEB',
    "bytesTransferred" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LibEAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LibEResource_institutionId_resourceCode_key" ON "LibEResource"("institutionId", "resourceCode");
CREATE INDEX "LibEResource_institutionId_status_academicYear_idx" ON "LibEResource"("institutionId", "status", "academicYear");
CREATE INDEX "LibEResource_institutionId_format_source_idx" ON "LibEResource"("institutionId", "format", "source");
CREATE INDEX "LibEResource_expiryDate_idx" ON "LibEResource"("expiryDate");

CREATE INDEX "LibEAccessLog_institutionId_resourceId_accessedAt_idx" ON "LibEAccessLog"("institutionId", "resourceId", "accessedAt");
CREATE INDEX "LibEAccessLog_institutionId_accessedAt_idx" ON "LibEAccessLog"("institutionId", "accessedAt");

-- AddForeignKey
ALTER TABLE "LibEResource" ADD CONSTRAINT "LibEResource_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibEResource" ADD CONSTRAINT "LibEResource_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "LibBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LibEAccessLog" ADD CONSTRAINT "LibEAccessLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibEAccessLog" ADD CONSTRAINT "LibEAccessLog_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "LibEResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
