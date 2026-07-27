-- Examination & Evaluation Engine tables

CREATE TABLE "exam_configurations" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "maxMarks" INTEGER NOT NULL DEFAULT 100,
    "graceMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weightageEnabled" BOOLEAN NOT NULL DEFAULT false,
    "componentWeightages" JSONB NOT NULL DEFAULT '{}',
    "weightageSumValid" BOOLEAN NOT NULL DEFAULT true,
    "rulesLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_configurations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "grading_rules" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "passMarks" DOUBLE PRECISION NOT NULL DEFAULT 33,
    "passGrade" TEXT NOT NULL DEFAULT 'D',
    "aggregatedPassPercent" DOUBLE PRECISION NOT NULL DEFAULT 33,
    "minComponentPassPercent" DOUBLE PRECISION NOT NULL DEFAULT 33,
    "componentRules" JSONB NOT NULL DEFAULT '{}',
    "rulesActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grading_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gpa_scales" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "scaleType" TEXT NOT NULL DEFAULT '10 Point',
    "gradeMatrix" JSONB NOT NULL DEFAULT '[]',
    "formulaNotes" TEXT NOT NULL DEFAULT '',
    "creditWeighting" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gpa_scales_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rank_config" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "rankMethod" TEXT NOT NULL DEFAULT 'Percentage',
    "tieRule" TEXT NOT NULL DEFAULT 'Same Rank',
    "rankScope" TEXT NOT NULL DEFAULT 'Section',
    "exemptedSubjects" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rank_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exam_periods" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "periodName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "registrationCutoff" TIMESTAMP(3),
    "marksEntryDeadline" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "conflictNotes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_periods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exam_configurations_institutionId_academicYear_key" ON "exam_configurations"("institutionId", "academicYear");
CREATE UNIQUE INDEX "grading_rules_institutionId_academicYear_key" ON "grading_rules"("institutionId", "academicYear");
CREATE UNIQUE INDEX "gpa_scales_institutionId_academicYear_key" ON "gpa_scales"("institutionId", "academicYear");
CREATE UNIQUE INDEX "rank_config_institutionId_academicYear_key" ON "rank_config"("institutionId", "academicYear");
CREATE UNIQUE INDEX "exam_periods_institutionId_academicYear_periodName_key" ON "exam_periods"("institutionId", "academicYear", "periodName");
CREATE INDEX "exam_periods_institutionId_academicYear_isPublished_idx" ON "exam_periods"("institutionId", "academicYear", "isPublished");

ALTER TABLE "exam_configurations" ADD CONSTRAINT "exam_configurations_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grading_rules" ADD CONSTRAINT "grading_rules_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gpa_scales" ADD CONSTRAINT "gpa_scales_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rank_config" ADD CONSTRAINT "rank_config_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_periods" ADD CONSTRAINT "exam_periods_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
