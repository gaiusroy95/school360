-- CreateEnum
CREATE TYPE "ParentCommunicationDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- AlterTable
ALTER TABLE "ParentCommunication" ADD COLUMN     "direction" "ParentCommunicationDirection" NOT NULL DEFAULT 'OUTBOUND',
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "responseTimeMinutes" INTEGER;

-- CreateIndex
CREATE INDEX "ParentCommunication_institutionId_direction_idx" ON "ParentCommunication"("institutionId", "direction");

-- CreateTable
CREATE TABLE "ParentAppSession" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "parentKey" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentAppSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParentAppSession_institutionId_parentKey_idx" ON "ParentAppSession"("institutionId", "parentKey");

-- CreateIndex
CREATE INDEX "ParentAppSession_institutionId_loginAt_idx" ON "ParentAppSession"("institutionId", "loginAt");

-- AddForeignKey
ALTER TABLE "ParentAppSession" ADD CONSTRAINT "ParentAppSession_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
