-- CreateEnum
CREATE TYPE "MeritBadge" AS ENUM ('GOLD', 'SILVER', 'BRONZE', 'NONE');

-- CreateTable
CREATE TABLE "ManualEntranceTestEntry" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "teacherName" TEXT NOT NULL,
    "classApplied" TEXT NOT NULL,
    "subjects" JSONB NOT NULL DEFAULT '[]',
    "totalMaxMarks" DOUBLE PRECISION NOT NULL,
    "totalObtained" DOUBLE PRECISION NOT NULL,
    "percentScore" DOUBLE PRECISION NOT NULL,
    "meritBadge" "MeritBadge" NOT NULL DEFAULT 'NONE',
    "academicSession" TEXT NOT NULL DEFAULT '',
    "recordedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualEntranceTestEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManualEntranceTestEntry_applicationId_key" ON "ManualEntranceTestEntry"("applicationId");

-- CreateIndex
CREATE INDEX "ManualEntranceTestEntry_institutionId_academicSession_idx" ON "ManualEntranceTestEntry"("institutionId", "academicSession");

-- CreateIndex
CREATE INDEX "ManualEntranceTestEntry_institutionId_classApplied_idx" ON "ManualEntranceTestEntry"("institutionId", "classApplied");

-- AddForeignKey
ALTER TABLE "ManualEntranceTestEntry" ADD CONSTRAINT "ManualEntranceTestEntry_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
