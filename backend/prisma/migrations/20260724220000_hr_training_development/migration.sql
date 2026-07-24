-- CreateTable
CREATE TABLE "HrTrainingCategory" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentGroup" TEXT NOT NULL DEFAULT 'Academic',
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrTrainingCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrTrainingCourse" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "categoryId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "level" TEXT NOT NULL DEFAULT 'BEGINNER',
    "durationHours" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "credits" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "mode" TEXT NOT NULL DEFAULT 'CLASSROOM',
    "language" TEXT NOT NULL DEFAULT 'English',
    "validityMonths" INTEGER NOT NULL DEFAULT 12,
    "passingMarks" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "certificationRequired" BOOLEAN NOT NULL DEFAULT true,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "targetAudience" TEXT NOT NULL DEFAULT 'ALL',
    "deliveryModes" JSONB NOT NULL DEFAULT '["Classroom"]',
    "modules" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrTrainingCourse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrTrainingTrainer" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "trainerType" TEXT NOT NULL DEFAULT 'INTERNAL',
    "employeeId" TEXT NOT NULL DEFAULT '',
    "fullName" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT '',
    "organization" TEXT NOT NULL DEFAULT '',
    "expertise" TEXT NOT NULL DEFAULT '',
    "experienceYears" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "certification" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "feesPerSession" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrTrainingTrainer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrTrainingVenue" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "venueType" TEXT NOT NULL DEFAULT 'CLASSROOM',
    "branch" TEXT NOT NULL DEFAULT 'Main Campus',
    "capacity" INTEGER NOT NULL DEFAULT 30,
    "virtualLink" TEXT NOT NULL DEFAULT '',
    "platform" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrTrainingVenue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrTrainingNeed" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ANNUAL_APPRAISAL',
    "department" TEXT NOT NULL,
    "designation" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL DEFAULT '',
    "employeeId" TEXT NOT NULL DEFAULT '',
    "employeeName" TEXT NOT NULL DEFAULT '',
    "skillGap" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "trainingType" TEXT NOT NULL DEFAULT 'CLASSROOM',
    "expectedOutcome" TEXT NOT NULL DEFAULT '',
    "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'IDENTIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrTrainingNeed_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrTrainingAnnualPlan" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "totalBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "workflowStage" TEXT NOT NULL DEFAULT 'DRAFT',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "calendarPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrTrainingAnnualPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrTrainingBatch" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "trainerId" TEXT,
    "venueId" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 30,
    "branch" TEXT NOT NULL DEFAULT 'Main Campus',
    "sessionDate" DATE NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '10:00',
    "endTime" TEXT NOT NULL DEFAULT '13:00',
    "sessionType" TEXT NOT NULL DEFAULT 'CLASSROOM',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "virtualLink" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrTrainingBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrTrainingNomination" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "nominationMethod" TEXT NOT NULL DEFAULT 'HR_ASSIGNED',
    "workflowStage" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrTrainingNomination_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrTrainingAttendance" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "nominationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'QR',
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedToHrms" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrTrainingAttendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrTrainingAssessment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "nominationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "questionBank" JSONB NOT NULL DEFAULT '[]',
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrTrainingAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrTrainingAssignment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "nominationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assignmentType" TEXT NOT NULL DEFAULT 'LESSON_PLAN',
    "fileName" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrTrainingAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrTrainingFeedback" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "nominationId" TEXT NOT NULL,
    "feedbackBy" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "comments" TEXT NOT NULL DEFAULT '',
    "effectivenessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrTrainingFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrTrainingCompetency" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Teaching Skills',
    "description" TEXT NOT NULL DEFAULT '',
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrTrainingCompetency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrTrainingCertificate" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "nominationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "certificateType" TEXT NOT NULL DEFAULT 'COMPLETION',
    "certificateNumber" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" DATE,
    "qrVerified" BOOLEAN NOT NULL DEFAULT true,
    "badgeName" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrTrainingCertificate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrTrainingBudget" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Trainer Cost',
    "allocated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utilized" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrTrainingBudget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrTrainingExternal" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "programType" TEXT NOT NULL DEFAULT 'WORKSHOP',
    "employeeName" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL DEFAULT '',
    "startDate" DATE,
    "endDate" DATE,
    "expenseAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "certificateUploaded" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrTrainingExternal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrTrainingIdp" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "skillGaps" JSONB NOT NULL DEFAULT '[]',
    "recommendedTraining" JSONB NOT NULL DEFAULT '[]',
    "mentorName" TEXT NOT NULL DEFAULT '',
    "timeline" TEXT NOT NULL DEFAULT '',
    "targetScore" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "completionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nextReview" DATE,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrTrainingIdp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HrTrainingSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "workflowStages" JSONB NOT NULL DEFAULT '[]',
    "automationRules" JSONB NOT NULL DEFAULT '{}',
    "nominationWorkflow" JSONB NOT NULL DEFAULT '[]',
    "feedbackWorkflow" JSONB NOT NULL DEFAULT '[]',
    "roleMatrix" JSONB NOT NULL DEFAULT '[]',
    "mobileSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrTrainingSettings_pkey" PRIMARY KEY ("id")
);

