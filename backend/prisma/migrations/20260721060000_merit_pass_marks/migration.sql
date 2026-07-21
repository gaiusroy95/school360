-- AlterTable
ALTER TABLE "AdmissionTest" ADD COLUMN "passMarksPercent" INTEGER;

-- AlterTable
ALTER TABLE "EntranceExamAttempt" ADD COLUMN "percentScore" DOUBLE PRECISION;
ALTER TABLE "EntranceExamAttempt" ADD COLUMN "passed" BOOLEAN;
ALTER TABLE "EntranceExamAttempt" ADD COLUMN "resultBreakdown" JSONB;

-- CreateTable
CREATE TABLE "AdmissionTestSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "passMarksPercent" INTEGER NOT NULL DEFAULT 40,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionTestSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionTestSettings_institutionId_key" ON "AdmissionTestSettings"("institutionId");

-- AddForeignKey
ALTER TABLE "AdmissionTestSettings" ADD CONSTRAINT "AdmissionTestSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
