-- CreateTable
CREATE TABLE "HostelMaster" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "hostelCode" TEXT NOT NULL,
    "hostelName" TEXT NOT NULL,
    "hostelType" TEXT NOT NULL DEFAULT 'BOYS',
    "totalRooms" INTEGER NOT NULL DEFAULT 0,
    "totalBeds" INTEGER NOT NULL DEFAULT 0,
    "occupiedBeds" INTEGER NOT NULL DEFAULT 0,
    "staffCount" INTEGER NOT NULL DEFAULT 0,
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelMaster_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelAllotment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL DEFAULT '',
    "roomNumber" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL DEFAULT '1',
    "allotmentDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelAllotment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelStaff" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "hostelId" TEXT,
    "staffName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'WARDEN',
    "mobile" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelStaff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelVisitorLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "inTime" TEXT NOT NULL DEFAULT '',
    "outTime" TEXT NOT NULL DEFAULT '',
    "purpose" TEXT NOT NULL DEFAULT 'Parent',
    "visitDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelVisitorLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelNotice" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuedBy" TEXT NOT NULL DEFAULT 'Hostel Admin',
    "iconColor" TEXT NOT NULL DEFAULT 'amber',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelNotice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelGateLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentId" TEXT NOT NULL DEFAULT '',
    "gateEvent" TEXT NOT NULL DEFAULT 'CHECK_IN',
    "scanMethod" TEXT NOT NULL DEFAULT 'RFID',
    "logTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelGateLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelMessSummary" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "monthLabel" TEXT NOT NULL DEFAULT '',
    "totalCollection" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExpense" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "messBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "studentsOpted" INTEGER NOT NULL DEFAULT 0,
    "vegPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nonVegPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "eggetarianPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelMessSummary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelPendingPayment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelPendingPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelLeaveApplication" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "hostelId" TEXT,
    "studentName" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelLeaveApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelMaintenanceRequest" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "requestDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelMaintenanceRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelDashboardStats" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "statsPayload" JSONB NOT NULL DEFAULT '{}',
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelDashboardStats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "cacheRefreshMins" INTEGER NOT NULL DEFAULT 15,
    "capacityAlertPct" DOUBLE PRECISION NOT NULL DEFAULT 98,
    "roleMatrix" JSONB NOT NULL DEFAULT '[]',
    "notificationRules" JSONB NOT NULL DEFAULT '{}',
    "mobileSyncRules" JSONB NOT NULL DEFAULT '{}',
    "navigationTargets" JSONB NOT NULL DEFAULT '{}',
    "lastCacheRefresh" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelActivityLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "filterSnapshot" JSONB NOT NULL DEFAULT '{}',
    "performedBy" TEXT NOT NULL DEFAULT 'Warden',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HostelMaster_institutionId_hostelCode_key" ON "HostelMaster"("institutionId", "hostelCode");
CREATE INDEX "HostelMaster_institutionId_academicYear_status_idx" ON "HostelMaster"("institutionId", "academicYear", "status");

CREATE INDEX "HostelAllotment_institutionId_hostelId_academicYear_idx" ON "HostelAllotment"("institutionId", "hostelId", "academicYear");
CREATE INDEX "HostelAllotment_institutionId_status_idx" ON "HostelAllotment"("institutionId", "status");

CREATE INDEX "HostelStaff_institutionId_hostelId_status_idx" ON "HostelStaff"("institutionId", "hostelId", "status");

CREATE INDEX "HostelVisitorLog_institutionId_visitDate_idx" ON "HostelVisitorLog"("institutionId", "visitDate");
CREATE INDEX "HostelVisitorLog_hostelId_visitDate_idx" ON "HostelVisitorLog"("hostelId", "visitDate");

CREATE INDEX "HostelNotice_institutionId_academicYear_status_idx" ON "HostelNotice"("institutionId", "academicYear", "status");

CREATE INDEX "HostelGateLog_institutionId_logDate_idx" ON "HostelGateLog"("institutionId", "logDate");
CREATE INDEX "HostelGateLog_hostelId_logDate_idx" ON "HostelGateLog"("hostelId", "logDate");

CREATE INDEX "HostelMessSummary_institutionId_academicYear_idx" ON "HostelMessSummary"("institutionId", "academicYear");

CREATE INDEX "HostelPendingPayment_institutionId_academicYear_status_idx" ON "HostelPendingPayment"("institutionId", "academicYear", "status");
CREATE INDEX "HostelPendingPayment_hostelId_dueDate_idx" ON "HostelPendingPayment"("hostelId", "dueDate");

CREATE INDEX "HostelLeaveApplication_institutionId_academicYear_status_idx" ON "HostelLeaveApplication"("institutionId", "academicYear", "status");

CREATE INDEX "HostelMaintenanceRequest_institutionId_status_idx" ON "HostelMaintenanceRequest"("institutionId", "status");
CREATE INDEX "HostelMaintenanceRequest_hostelId_requestDate_idx" ON "HostelMaintenanceRequest"("hostelId", "requestDate");

CREATE UNIQUE INDEX "HostelDashboardStats_institutionId_hostelId_academicYear_key" ON "HostelDashboardStats"("institutionId", "hostelId", "academicYear");
CREATE INDEX "HostelDashboardStats_institutionId_academicYear_idx" ON "HostelDashboardStats"("institutionId", "academicYear");

CREATE UNIQUE INDEX "HostelSettings_institutionId_key" ON "HostelSettings"("institutionId");

CREATE INDEX "HostelActivityLog_institutionId_createdAt_idx" ON "HostelActivityLog"("institutionId", "createdAt");

-- AddForeignKey
ALTER TABLE "HostelMaster" ADD CONSTRAINT "HostelMaster_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelAllotment" ADD CONSTRAINT "HostelAllotment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelAllotment" ADD CONSTRAINT "HostelAllotment_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "HostelMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelStaff" ADD CONSTRAINT "HostelStaff_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelStaff" ADD CONSTRAINT "HostelStaff_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "HostelMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HostelVisitorLog" ADD CONSTRAINT "HostelVisitorLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelVisitorLog" ADD CONSTRAINT "HostelVisitorLog_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "HostelMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelNotice" ADD CONSTRAINT "HostelNotice_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelGateLog" ADD CONSTRAINT "HostelGateLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelGateLog" ADD CONSTRAINT "HostelGateLog_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "HostelMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelMessSummary" ADD CONSTRAINT "HostelMessSummary_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelPendingPayment" ADD CONSTRAINT "HostelPendingPayment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelPendingPayment" ADD CONSTRAINT "HostelPendingPayment_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "HostelMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelLeaveApplication" ADD CONSTRAINT "HostelLeaveApplication_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelLeaveApplication" ADD CONSTRAINT "HostelLeaveApplication_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "HostelMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HostelMaintenanceRequest" ADD CONSTRAINT "HostelMaintenanceRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelMaintenanceRequest" ADD CONSTRAINT "HostelMaintenanceRequest_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "HostelMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelDashboardStats" ADD CONSTRAINT "HostelDashboardStats_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelSettings" ADD CONSTRAINT "HostelSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelActivityLog" ADD CONSTRAINT "HostelActivityLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
