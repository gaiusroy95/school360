CREATE TABLE "HostelDisciplineSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "leaveSuspensionPoints" INTEGER NOT NULL DEFAULT 3,
    "parentNotifyPoints" INTEGER NOT NULL DEFAULT 2,
    "parentNotifySeverities" TEXT NOT NULL DEFAULT 'MEDIUM,HIGH,CRITICAL',
    "managementSeverities" TEXT NOT NULL DEFAULT 'HIGH,CRITICAL',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelDisciplineSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelDisciplineIncident" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "hostelId" TEXT,
    "studentProfileId" TEXT NOT NULL DEFAULT '',
    "studentId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL DEFAULT '',
    "incidentType" TEXT NOT NULL DEFAULT 'OTHER',
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "incidentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportedBy" TEXT NOT NULL DEFAULT '',
    "penaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolutionNotes" TEXT NOT NULL DEFAULT '',
    "resolvedBy" TEXT NOT NULL DEFAULT '',
    "resolvedAt" TIMESTAMP(3),
    "parentNotified" BOOLEAN NOT NULL DEFAULT false,
    "parentNotifiedAt" TIMESTAMP(3),
    "managementEscalated" BOOLEAN NOT NULL DEFAULT false,
    "managementEscalatedAt" TIMESTAMP(3),
    "leaveSuspended" BOOLEAN NOT NULL DEFAULT false,
    "monthLabel" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelDisciplineIncident_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelDisciplineAuditLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL DEFAULT '',
    "toStatus" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelDisciplineAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HostelDisciplineSettings_institutionId_key" ON "HostelDisciplineSettings"("institutionId");
CREATE INDEX "HostelDisciplineIncident_institutionId_academicYear_status_idx" ON "HostelDisciplineIncident"("institutionId", "academicYear", "status");
CREATE INDEX "HostelDisciplineIncident_institutionId_monthLabel_idx" ON "HostelDisciplineIncident"("institutionId", "monthLabel");
CREATE INDEX "HostelDisciplineIncident_institutionId_studentProfileId_idx" ON "HostelDisciplineIncident"("institutionId", "studentProfileId");
CREATE INDEX "HostelDisciplineIncident_institutionId_severity_idx" ON "HostelDisciplineIncident"("institutionId", "severity");
CREATE INDEX "HostelDisciplineAuditLog_institutionId_incidentId_idx" ON "HostelDisciplineAuditLog"("institutionId", "incidentId");
CREATE INDEX "HostelDisciplineAuditLog_institutionId_createdAt_idx" ON "HostelDisciplineAuditLog"("institutionId", "createdAt");

ALTER TABLE "HostelDisciplineSettings" ADD CONSTRAINT "HostelDisciplineSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelDisciplineIncident" ADD CONSTRAINT "HostelDisciplineIncident_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelDisciplineIncident" ADD CONSTRAINT "HostelDisciplineIncident_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "HostelMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HostelDisciplineAuditLog" ADD CONSTRAINT "HostelDisciplineAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelDisciplineAuditLog" ADD CONSTRAINT "HostelDisciplineAuditLog_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "HostelDisciplineIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
