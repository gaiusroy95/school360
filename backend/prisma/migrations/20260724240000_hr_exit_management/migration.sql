-- SEMS: Staff Resignation, Exit Management & Full & Final Settlement

CREATE TABLE "HrExitResignation" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "caseNumber" TEXT NOT NULL,
    "employeeId" TEXT, "employeeCode" TEXT NOT NULL DEFAULT '', "employeeName" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT '', "designation" TEXT NOT NULL DEFAULT '',
    "branch" TEXT NOT NULL DEFAULT 'Main Campus', "reportingManager" TEXT NOT NULL DEFAULT '',
    "dateOfResignation" DATE, "requestedLastWorkingDay" DATE,
    "noticePeriodDays" INTEGER NOT NULL DEFAULT 30, "noticeStartDate" DATE, "noticeEndDate" DATE,
    "resignationType" TEXT NOT NULL DEFAULT 'Voluntary', "detailedReason" TEXT NOT NULL DEFAULT '',
    "supportingDocuments" JSONB NOT NULL DEFAULT '[]', "preferredContactAfterExit" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT', "workflowStage" TEXT NOT NULL DEFAULT 'RESIGNATION_SUBMITTED',
    "approvalStage" TEXT NOT NULL DEFAULT 'REPORTING_MANAGER', "retentionStatus" TEXT NOT NULL DEFAULT '',
    "erpDeactivated" BOOLEAN NOT NULL DEFAULT false, "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrExitResignation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrExitApproval" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "resignationId" TEXT NOT NULL,
    "approverRole" TEXT NOT NULL, "approverName" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL DEFAULT 'PENDING', "remarks" TEXT NOT NULL DEFAULT '',
    "actionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrExitApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrExitRetention" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "resignationId" TEXT NOT NULL,
    "retentionType" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrExitRetention_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrExitHandover" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "resignationId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Administrative Staff', "taskType" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '', "successor" TEXT NOT NULL DEFAULT '',
    "dueDate" DATE, "status" TEXT NOT NULL DEFAULT 'PENDING',
    "supportingDocuments" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrExitHandover_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrExitKnowledgeTransfer" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "resignationId" TEXT NOT NULL,
    "transferType" TEXT NOT NULL, "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING', "dueDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrExitKnowledgeTransfer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrExitClearance" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "resignationId" TEXT NOT NULL,
    "department" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
    "recoveryAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingItems" TEXT NOT NULL DEFAULT '', "remarks" TEXT NOT NULL DEFAULT '',
    "clearedBy" TEXT NOT NULL DEFAULT '', "clearedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrExitClearance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrExitAssetRecovery" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "resignationId" TEXT NOT NULL,
    "assetType" TEXT NOT NULL, "assetId" TEXT NOT NULL DEFAULT '',
    "condition" TEXT NOT NULL DEFAULT 'Good', "returnDate" DATE,
    "damageCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recoveryAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrExitAssetRecovery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrExitFnfSettlement" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "resignationId" TEXT NOT NULL,
    "earnings" JSONB NOT NULL DEFAULT '[]', "deductions" JSONB NOT NULL DEFAULT '[]',
    "leaveEncashment" DOUBLE PRECISION NOT NULL DEFAULT 0, "netAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentDate" DATE, "paymentMode" TEXT NOT NULL DEFAULT '',
    "settlementStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrExitFnfSettlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrExitLeaveSettlement" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "resignationId" TEXT NOT NULL,
    "earnedLeave" DOUBLE PRECISION NOT NULL DEFAULT 0, "casualLeave" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sickLeave" DOUBLE PRECISION NOT NULL DEFAULT 0, "compOff" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "encashmentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "negativeLeaveRecovery" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrExitLeaveSettlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrExitInterview" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "resignationId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3), "responses" JSONB NOT NULL DEFAULT '[]',
    "hrNotes" TEXT NOT NULL DEFAULT '', "rehireInterest" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrExitInterview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrExitDocument" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "resignationId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL, "fileName" TEXT NOT NULL DEFAULT '',
    "qrVerified" BOOLEAN NOT NULL DEFAULT false, "digitalSigned" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3), "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrExitDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrExitAlumniRecord" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "resignationId" TEXT NOT NULL,
    "employeeId" TEXT, "rehireEligibility" TEXT NOT NULL DEFAULT 'Eligible for Rehire',
    "employmentHistory" JSONB NOT NULL DEFAULT '[]', "exitDocuments" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrExitAlumniRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrExitAuditLog" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "resignationId" TEXT NOT NULL,
    "action" TEXT NOT NULL, "performedBy" TEXT NOT NULL DEFAULT 'HR Executive',
    "previousValue" TEXT NOT NULL DEFAULT '', "currentValue" TEXT NOT NULL DEFAULT '',
    "ipAddress" TEXT NOT NULL DEFAULT '', "device" TEXT NOT NULL DEFAULT 'Web',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HrExitAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrExitSettings" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL,
    "exitWorkflow" JSONB NOT NULL DEFAULT '[]', "moduleStructure" JSONB NOT NULL DEFAULT '[]',
    "approvalWorkflow" JSONB NOT NULL DEFAULT '[]', "clearanceWorkflow" JSONB NOT NULL DEFAULT '[]',
    "roleMatrix" JSONB NOT NULL DEFAULT '[]', "resignationReasons" JSONB NOT NULL DEFAULT '[]',
    "noticePeriodPolicies" JSONB NOT NULL DEFAULT '[]', "handoverTemplates" JSONB NOT NULL DEFAULT '[]',
    "assetCategories" JSONB NOT NULL DEFAULT '[]', "interviewTemplate" JSONB NOT NULL DEFAULT '[]',
    "documentTemplates" JSONB NOT NULL DEFAULT '[]', "fnfRules" JSONB NOT NULL DEFAULT '{}',
    "notificationRules" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrExitSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HrExitResignation_institutionId_caseNumber_key" ON "HrExitResignation"("institutionId", "caseNumber");