-- Indexes & FKs
CREATE UNIQUE INDEX "HrTrainingCategory_institutionId_code_key" ON "HrTrainingCategory"("institutionId", "code");
CREATE UNIQUE INDEX "HrTrainingCourse_institutionId_code_key" ON "HrTrainingCourse"("institutionId", "code");
CREATE UNIQUE INDEX "HrTrainingVenue_institutionId_code_key" ON "HrTrainingVenue"("institutionId", "code");
CREATE INDEX "HrTrainingNeed_institutionId_academicYear_idx" ON "HrTrainingNeed"("institutionId", "academicYear");
CREATE UNIQUE INDEX "HrTrainingAnnualPlan_institutionId_academicYear_key" ON "HrTrainingAnnualPlan"("institutionId", "academicYear");
CREATE UNIQUE INDEX "HrTrainingBatch_institutionId_batchCode_key" ON "HrTrainingBatch"("institutionId", "batchCode");
CREATE INDEX "HrTrainingBatch_institutionId_sessionDate_idx" ON "HrTrainingBatch"("institutionId", "sessionDate");
CREATE UNIQUE INDEX "HrTrainingNomination_batchId_employeeId_key" ON "HrTrainingNomination"("batchId", "employeeId");
CREATE INDEX "HrTrainingNomination_institutionId_status_idx" ON "HrTrainingNomination"("institutionId", "status");
CREATE INDEX "HrTrainingAttendance_nominationId_idx" ON "HrTrainingAttendance"("nominationId");
CREATE INDEX "HrTrainingAssessment_nominationId_idx" ON "HrTrainingAssessment"("nominationId");
CREATE INDEX "HrTrainingAssignment_nominationId_idx" ON "HrTrainingAssignment"("nominationId");
CREATE INDEX "HrTrainingFeedback_nominationId_idx" ON "HrTrainingFeedback"("nominationId");
CREATE UNIQUE INDEX "HrTrainingCompetency_institutionId_code_key" ON "HrTrainingCompetency"("institutionId", "code");
CREATE UNIQUE INDEX "HrTrainingCertificate_institutionId_certificateNumber_key" ON "HrTrainingCertificate"("institutionId", "certificateNumber");
CREATE INDEX "HrTrainingCertificate_employeeId_idx" ON "HrTrainingCertificate"("employeeId");
CREATE INDEX "HrTrainingBudget_institutionId_academicYear_idx" ON "HrTrainingBudget"("institutionId", "academicYear");
CREATE INDEX "HrTrainingExternal_institutionId_idx" ON "HrTrainingExternal"("institutionId");
CREATE INDEX "HrTrainingIdp_institutionId_employeeId_academicYear_idx" ON "HrTrainingIdp"("institutionId", "employeeId", "academicYear");
CREATE UNIQUE INDEX "HrTrainingSettings_institutionId_key" ON "HrTrainingSettings"("institutionId");
CREATE INDEX "HrTrainingTrainer_institutionId_trainerType_idx" ON "HrTrainingTrainer"("institutionId", "trainerType");

ALTER TABLE "HrTrainingCategory" ADD CONSTRAINT "HrTrainingCategory_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingCourse" ADD CONSTRAINT "HrTrainingCourse_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingCourse" ADD CONSTRAINT "HrTrainingCourse_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "HrTrainingCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HrTrainingTrainer" ADD CONSTRAINT "HrTrainingTrainer_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingVenue" ADD CONSTRAINT "HrTrainingVenue_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingNeed" ADD CONSTRAINT "HrTrainingNeed_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingAnnualPlan" ADD CONSTRAINT "HrTrainingAnnualPlan_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingBatch" ADD CONSTRAINT "HrTrainingBatch_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingBatch" ADD CONSTRAINT "HrTrainingBatch_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "HrTrainingCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingBatch" ADD CONSTRAINT "HrTrainingBatch_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "HrTrainingTrainer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HrTrainingBatch" ADD CONSTRAINT "HrTrainingBatch_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "HrTrainingVenue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HrTrainingNomination" ADD CONSTRAINT "HrTrainingNomination_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingNomination" ADD CONSTRAINT "HrTrainingNomination_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "HrTrainingBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingNomination" ADD CONSTRAINT "HrTrainingNomination_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingAttendance" ADD CONSTRAINT "HrTrainingAttendance_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingAttendance" ADD CONSTRAINT "HrTrainingAttendance_nominationId_fkey" FOREIGN KEY ("nominationId") REFERENCES "HrTrainingNomination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingAttendance" ADD CONSTRAINT "HrTrainingAttendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingAssessment" ADD CONSTRAINT "HrTrainingAssessment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingAssessment" ADD CONSTRAINT "HrTrainingAssessment_nominationId_fkey" FOREIGN KEY ("nominationId") REFERENCES "HrTrainingNomination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingAssignment" ADD CONSTRAINT "HrTrainingAssignment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingAssignment" ADD CONSTRAINT "HrTrainingAssignment_nominationId_fkey" FOREIGN KEY ("nominationId") REFERENCES "HrTrainingNomination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingFeedback" ADD CONSTRAINT "HrTrainingFeedback_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingFeedback" ADD CONSTRAINT "HrTrainingFeedback_nominationId_fkey" FOREIGN KEY ("nominationId") REFERENCES "HrTrainingNomination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingCompetency" ADD CONSTRAINT "HrTrainingCompetency_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingCertificate" ADD CONSTRAINT "HrTrainingCertificate_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingCertificate" ADD CONSTRAINT "HrTrainingCertificate_nominationId_fkey" FOREIGN KEY ("nominationId") REFERENCES "HrTrainingNomination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingCertificate" ADD CONSTRAINT "HrTrainingCertificate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingBudget" ADD CONSTRAINT "HrTrainingBudget_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingExternal" ADD CONSTRAINT "HrTrainingExternal_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingIdp" ADD CONSTRAINT "HrTrainingIdp_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingIdp" ADD CONSTRAINT "HrTrainingIdp_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrTrainingSettings" ADD CONSTRAINT "HrTrainingSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
