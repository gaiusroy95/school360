-- AlterTable
ALTER TABLE "ExamQuestionPaper" ADD COLUMN "mobilePublishedAt" TIMESTAMP(3);
ALTER TABLE "ExamQuestionPaper" ADD COLUMN "mobilePublishedBy" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ExamQuestionPaper" ADD COLUMN "mobileVisibleOn" "PublicationVisibility";

-- CreateIndex
CREATE INDEX "ExamQuestionPaper_institutionId_mobilePublishedAt_idx" ON "ExamQuestionPaper"("institutionId", "mobilePublishedAt");
