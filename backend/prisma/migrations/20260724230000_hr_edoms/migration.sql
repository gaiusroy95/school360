-- EDOMS tables (see schema.prisma for full definitions)

CREATE TABLE "HrEdomsOnboarding" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "caseNumber" TEXT NOT NULL,
    "candidateName" TEXT NOT NULL, "candidateEmail" TEXT NOT NULL DEFAULT '',
    "candidateMobile" TEXT NOT NULL DEFAULT '', "employeeId" TEXT,
    "recruitmentApplicationId" TEXT NOT NULL DEFAULT '', "department" TEXT NOT NULL DEFAULT '',
    "designation" TEXT NOT NULL DEFAULT '', "joiningDate" DATE,
    "workflowStage" TEXT NOT NULL DEFAULT 'CANDIDATE_SELECTED',
    "verificationStage" TEXT NOT NULL DEFAULT 'CANDIDATE_UPLOAD',
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "personalInfo" JSONB NOT NULL DEFAULT '{}', "reportingManager" TEXT NOT NULL DEFAULT '',
    "employeeCode" TEXT NOT NULL DEFAULT '', "preOnboardingActive" BOOLEAN NOT NULL DEFAULT false,
    "portalActivatedAt" TIMESTAMP(3), "approvedAt" TIMESTAMP(3), "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrEdomsOnboarding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrEdomsDocument" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "onboardingId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Personal', "documentType" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL DEFAULT '', "fileName" TEXT NOT NULL DEFAULT '',
    "issueDate" DATE, "expiryDate" DATE, "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedBy" TEXT NOT NULL DEFAULT '', "verifiedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1, "previousVersionId" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrEdomsDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrEdomsQualification" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "onboardingId" TEXT NOT NULL,
    "qualification" TEXT NOT NULL, "boardUniversity" TEXT NOT NULL DEFAULT '',
    "institutionName" TEXT NOT NULL DEFAULT '', "yearOfPassing" INTEGER NOT NULL DEFAULT 0,
    "percentage" TEXT NOT NULL DEFAULT '', "majorSubject" TEXT NOT NULL DEFAULT '',
    "certificateFile" TEXT NOT NULL DEFAULT '', "marksheetFile" TEXT NOT NULL DEFAULT '',
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrEdomsQualification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrEdomsEmploymentHistory" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "onboardingId" TEXT NOT NULL,
    "organization" TEXT NOT NULL, "designation" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT '', "periodFrom" TEXT NOT NULL DEFAULT '',
    "periodTo" TEXT NOT NULL DEFAULT '', "lastSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reportingManager" TEXT NOT NULL DEFAULT '', "experienceCertificate" TEXT NOT NULL DEFAULT '',
    "referenceContact" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrEdomsEmploymentHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrEdomsVerification" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "onboardingId" TEXT NOT NULL,
    "checkType" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT NOT NULL DEFAULT '', "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrEdomsVerification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrEdomsChecklist" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "onboardingId" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'HR', "item" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false, "completedBy" TEXT NOT NULL DEFAULT '',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrEdomsChecklist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrEdomsAsset" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "onboardingId" TEXT NOT NULL,
    "assetType" TEXT NOT NULL, "assetId" TEXT NOT NULL DEFAULT '',
    "serialNumber" TEXT NOT NULL DEFAULT '', "issueDate" DATE, "returnDate" DATE,
    "condition" TEXT NOT NULL DEFAULT 'GOOD', "agreementSigned" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrEdomsAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrEdomsSystemAccess" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "onboardingId" TEXT NOT NULL,
    "systemName" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT '',
    "permissions" JSONB NOT NULL DEFAULT '[]', "emailAddress" TEXT NOT NULL DEFAULT '',
    "erpLogin" TEXT NOT NULL DEFAULT '', "mobileAppAccess" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING', "provisionedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrEdomsSystemAccess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrEdomsInduction" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "onboardingId" TEXT NOT NULL,
    "sessionName" TEXT NOT NULL, "sessionDate" DATE,
    "attended" BOOLEAN NOT NULL DEFAULT false, "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrEdomsInduction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrEdomsProbation" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "onboardingId" TEXT NOT NULL,
    "startDate" DATE NOT NULL, "endDate" DATE NOT NULL,
    "mentorName" TEXT NOT NULL DEFAULT '', "goals" JSONB NOT NULL DEFAULT '[]',
    "monthlyReviews" JSONB NOT NULL DEFAULT '[]', "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "action" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrEdomsProbation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrEdomsEmploymentLetter" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "onboardingId" TEXT NOT NULL,
    "letterType" TEXT NOT NULL, "fileName" TEXT NOT NULL DEFAULT '',
    "qrVerified" BOOLEAN NOT NULL DEFAULT true, "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3), "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrEdomsEmploymentLetter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrEdomsAuditLog" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "onboardingId" TEXT NOT NULL,
    "action" TEXT NOT NULL, "performedBy" TEXT NOT NULL DEFAULT 'System',
    "ipAddress" TEXT NOT NULL DEFAULT '', "device" TEXT NOT NULL DEFAULT '',
    "previousValue" TEXT NOT NULL DEFAULT '', "currentValue" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HrEdomsAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrEdomsSettings" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL,
    "documentTypes" JSONB NOT NULL DEFAULT '[]',
    "onboardingWorkflow" JSONB NOT NULL DEFAULT '[]',
    "verificationWorkflow" JSONB NOT NULL DEFAULT '[]',
    "moduleStructure" JSONB NOT NULL DEFAULT '[]',
    "roleMatrix" JSONB NOT NULL DEFAULT '[]',
    "automationRules" JSONB NOT NULL DEFAULT '{}',
    "expiryAlertDays" JSONB NOT NULL DEFAULT '[90,60,30,7,0]',
    "retentionPolicy" TEXT NOT NULL DEFAULT '7 years',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrEdomsSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HrEdomsOnboarding_institutionId_caseNumber_key" ON "HrEdomsOnboarding"("institutionId", "caseNumber");
