-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN "lastContactedAt" TIMESTAMP(3);
ALTER TABLE "Enquiry" ADD COLUMN "lastSentiment" TEXT;
ALTER TABLE "Enquiry" ADD COLUMN "lastEngagement" TEXT;
ALTER TABLE "Enquiry" ADD COLUMN "lastRiskFactor" TEXT;
ALTER TABLE "Enquiry" ADD COLUMN "lastRiskDetails" TEXT;

-- CreateTable
CREATE TABLE "counseling_logs" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "interactionType" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "engagement" TEXT NOT NULL,
    "riskFactor" TEXT NOT NULL,
    "riskDetails" TEXT,
    "remarks" TEXT NOT NULL,
    "actionIntent" TEXT NOT NULL,
    "nextFollowUp" TIMESTAMP(3),
    "counselorName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "counseling_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "counseling_logs_enquiryId_createdAt_idx" ON "counseling_logs"("enquiryId", "createdAt");

-- AddForeignKey
ALTER TABLE "counseling_logs" ADD CONSTRAINT "counseling_logs_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
