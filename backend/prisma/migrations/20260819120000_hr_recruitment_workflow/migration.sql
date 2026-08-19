-- AlterTable
ALTER TABLE "HrCandidateApplication" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "HrInterviewFeedback" ADD COLUMN "interviewRoundName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HrInterviewFeedback" ADD COLUMN "interviewerDepartment" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HrInterviewFeedback" ADD COLUMN "interviewerDesignation" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "HrRecruitmentOffer" ADD COLUMN "salaryComponents" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "HrRecruitmentOffer" ADD COLUMN "emailSubject" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HrRecruitmentOffer" ADD COLUMN "emailBody" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HrRecruitmentOffer" ADD COLUMN "ccEmails" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "HrRecruitmentOffer" ADD COLUMN "emailSentLog" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "HrReferenceCheck" ADD COLUMN "feedbackType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HrReferenceCheck" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "HrRecruitmentOnboarding" ADD COLUMN "probationFeedback" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "HrRecruitmentOnboarding" ADD COLUMN "extendedProbationEnd" DATE;
