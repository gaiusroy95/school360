-- CreateTable
CREATE TABLE "HrManpowerPlan" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "campus" TEXT NOT NULL DEFAULT 'Main Campus',
    "department" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "existingHeadcount" INTEGER NOT NULL DEFAULT 0,
    "approvedHeadcount" INTEGER NOT NULL DEFAULT 0,
    "vacantPositions" INTEGER NOT NULL DEFAULT 0,
    "expectedResignations" INTEGER NOT NULL DEFAULT 0,
    "newPositions" INTEGER NOT NULL DEFAULT 0,
    "budgetedSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "justification" TEXT NOT NULL DEFAULT '',
    "recruitmentDeadline" DATE,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrManpowerPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrJobRequisition" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "manpowerPlanId" TEXT,
    "requisitionNumber" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "campus" TEXT NOT NULL DEFAULT 'Main Campus',
    "department" TEXT NOT NULL,
    "positionTitle" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "grade" TEXT NOT NULL DEFAULT '',
    "vacancies" INTEGER NOT NULL DEFAULT 1,
    "employmentType" TEXT NOT NULL DEFAULT 'FULL_TIME',
    "salaryMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salaryMax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reportingManager" TEXT NOT NULL DEFAULT '',
    "budgetCode" TEXT NOT NULL DEFAULT '',
    "costCenter" TEXT NOT NULL DEFAULT '',
    "reasonForHiring" TEXT NOT NULL DEFAULT 'NEW_POSITION',
    "workflowStage" TEXT NOT NULL DEFAULT 'DRAFT',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "jobDescription" JSONB NOT NULL DEFAULT '{}',
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "approvalHistory" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrJobRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrJobPosting" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'Main Campus',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishChannels" JSONB NOT NULL DEFAULT '[]',
    "publishedAt" TIMESTAMP(3),
    "closingDate" DATE,
    "jobDetails" JSONB NOT NULL DEFAULT '{}',
    "applicationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrJobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrCandidate" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "candidateCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL DEFAULT '',
    "gender" TEXT NOT NULL DEFAULT '',
    "dateOfBirth" DATE,
    "address" TEXT NOT NULL DEFAULT '',
    "qualification" TEXT NOT NULL DEFAULT '',
    "experienceYears" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentEmployer" TEXT NOT NULL DEFAULT '',
    "currentSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "noticePeriod" TEXT NOT NULL DEFAULT '',
    "skills" JSONB NOT NULL DEFAULT '[]',
    "subjectExpertise" TEXT NOT NULL DEFAULT '',
    "languages" JSONB NOT NULL DEFAULT '[]',
    "certifications" JSONB NOT NULL DEFAULT '[]',
    "documents" JSONB NOT NULL DEFAULT '[]',
    "source" TEXT NOT NULL DEFAULT 'Career Portal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrCandidateApplication" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "postingId" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "pipelineStage" TEXT NOT NULL DEFAULT 'APPLICATION_RECEIVED',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "resumeMatchPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "skillMatchPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "experienceMatchPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "screeningNotes" TEXT NOT NULL DEFAULT '',
    "shortlistStatus" TEXT NOT NULL DEFAULT '',
    "employeeId" TEXT NOT NULL DEFAULT '',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrCandidateApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrInterviewFeedback" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "interviewType" TEXT NOT NULL,
    "interviewerName" TEXT NOT NULL DEFAULT '',
    "scheduledAt" TIMESTAMP(3),
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "comments" TEXT NOT NULL DEFAULT '',
    "strengths" TEXT NOT NULL DEFAULT '',
    "weaknesses" TEXT NOT NULL DEFAULT '',
    "recommendation" TEXT NOT NULL DEFAULT 'HOLD',
    "scorecard" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrInterviewFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrRecruitmentOffer" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "proposedCtc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grade" TEXT NOT NULL DEFAULT '',
    "payBand" TEXT NOT NULL DEFAULT '',
    "joiningBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variablePay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "probationSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "workflowStage" TEXT NOT NULL DEFAULT 'HR',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "offerLetterSentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "documents" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrRecruitmentOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrBackgroundVerification" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "checkType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT NOT NULL DEFAULT '',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrBackgroundVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrReferenceCheck" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "refereeName" TEXT NOT NULL,
    "organization" TEXT NOT NULL DEFAULT '',
    "designation" TEXT NOT NULL DEFAULT '',
    "contactNumber" TEXT NOT NULL DEFAULT '',
    "relationship" TEXT NOT NULL DEFAULT '',
    "feedback" TEXT NOT NULL DEFAULT '',
    "recommendation" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrReferenceCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrRecruitmentOnboarding" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL DEFAULT '',
    "joiningDate" DATE,
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "probationStart" DATE,
    "probationEnd" DATE,
    "probationStatus" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "confirmationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "mentorName" TEXT NOT NULL DEFAULT '',
    "monthlyReviews" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrRecruitmentOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrRecruitmentSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "approvalMatrix" JSONB NOT NULL DEFAULT '[]',
    "publishChannels" JSONB NOT NULL DEFAULT '[]',
    "screeningFilters" JSONB NOT NULL DEFAULT '{}',
    "automationRules" JSONB NOT NULL DEFAULT '{}',
    "workflowStages" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrRecruitmentSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HrManpowerPlan_institutionId_academicYear_idx" ON "HrManpowerPlan"("institutionId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "HrJobRequisition_institutionId_requisitionNumber_key" ON "HrJobRequisition"("institutionId", "requisitionNumber");