CREATE INDEX "HrEdomsOnboarding_institutionId_status_idx" ON "HrEdomsOnboarding"("institutionId", "status");
CREATE INDEX "HrEdomsOnboarding_employeeId_idx" ON "HrEdomsOnboarding"("employeeId");
CREATE INDEX "HrEdomsDocument_onboardingId_category_idx" ON "HrEdomsDocument"("onboardingId", "category");
CREATE INDEX "HrEdomsDocument_institutionId_status_idx" ON "HrEdomsDocument"("institutionId", "status");
CREATE INDEX "HrEdomsDocument_expiryDate_idx" ON "HrEdomsDocument"("expiryDate");
CREATE INDEX "HrEdomsQualification_onboardingId_idx" ON "HrEdomsQualification"("onboardingId");
CREATE INDEX "HrEdomsEmploymentHistory_onboardingId_idx" ON "HrEdomsEmploymentHistory"("onboardingId");
CREATE INDEX "HrEdomsVerification_onboardingId_idx" ON "HrEdomsVerification"("onboardingId");
CREATE INDEX "HrEdomsChecklist_onboardingId_department_idx" ON "HrEdomsChecklist"("onboardingId", "department");
CREATE INDEX "HrEdomsAsset_onboardingId_idx" ON "HrEdomsAsset"("onboardingId");
CREATE INDEX "HrEdomsSystemAccess_onboardingId_idx" ON "HrEdomsSystemAccess"("onboardingId");
CREATE INDEX "HrEdomsInduction_onboardingId_idx" ON "HrEdomsInduction"("onboardingId");
CREATE UNIQUE INDEX "HrEdomsProbation_onboardingId_key" ON "HrEdomsProbation"("onboardingId");
CREATE INDEX "HrEdomsEmploymentLetter_onboardingId_idx" ON "HrEdomsEmploymentLetter"("onboardingId");
CREATE INDEX "HrEdomsAuditLog_onboardingId_idx" ON "HrEdomsAuditLog"("onboardingId");
CREATE INDEX "HrEdomsAuditLog_institutionId_createdAt_idx" ON "HrEdomsAuditLog"("institutionId", "createdAt");
CREATE UNIQUE INDEX "HrEdomsSettings_institutionId_key" ON "HrEdomsSettings"("institutionId");

ALTER TABLE "HrEdomsOnboarding" ADD CONSTRAINT "HrEdomsOnboarding_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsOnboarding" ADD CONSTRAINT "HrEdomsOnboarding_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HrEdomsDocument" ADD CONSTRAINT "HrEdomsDocument_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsDocument" ADD CONSTRAINT "HrEdomsDocument_onboardingId_fkey" FOREIGN KEY ("onboardingId") REFERENCES "HrEdomsOnboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsQualification" ADD CONSTRAINT "HrEdomsQualification_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsQualification" ADD CONSTRAINT "HrEdomsQualification_onboardingId_fkey" FOREIGN KEY ("onboardingId") REFERENCES "HrEdomsOnboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsEmploymentHistory" ADD CONSTRAINT "HrEdomsEmploymentHistory_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsEmploymentHistory" ADD CONSTRAINT "HrEdomsEmploymentHistory_onboardingId_fkey" FOREIGN KEY ("onboardingId") REFERENCES "HrEdomsOnboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsVerification" ADD CONSTRAINT "HrEdomsVerification_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsVerification" ADD CONSTRAINT "HrEdomsVerification_onboardingId_fkey" FOREIGN KEY ("onboardingId") REFERENCES "HrEdomsOnboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsChecklist" ADD CONSTRAINT "HrEdomsChecklist_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsChecklist" ADD CONSTRAINT "HrEdomsChecklist_onboardingId_fkey" FOREIGN KEY ("onboardingId") REFERENCES "HrEdomsOnboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsAsset" ADD CONSTRAINT "HrEdomsAsset_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsAsset" ADD CONSTRAINT "HrEdomsAsset_onboardingId_fkey" FOREIGN KEY ("onboardingId") REFERENCES "HrEdomsOnboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsSystemAccess" ADD CONSTRAINT "HrEdomsSystemAccess_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsSystemAccess" ADD CONSTRAINT "HrEdomsSystemAccess_onboardingId_fkey" FOREIGN KEY ("onboardingId") REFERENCES "HrEdomsOnboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsInduction" ADD CONSTRAINT "HrEdomsInduction_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsInduction" ADD CONSTRAINT "HrEdomsInduction_onboardingId_fkey" FOREIGN KEY ("onboardingId") REFERENCES "HrEdomsOnboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsProbation" ADD CONSTRAINT "HrEdomsProbation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsProbation" ADD CONSTRAINT "HrEdomsProbation_onboardingId_fkey" FOREIGN KEY ("onboardingId") REFERENCES "HrEdomsOnboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsEmploymentLetter" ADD CONSTRAINT "HrEdomsEmploymentLetter_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsEmploymentLetter" ADD CONSTRAINT "HrEdomsEmploymentLetter_onboardingId_fkey" FOREIGN KEY ("onboardingId") REFERENCES "HrEdomsOnboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsAuditLog" ADD CONSTRAINT "HrEdomsAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsAuditLog" ADD CONSTRAINT "HrEdomsAuditLog_onboardingId_fkey" FOREIGN KEY ("onboardingId") REFERENCES "HrEdomsOnboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrEdomsSettings" ADD CONSTRAINT "HrEdomsSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
