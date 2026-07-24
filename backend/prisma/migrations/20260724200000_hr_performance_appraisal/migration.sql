-- CreateTable
CREATE TABLE "HrPerformanceCycle" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "cycleType" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "reviewDueDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrPerformanceCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrPerformanceKpi" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "staffType" TEXT NOT NULL DEFAULT 'ALL',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrPerformanceKpi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrPerformanceAppraisal" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "staffType" TEXT NOT NULL DEFAULT 'TEACHING',
    "classSubject" TEXT NOT NULL DEFAULT '',
    "kpiScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "competencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attendanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "behaviourScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feedbackScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "innovationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trainingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taskActionScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "improvementScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "parentEngScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "parentFbScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "studentFbScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingBand" TEXT NOT NULL DEFAULT '',
    "outcome" TEXT NOT NULL DEFAULT '',
    "workflowStage" TEXT NOT NULL DEFAULT 'SELF',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "selfRemarks" TEXT NOT NULL DEFAULT '',
    "managerRemarks" TEXT NOT NULL DEFAULT '',
    "hodRemarks" TEXT NOT NULL DEFAULT '',
    "principalRemarks" TEXT NOT NULL DEFAULT '',
    "hrRemarks" TEXT NOT NULL DEFAULT '',
    "kpiDetails" JSONB NOT NULL DEFAULT '[]',
    "competencyDetails" JSONB NOT NULL DEFAULT '[]',
    "publishedToMobile" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrPerformanceAppraisal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrPerformanceAnnualReview" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "q1Score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "q2Score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "q3Score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "q4Score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "specialAchievementScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leadershipScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "annualScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingBand" TEXT NOT NULL DEFAULT '',
    "promotionEligible" BOOLEAN NOT NULL DEFAULT false,
    "incrementPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recommendedPayGrade" TEXT NOT NULL DEFAULT '',
    "workflowStage" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "salaryRevisionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrPerformanceAnnualReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrPerformancePip" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "goals" JSONB NOT NULL DEFAULT '[]',
    "trainingPlan" JSONB NOT NULL DEFAULT '[]',
    "mentorName" TEXT NOT NULL DEFAULT '',
    "weeklyReviews" JSONB NOT NULL DEFAULT '[]',
    "monthlyReviews" JSONB NOT NULL DEFAULT '[]',
    "completionStatus" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrPerformancePip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrPayGrade" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "minSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrPayGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrPerformanceSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "weightage" JSONB NOT NULL DEFAULT '{"kpi":35,"competency":25,"attendance":10,"behaviour":10,"feedback":10,"innovation":5,"training":5}',
    "ratingScale" JSONB NOT NULL DEFAULT '[]',
    "annualWeightage" JSONB NOT NULL DEFAULT '{"q1":20,"q2":20,"q3":20,"q4":20,"specialAchievement":10,"leadership":10}',
    "promotionMatrix" JSONB NOT NULL DEFAULT '[]',
    "incrementMatrix" JSONB NOT NULL DEFAULT '[]',
    "promotionRules" JSONB NOT NULL DEFAULT '{}',
    "approvalMatrix" JSONB NOT NULL DEFAULT '[]',
    "pipThreshold" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "pipDurationDays" INTEGER NOT NULL DEFAULT 90,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrPerformanceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrEmployeeDevelopmentPlan" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "reviewType" TEXT NOT NULL DEFAULT 'QUARTERLY',
    "skillGaps" JSONB NOT NULL DEFAULT '[]',
    "mandatoryTraining" JSONB NOT NULL DEFAULT '[]',
    "certifications" JSONB NOT NULL DEFAULT '[]',
    "careerAspirations" TEXT NOT NULL DEFAULT '',
    "leadershipReadiness" TEXT NOT NULL DEFAULT '',
    "coachingAssignments" JSONB NOT NULL DEFAULT '[]',
    "mentoringPlan" JSONB NOT NULL DEFAULT '{}',
    "milestones" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrEmployeeDevelopmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HrPerformanceCycle_institutionId_academicYear_cycleType_key" ON "HrPerformanceCycle"("institutionId", "academicYear", "cycleType");

-- CreateIndex
CREATE INDEX "HrPerformanceCycle_institutionId_academicYear_idx" ON "HrPerformanceCycle"("institutionId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "HrPerformanceKpi_institutionId_code_key" ON "HrPerformanceKpi"("institutionId", "code");

-- CreateIndex
CREATE INDEX "HrPerformanceKpi_institutionId_category_idx" ON "HrPerformanceKpi"("institutionId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "HrPerformanceAppraisal_employeeId_cycleId_key" ON "HrPerformanceAppraisal"("employeeId", "cycleId");

-- CreateIndex
CREATE INDEX "HrPerformanceAppraisal_institutionId_academicYear_quarter_idx" ON "HrPerformanceAppraisal"("institutionId", "academicYear", "quarter");

-- CreateIndex
CREATE INDEX "HrPerformanceAppraisal_cycleId_idx" ON "HrPerformanceAppraisal"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "HrPerformanceAnnualReview_employeeId_academicYear_key" ON "HrPerformanceAnnualReview"("employeeId", "academicYear");

-- CreateIndex
CREATE INDEX "HrPerformanceAnnualReview_institutionId_academicYear_idx" ON "HrPerformanceAnnualReview"("institutionId", "academicYear");

-- CreateIndex
CREATE INDEX "HrPerformancePip_institutionId_employeeId_idx" ON "HrPerformancePip"("institutionId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "HrPayGrade_institutionId_code_key" ON "HrPayGrade"("institutionId", "code");

-- CreateIndex
CREATE INDEX "HrPayGrade_institutionId_level_idx" ON "HrPayGrade"("institutionId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "HrPerformanceSettings_institutionId_key" ON "HrPerformanceSettings"("institutionId");

-- CreateIndex
CREATE INDEX "HrEmployeeDevelopmentPlan_institutionId_employeeId_academicYear_idx" ON "HrEmployeeDevelopmentPlan"("institutionId", "employeeId", "academicYear");

-- AddForeignKey
ALTER TABLE "HrPerformanceCycle" ADD CONSTRAINT "HrPerformanceCycle_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPerformanceKpi" ADD CONSTRAINT "HrPerformanceKpi_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPerformanceAppraisal" ADD CONSTRAINT "HrPerformanceAppraisal_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPerformanceAppraisal" ADD CONSTRAINT "HrPerformanceAppraisal_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPerformanceAppraisal" ADD CONSTRAINT "HrPerformanceAppraisal_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "HrPerformanceCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPerformanceAnnualReview" ADD CONSTRAINT "HrPerformanceAnnualReview_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPerformanceAnnualReview" ADD CONSTRAINT "HrPerformanceAnnualReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPerformancePip" ADD CONSTRAINT "HrPerformancePip_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPerformancePip" ADD CONSTRAINT "HrPerformancePip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPayGrade" ADD CONSTRAINT "HrPayGrade_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrPerformanceSettings" ADD CONSTRAINT "HrPerformanceSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrEmployeeDevelopmentPlan" ADD CONSTRAINT "HrEmployeeDevelopmentPlan_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrEmployeeDevelopmentPlan" ADD CONSTRAINT "HrEmployeeDevelopmentPlan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "PayrollEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