-- CreateIndex
CREATE INDEX "HrJobRequisition_institutionId_status_idx" ON "HrJobRequisition"("institutionId", "status");

-- CreateIndex
CREATE INDEX "HrJobPosting_institutionId_status_idx" ON "HrJobPosting"("institutionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HrCandidate_institutionId_candidateCode_key" ON "HrCandidate"("institutionId", "candidateCode");

-- CreateIndex
CREATE INDEX "HrCandidate_institutionId_email_idx" ON "HrCandidate"("institutionId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "HrCandidateApplication_institutionId_applicationNumber_key" ON "HrCandidateApplication"("institutionId", "applicationNumber");

-- CreateIndex
CREATE INDEX "HrCandidateApplication_institutionId_pipelineStage_idx" ON "HrCandidateApplication"("institutionId", "pipelineStage");

-- CreateIndex
CREATE INDEX "HrCandidateApplication_candidateId_idx" ON "HrCandidateApplication"("candidateId");

-- CreateIndex
CREATE INDEX "HrInterviewFeedback_applicationId_idx" ON "HrInterviewFeedback"("applicationId");

-- CreateIndex
CREATE INDEX "HrRecruitmentOffer_applicationId_idx" ON "HrRecruitmentOffer"("applicationId");

-- CreateIndex
CREATE INDEX "HrBackgroundVerification_applicationId_idx" ON "HrBackgroundVerification"("applicationId");

-- CreateIndex
CREATE INDEX "HrReferenceCheck_applicationId_idx" ON "HrReferenceCheck"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "HrRecruitmentOnboarding_applicationId_key" ON "HrRecruitmentOnboarding"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "HrRecruitmentSettings_institutionId_key" ON "HrRecruitmentSettings"("institutionId");

-- AddForeignKey
ALTER TABLE "HrManpowerPlan" ADD CONSTRAINT "HrManpowerPlan_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrJobRequisition" ADD CONSTRAINT "HrJobRequisition_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrJobRequisition" ADD CONSTRAINT "HrJobRequisition_manpowerPlanId_fkey" FOREIGN KEY ("manpowerPlanId") REFERENCES "HrManpowerPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrJobPosting" ADD CONSTRAINT "HrJobPosting_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrJobPosting" ADD CONSTRAINT "HrJobPosting_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "HrJobRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrCandidate" ADD CONSTRAINT "HrCandidate_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrCandidateApplication" ADD CONSTRAINT "HrCandidateApplication_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrCandidateApplication" ADD CONSTRAINT "HrCandidateApplication_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "HrCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrCandidateApplication" ADD CONSTRAINT "HrCandidateApplication_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "HrJobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrCandidateApplication" ADD CONSTRAINT "HrCandidateApplication_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "HrJobRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrInterviewFeedback" ADD CONSTRAINT "HrInterviewFeedback_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrInterviewFeedback" ADD CONSTRAINT "HrInterviewFeedback_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "HrCandidateApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrRecruitmentOffer" ADD CONSTRAINT "HrRecruitmentOffer_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrRecruitmentOffer" ADD CONSTRAINT "HrRecruitmentOffer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "HrCandidateApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrBackgroundVerification" ADD CONSTRAINT "HrBackgroundVerification_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrBackgroundVerification" ADD CONSTRAINT "HrBackgroundVerification_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "HrCandidateApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrReferenceCheck" ADD CONSTRAINT "HrReferenceCheck_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrReferenceCheck" ADD CONSTRAINT "HrReferenceCheck_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "HrCandidateApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrRecruitmentOnboarding" ADD CONSTRAINT "HrRecruitmentOnboarding_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrRecruitmentOnboarding" ADD CONSTRAINT "HrRecruitmentOnboarding_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "HrCandidateApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrRecruitmentSettings" ADD CONSTRAINT "HrRecruitmentSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
