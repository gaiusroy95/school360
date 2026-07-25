CREATE TABLE "HostelComplaint" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "hostelId" TEXT,
    "studentId" TEXT NOT NULL DEFAULT '',
    "studentProfileId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "complaintType" TEXT NOT NULL DEFAULT 'COMPLAINT',
    "subject" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "assignedWardenId" TEXT NOT NULL DEFAULT '',
    "assignedWardenName" TEXT NOT NULL DEFAULT '',
    "assignedAt" TIMESTAMP(3),
    "actionTaken" TEXT NOT NULL DEFAULT '',
    "actionTakenAt" TIMESTAMP(3),
    "actionTakenBy" TEXT NOT NULL DEFAULT '',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT NOT NULL DEFAULT '',
    "resolutionNotes" TEXT NOT NULL DEFAULT '',
    "studentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "studentConfirmedAt" TIMESTAMP(3),
    "studentRating" INTEGER NOT NULL DEFAULT 0,
    "studentFeedbackNote" TEXT NOT NULL DEFAULT '',
    "escalatedAt" TIMESTAMP(3),
    "escalationEmailSent" BOOLEAN NOT NULL DEFAULT false,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelComplaint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelComplaintAuditLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL DEFAULT '',
    "toStatus" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelComplaintAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HostelComplaint_institutionId_academicYear_status_idx" ON "HostelComplaint"("institutionId", "academicYear", "status");
CREATE INDEX "HostelComplaint_institutionId_category_idx" ON "HostelComplaint"("institutionId", "category");
CREATE INDEX "HostelComplaint_institutionId_assignedWardenId_idx" ON "HostelComplaint"("institutionId", "assignedWardenId");
CREATE INDEX "HostelComplaint_institutionId_createdAt_idx" ON "HostelComplaint"("institutionId", "createdAt");
CREATE INDEX "HostelComplaintAuditLog_institutionId_complaintId_idx" ON "HostelComplaintAuditLog"("institutionId", "complaintId");
CREATE INDEX "HostelComplaintAuditLog_institutionId_createdAt_idx" ON "HostelComplaintAuditLog"("institutionId", "createdAt");

ALTER TABLE "HostelComplaint" ADD CONSTRAINT "HostelComplaint_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelComplaint" ADD CONSTRAINT "HostelComplaint_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "HostelMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HostelComplaintAuditLog" ADD CONSTRAINT "HostelComplaintAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelComplaintAuditLog" ADD CONSTRAINT "HostelComplaintAuditLog_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "HostelComplaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
