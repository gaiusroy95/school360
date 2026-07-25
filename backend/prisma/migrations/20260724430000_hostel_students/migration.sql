CREATE TABLE "HostelStudentProfile" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "hostelId" TEXT,
    "allotmentId" TEXT NOT NULL DEFAULT '',
    "lastSyncedAt" TIMESTAMP(3),
    "photoUrl" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "branchName" TEXT NOT NULL DEFAULT '',
    "batchLabel" TEXT NOT NULL DEFAULT '',
    "roomNumber" TEXT NOT NULL DEFAULT '',
    "bedNumber" TEXT NOT NULL DEFAULT '',
    "blockName" TEXT NOT NULL DEFAULT '',
    "localGuardianName" TEXT NOT NULL DEFAULT '',
    "localGuardianMobile" TEXT NOT NULL DEFAULT '',
    "localGuardianRelation" TEXT NOT NULL DEFAULT '',
    "localGuardianAddress" TEXT NOT NULL DEFAULT '',
    "localGuardianIdType" TEXT NOT NULL DEFAULT '',
    "localGuardianIdEncrypted" TEXT NOT NULL DEFAULT '',
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "dietaryPreference" TEXT NOT NULL DEFAULT 'VEG',
    "medicalRestrictions" TEXT NOT NULL DEFAULT '',
    "allergies" TEXT NOT NULL DEFAULT '',
    "bloodGroup" TEXT NOT NULL DEFAULT '',
    "currentMedications" TEXT NOT NULL DEFAULT '',
    "disciplinaryPoints" INTEGER NOT NULL DEFAULT 0,
    "docVerificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "residentStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelStudentProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelStudentDocument" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "docType" TEXT NOT NULL DEFAULT 'GUARDIAN_ID',
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL DEFAULT '',
    "encryptedRef" TEXT NOT NULL DEFAULT '',
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedBy" TEXT NOT NULL DEFAULT '',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelStudentDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelStudentUpdateRequest" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL DEFAULT 'Parent',
    "fieldChanges" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT NOT NULL DEFAULT '',
    "rejectionReason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelStudentUpdateRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HostelStudentProfile_studentId_key" ON "HostelStudentProfile"("studentId");
CREATE INDEX "HostelStudentProfile_institutionId_academicYear_residentStatus_idx" ON "HostelStudentProfile"("institutionId", "academicYear", "residentStatus");
CREATE INDEX "HostelStudentProfile_institutionId_hostelId_idx" ON "HostelStudentProfile"("institutionId", "hostelId");
CREATE INDEX "HostelStudentProfile_institutionId_branchName_batchLabel_idx" ON "HostelStudentProfile"("institutionId", "branchName", "batchLabel");

CREATE INDEX "HostelStudentDocument_institutionId_profileId_idx" ON "HostelStudentDocument"("institutionId", "profileId");
CREATE INDEX "HostelStudentDocument_institutionId_verificationStatus_idx" ON "HostelStudentDocument"("institutionId", "verificationStatus");

CREATE INDEX "HostelStudentUpdateRequest_institutionId_status_idx" ON "HostelStudentUpdateRequest"("institutionId", "status");
CREATE INDEX "HostelStudentUpdateRequest_profileId_idx" ON "HostelStudentUpdateRequest"("profileId");

ALTER TABLE "HostelStudentProfile" ADD CONSTRAINT "HostelStudentProfile_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelStudentProfile" ADD CONSTRAINT "HostelStudentProfile_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelStudentProfile" ADD CONSTRAINT "HostelStudentProfile_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "HostelMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HostelStudentDocument" ADD CONSTRAINT "HostelStudentDocument_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelStudentDocument" ADD CONSTRAINT "HostelStudentDocument_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "HostelStudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelStudentUpdateRequest" ADD CONSTRAINT "HostelStudentUpdateRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelStudentUpdateRequest" ADD CONSTRAINT "HostelStudentUpdateRequest_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "HostelStudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