CREATE INDEX "HrExitResignation_institutionId_status_idx" ON "HrExitResignation"("institutionId", "status");
CREATE INDEX "HrExitResignation_institutionId_workflowStage_idx" ON "HrExitResignation"("institutionId", "workflowStage");
CREATE INDEX "HrExitResignation_employeeId_idx" ON "HrExitResignation"("employeeId");
CREATE INDEX "HrExitApproval_resignationId_idx" ON "HrExitApproval"("resignationId");
CREATE INDEX "HrExitApproval_institutionId_action_idx" ON "HrExitApproval"("institutionId", "action");
CREATE INDEX "HrExitRetention_resignationId_idx" ON "HrExitRetention"("resignationId");
CREATE INDEX "HrExitHandover_resignationId_idx" ON "HrExitHandover"("resignationId");
CREATE INDEX "HrExitKnowledgeTransfer_resignationId_idx" ON "HrExitKnowledgeTransfer"("resignationId");
CREATE INDEX "HrExitClearance_resignationId_idx" ON "HrExitClearance"("resignationId");
CREATE INDEX "HrExitClearance_institutionId_department_idx" ON "HrExitClearance"("institutionId", "department");
CREATE INDEX "HrExitAssetRecovery_resignationId_idx" ON "HrExitAssetRecovery"("resignationId");
CREATE UNIQUE INDEX "HrExitFnfSettlement_resignationId_key" ON "HrExitFnfSettlement"("resignationId");
CREATE UNIQUE INDEX "HrExitLeaveSettlement_resignationId_key" ON "HrExitLeaveSettlement"("resignationId");
CREATE UNIQUE INDEX "HrExitInterview_resignationId_key" ON "HrExitInterview"("resignationId");
CREATE INDEX "HrExitDocument_resignationId_idx" ON "HrExitDocument"("resignationId");
CREATE UNIQUE INDEX "HrExitAlumniRecord_resignationId_key" ON "HrExitAlumniRecord"("resignationId");
CREATE INDEX "HrExitAuditLog_resignationId_idx" ON "HrExitAuditLog"("resignationId");
CREATE INDEX "HrExitAuditLog_institutionId_createdAt_idx" ON "HrExitAuditLog"("institutionId", "createdAt");
CREATE UNIQUE INDEX "HrExitSettings_institutionId_key" ON "HrExitSettings"("institutionId");

ALTER TABLE "HrExitResignation" ADD CONSTRAINT "HrExitResignation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitResignation" ADD CONSTRAINT "HrExitResignation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HrExitApproval" ADD CONSTRAINT "HrExitApproval_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitApproval" ADD CONSTRAINT "HrExitApproval_resignationId_fkey" FOREIGN KEY ("resignationId") REFERENCES "HrExitResignation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitRetention" ADD CONSTRAINT "HrExitRetention_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitRetention" ADD CONSTRAINT "HrExitRetention_resignationId_fkey" FOREIGN KEY ("resignationId") REFERENCES "HrExitResignation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitHandover" ADD CONSTRAINT "HrExitHandover_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitHandover" ADD CONSTRAINT "HrExitHandover_resignationId_fkey" FOREIGN KEY ("resignationId") REFERENCES "HrExitResignation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitKnowledgeTransfer" ADD CONSTRAINT "HrExitKnowledgeTransfer_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitKnowledgeTransfer" ADD CONSTRAINT "HrExitKnowledgeTransfer_resignationId_fkey" FOREIGN KEY ("resignationId") REFERENCES "HrExitResignation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitClearance" ADD CONSTRAINT "HrExitClearance_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitClearance" ADD CONSTRAINT "HrExitClearance_resignationId_fkey" FOREIGN KEY ("resignationId") REFERENCES "HrExitResignation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitAssetRecovery" ADD CONSTRAINT "HrExitAssetRecovery_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitAssetRecovery" ADD CONSTRAINT "HrExitAssetRecovery_resignationId_fkey" FOREIGN KEY ("resignationId") REFERENCES "HrExitResignation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitFnfSettlement" ADD CONSTRAINT "HrExitFnfSettlement_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitFnfSettlement" ADD CONSTRAINT "HrExitFnfSettlement_resignationId_fkey" FOREIGN KEY ("resignationId") REFERENCES "HrExitResignation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitLeaveSettlement" ADD CONSTRAINT "HrExitLeaveSettlement_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitLeaveSettlement" ADD CONSTRAINT "HrExitLeaveSettlement_resignationId_fkey" FOREIGN KEY ("resignationId") REFERENCES "HrExitResignation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitInterview" ADD CONSTRAINT "HrExitInterview_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitInterview" ADD CONSTRAINT "HrExitInterview_resignationId_fkey" FOREIGN KEY ("resignationId") REFERENCES "HrExitResignation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitDocument" ADD CONSTRAINT "HrExitDocument_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitDocument" ADD CONSTRAINT "HrExitDocument_resignationId_fkey" FOREIGN KEY ("resignationId") REFERENCES "HrExitResignation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitAlumniRecord" ADD CONSTRAINT "HrExitAlumniRecord_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitAlumniRecord" ADD CONSTRAINT "HrExitAlumniRecord_resignationId_fkey" FOREIGN KEY ("resignationId") REFERENCES "HrExitResignation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitAuditLog" ADD CONSTRAINT "HrExitAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitAuditLog" ADD CONSTRAINT "HrExitAuditLog_resignationId_fkey" FOREIGN KEY ("resignationId") REFERENCES "HrExitResignation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrExitSettings" ADD CONSTRAINT "HrExitSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
