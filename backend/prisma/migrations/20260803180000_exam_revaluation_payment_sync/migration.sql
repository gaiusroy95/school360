-- Revaluation / Recheck: payment sync + back paper fees
ALTER TABLE "ExamRevaluationConfig" ADD COLUMN IF NOT EXISTS "backPaperFee" DOUBLE PRECISION NOT NULL DEFAULT 400;

ALTER TABLE "ExamRevaluationRequest" ADD COLUMN IF NOT EXISTS "feeDueId" TEXT;

ALTER TABLE "ExamBackPaperExam" ADD COLUMN IF NOT EXISTS "feeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ExamBackPaperExam" ADD COLUMN IF NOT EXISTS "feePaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ExamBackPaperExam" ADD COLUMN IF NOT EXISTS "feeReceiptNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ExamBackPaperExam" ADD COLUMN IF NOT EXISTS "feePaymentMode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ExamBackPaperExam" ADD COLUMN IF NOT EXISTS "feePaidAt" TIMESTAMP(3);
ALTER TABLE "ExamBackPaperExam" ADD COLUMN IF NOT EXISTS "feeDueId" TEXT;

CREATE INDEX IF NOT EXISTS "ExamRevaluationRequest_feeDueId_idx" ON "ExamRevaluationRequest"("feeDueId");
CREATE INDEX IF NOT EXISTS "ExamBackPaperExam_feeDueId_idx" ON "ExamBackPaperExam"("feeDueId");
