-- Surveys & Feedback: structured feedback from parents, students, staff

CREATE TABLE "CommSurvey" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "audienceType" TEXT NOT NULL DEFAULT 'ALL',
    "audienceLabel" TEXT NOT NULL DEFAULT '',
    "classFilter" TEXT NOT NULL DEFAULT '',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "closesAt" TIMESTAMP(3),
    "targetCount" INTEGER NOT NULL DEFAULT 0,
    "responseCount" INTEGER NOT NULL DEFAULT 0,
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "pushSent" BOOLEAN NOT NULL DEFAULT false,
    "pushCampaignId" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommSurvey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommSurveyQuestion" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" TEXT NOT NULL DEFAULT 'RATING',
    "options" JSONB NOT NULL DEFAULT '[]',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommSurveyQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommSurveyResponse" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL DEFAULT '',
    "accountRole" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommSurveyResponse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommSurveyAnswer" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerText" TEXT NOT NULL DEFAULT '',
    "answerValue" DOUBLE PRECISION,
    "selectedOptions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommSurveyAnswer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommSurvey_institutionId_status_idx" ON "CommSurvey"("institutionId", "status");
CREATE INDEX "CommSurvey_institutionId_academicYear_createdAt_idx" ON "CommSurvey"("institutionId", "academicYear", "createdAt");

CREATE INDEX "CommSurveyQuestion_surveyId_sortOrder_idx" ON "CommSurveyQuestion"("surveyId", "sortOrder");

CREATE UNIQUE INDEX "CommSurveyResponse_surveyId_accountId_key" ON "CommSurveyResponse"("surveyId", "accountId");
CREATE INDEX "CommSurveyResponse_institutionId_accountId_status_idx" ON "CommSurveyResponse"("institutionId", "accountId", "status");
CREATE INDEX "CommSurveyResponse_surveyId_status_idx" ON "CommSurveyResponse"("surveyId", "status");

CREATE UNIQUE INDEX "CommSurveyAnswer_responseId_questionId_key" ON "CommSurveyAnswer"("responseId", "questionId");
CREATE INDEX "CommSurveyAnswer_questionId_idx" ON "CommSurveyAnswer"("questionId");

ALTER TABLE "CommSurvey" ADD CONSTRAINT "CommSurvey_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommSurveyQuestion" ADD CONSTRAINT "CommSurveyQuestion_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommSurveyQuestion" ADD CONSTRAINT "CommSurveyQuestion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "CommSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommSurveyResponse" ADD CONSTRAINT "CommSurveyResponse_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommSurveyResponse" ADD CONSTRAINT "CommSurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "CommSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommSurveyAnswer" ADD CONSTRAINT "CommSurveyAnswer_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommSurveyAnswer" ADD CONSTRAINT "CommSurveyAnswer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "CommSurveyResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommSurveyAnswer" ADD CONSTRAINT "CommSurveyAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "CommSurveyQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
