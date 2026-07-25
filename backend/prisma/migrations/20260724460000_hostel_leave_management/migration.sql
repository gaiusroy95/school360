ALTER TABLE "HostelLeaveApplication" ADD COLUMN "studentId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "studentProfileId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "leaveType" TEXT NOT NULL DEFAULT 'HOME_VISIT';
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "reason" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "addressDuringLeave" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "outDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "expectedInDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "actualReturnAt" TIMESTAMP(3);
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "parentApprovedAt" TIMESTAMP(3);
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "parentApprovedBy" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "parentOtpVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "wardenApprovedAt" TIMESTAMP(3);
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "wardenApprovedBy" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "rejectedBy" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "rejectionReason" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "rejectedAt" TIMESTAMP(3);
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "gatePassQrToken" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "exitLoggedAt" TIMESTAMP(3);
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "returnLoggedAt" TIMESTAMP(3);
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "securityVerifiedBy" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "hasDisciplinaryBlock" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HostelLeaveApplication" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "HostelLeaveAuditLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "leaveId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL DEFAULT '',
    "toStatus" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelLeaveAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HostelLeaveApplication_institutionId_studentId_idx" ON "HostelLeaveApplication"("institutionId", "studentId");
CREATE INDEX "HostelLeaveApplication_institutionId_outDateTime_expectedInDateTime_idx" ON "HostelLeaveApplication"("institutionId", "outDateTime", "expectedInDateTime");
CREATE INDEX "HostelLeaveApplication_gatePassQrToken_idx" ON "HostelLeaveApplication"("gatePassQrToken");

CREATE INDEX "HostelLeaveAuditLog_institutionId_leaveId_idx" ON "HostelLeaveAuditLog"("institutionId", "leaveId");
CREATE INDEX "HostelLeaveAuditLog_institutionId_createdAt_idx" ON "HostelLeaveAuditLog"("institutionId", "createdAt");

ALTER TABLE "HostelLeaveAuditLog" ADD CONSTRAINT "HostelLeaveAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelLeaveAuditLog" ADD CONSTRAINT "HostelLeaveAuditLog_leaveId_fkey" FOREIGN KEY ("leaveId") REFERENCES "HostelLeaveApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
