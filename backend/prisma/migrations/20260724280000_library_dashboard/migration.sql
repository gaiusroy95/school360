CREATE TABLE IF NOT EXISTS "LibBranch" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibBranch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibCategory" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibBook" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "categoryId" TEXT,
    "bookCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT '',
    "isbn" TEXT NOT NULL DEFAULT '',
    "publisher" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "totalCopies" INTEGER NOT NULL DEFAULT 1,
    "availableCopies" INTEGER NOT NULL DEFAULT 1,
    "coverColor" TEXT NOT NULL DEFAULT 'bg-slate-800',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "issueCount" INTEGER NOT NULL DEFAULT 0,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "addedDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibBook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibMember" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "memberCode" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "memberType" TEXT NOT NULL DEFAULT 'STUDENT',
    "className" TEXT NOT NULL DEFAULT '',
    "sectionName" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibIssue" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "issueDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "returnDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "fineAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finePaid" BOOLEAN NOT NULL DEFAULT false,
    "daysOverdue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibVendor" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibVendor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibAcquisition" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "vendorId" TEXT,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "booksAdded" INTEGER NOT NULL DEFAULT 0,
    "donatedBooks" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "acquisitionDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LibAcquisition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibAttendanceLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "hourSlot" TEXT NOT NULL,
    "visitorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LibAttendanceLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibNotice" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuedBy" TEXT NOT NULL DEFAULT 'Library Admin',
    "noticeType" TEXT NOT NULL DEFAULT 'GENERAL',
    "iconColor" TEXT NOT NULL DEFAULT 'red',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LibNotice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "cacheRefreshMins" INTEGER NOT NULL DEFAULT 15,
    "finePerDay" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "defaultIssueDays" INTEGER NOT NULL DEFAULT 14,
    "roleMatrix" JSONB NOT NULL DEFAULT '[]',
    "notificationRules" JSONB NOT NULL DEFAULT '{}',
    "mobileSyncRules" JSONB NOT NULL DEFAULT '{}',
    "navigationTargets" JSONB NOT NULL DEFAULT '{}',
    "lastCacheRefresh" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibActivityLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT 'Librarian',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LibActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LibBranch_institutionId_branchCode_key" ON "LibBranch"("institutionId", "branchCode");
CREATE UNIQUE INDEX IF NOT EXISTS "LibCategory_institutionId_categoryCode_key" ON "LibCategory"("institutionId", "categoryCode");
CREATE UNIQUE INDEX IF NOT EXISTS "LibBook_institutionId_bookCode_key" ON "LibBook"("institutionId", "bookCode");
CREATE UNIQUE INDEX IF NOT EXISTS "LibMember_institutionId_memberCode_key" ON "LibMember"("institutionId", "memberCode");
CREATE UNIQUE INDEX IF NOT EXISTS "LibSettings_institutionId_key" ON "LibSettings"("institutionId");
CREATE INDEX IF NOT EXISTS "LibBook_institutionId_branchId_academicYear_idx" ON "LibBook"("institutionId", "branchId", "academicYear");
CREATE INDEX IF NOT EXISTS "LibBook_categoryId_idx" ON "LibBook"("categoryId");
CREATE INDEX IF NOT EXISTS "LibMember_institutionId_branchId_memberType_idx" ON "LibMember"("institutionId", "branchId", "memberType");
CREATE INDEX IF NOT EXISTS "LibIssue_institutionId_status_academicYear_idx" ON "LibIssue"("institutionId", "status", "academicYear");
CREATE INDEX IF NOT EXISTS "LibIssue_branchId_dueDate_idx" ON "LibIssue"("branchId", "dueDate");
CREATE INDEX IF NOT EXISTS "LibIssue_memberId_idx" ON "LibIssue"("memberId");
CREATE INDEX IF NOT EXISTS "LibVendor_institutionId_vendorName_idx" ON "LibVendor"("institutionId", "vendorName");
CREATE INDEX IF NOT EXISTS "LibAcquisition_institutionId_academicYear_idx" ON "LibAcquisition"("institutionId", "academicYear");
CREATE INDEX IF NOT EXISTS "LibAttendanceLog_institutionId_logDate_idx" ON "LibAttendanceLog"("institutionId", "logDate");
CREATE INDEX IF NOT EXISTS "LibAttendanceLog_branchId_logDate_idx" ON "LibAttendanceLog"("branchId", "logDate");
CREATE INDEX IF NOT EXISTS "LibNotice_institutionId_academicYear_status_idx" ON "LibNotice"("institutionId", "academicYear", "status");
CREATE INDEX IF NOT EXISTS "LibActivityLog_institutionId_createdAt_idx" ON "LibActivityLog"("institutionId", "createdAt");

ALTER TABLE "LibBranch" ADD CONSTRAINT "LibBranch_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibCategory" ADD CONSTRAINT "LibCategory_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibBook" ADD CONSTRAINT "LibBook_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibBook" ADD CONSTRAINT "LibBook_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "LibBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibBook" ADD CONSTRAINT "LibBook_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LibCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibMember" ADD CONSTRAINT "LibMember_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibMember" ADD CONSTRAINT "LibMember_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "LibBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibIssue" ADD CONSTRAINT "LibIssue_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibIssue" ADD CONSTRAINT "LibIssue_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "LibBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibIssue" ADD CONSTRAINT "LibIssue_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "LibBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibIssue" ADD CONSTRAINT "LibIssue_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LibMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibVendor" ADD CONSTRAINT "LibVendor_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibAcquisition" ADD CONSTRAINT "LibAcquisition_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibAcquisition" ADD CONSTRAINT "LibAcquisition_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "LibVendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibAttendanceLog" ADD CONSTRAINT "LibAttendanceLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibAttendanceLog" ADD CONSTRAINT "LibAttendanceLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "LibBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibNotice" ADD CONSTRAINT "LibNotice_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibSettings" ADD CONSTRAINT "LibSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibActivityLog" ADD CONSTRAINT "LibActivityLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
