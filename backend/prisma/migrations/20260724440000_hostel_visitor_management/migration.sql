ALTER TABLE "HostelVisitorLog" ADD COLUMN "studentId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelVisitorLog" ADD COLUMN "studentProfileId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelVisitorLog" ADD COLUMN "authorizedGuardianId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelVisitorLog" ADD COLUMN "visitorType" TEXT NOT NULL DEFAULT 'PARENT';
ALTER TABLE "HostelVisitorLog" ADD COLUMN "visitorPhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelVisitorLog" ADD COLUMN "visitorIdNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelVisitorLog" ADD COLUMN "photoUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelVisitorLog" ADD COLUMN "meetingWith" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelVisitorLog" ADD COLUMN "visitStatus" TEXT NOT NULL DEFAULT 'EXITED';
ALTER TABLE "HostelVisitorLog" ADD COLUMN "otpCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelVisitorLog" ADD COLUMN "otpVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HostelVisitorLog" ADD COLUMN "otpExpiresAt" TIMESTAMP(3);
ALTER TABLE "HostelVisitorLog" ADD COLUMN "preRegistrationId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelVisitorLog" ADD COLUMN "qrToken" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelVisitorLog" ADD COLUMN "wardenStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "HostelVisitorLog" ADD COLUMN "wardenApprovedBy" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelVisitorLog" ADD COLUMN "entryAt" TIMESTAMP(3);
ALTER TABLE "HostelVisitorLog" ADD COLUMN "exitAt" TIMESTAMP(3);
ALTER TABLE "HostelVisitorLog" ADD COLUMN "gateDeviceId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelVisitorLog" ADD COLUMN "gateIpAddress" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelVisitorLog" ADD COLUMN "canTakeStudentOut" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HostelVisitorLog" ADD COLUMN "overrideBy" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelVisitorLog" ADD COLUMN "overrideReason" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelVisitorLog" ADD COLUMN "blacklistChecked" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "HostelVisitorLog" ADD COLUMN "academicYear" TEXT NOT NULL DEFAULT '2025-26';
ALTER TABLE "HostelVisitorLog" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "HostelAuthorizedGuardian" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL DEFAULT '',
    "hostelId" TEXT NOT NULL DEFAULT '',
    "guardianName" TEXT NOT NULL,
    "guardianPhone" TEXT NOT NULL,
    "relation" TEXT NOT NULL DEFAULT 'Guardian',
    "idNumberEncrypted" TEXT NOT NULL DEFAULT '',
    "canTakeStudentOut" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelAuthorizedGuardian_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelVisitorBlacklist" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "idNumber" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'BANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelVisitorBlacklist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelVisitorPreRegistration" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL DEFAULT '',
    "studentProfileId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "visitorPhone" TEXT NOT NULL DEFAULT '',
    "visitorType" TEXT NOT NULL DEFAULT 'PARENT',
    "scheduledDate" DATE NOT NULL,
    "scheduledTime" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "qrToken" TEXT NOT NULL DEFAULT '',
    "requestedBy" TEXT NOT NULL DEFAULT 'Parent',
    "wardenApprovedBy" TEXT NOT NULL DEFAULT '',
    "rejectionReason" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelVisitorPreRegistration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HostelVisitorLog_institutionId_visitStatus_visitDate_idx" ON "HostelVisitorLog"("institutionId", "visitStatus", "visitDate");
CREATE INDEX "HostelVisitorLog_institutionId_visitorPhone_idx" ON "HostelVisitorLog"("institutionId", "visitorPhone");
CREATE INDEX "HostelVisitorLog_qrToken_idx" ON "HostelVisitorLog"("qrToken");

CREATE INDEX "HostelAuthorizedGuardian_institutionId_studentProfileId_status_idx" ON "HostelAuthorizedGuardian"("institutionId", "studentProfileId", "status");
CREATE INDEX "HostelAuthorizedGuardian_institutionId_guardianPhone_idx" ON "HostelAuthorizedGuardian"("institutionId", "guardianPhone");

CREATE INDEX "HostelVisitorBlacklist_institutionId_status_idx" ON "HostelVisitorBlacklist"("institutionId", "status");
CREATE INDEX "HostelVisitorBlacklist_institutionId_phone_idx" ON "HostelVisitorBlacklist"("institutionId", "phone");

CREATE INDEX "HostelVisitorPreRegistration_institutionId_scheduledDate_status_idx" ON "HostelVisitorPreRegistration"("institutionId", "scheduledDate", "status");
CREATE INDEX "HostelVisitorPreRegistration_institutionId_qrToken_idx" ON "HostelVisitorPreRegistration"("institutionId", "qrToken");

ALTER TABLE "HostelAuthorizedGuardian" ADD CONSTRAINT "HostelAuthorizedGuardian_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelAuthorizedGuardian" ADD CONSTRAINT "HostelAuthorizedGuardian_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "HostelStudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelVisitorBlacklist" ADD CONSTRAINT "HostelVisitorBlacklist_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelVisitorPreRegistration" ADD CONSTRAINT "HostelVisitorPreRegistration_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
