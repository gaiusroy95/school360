-- CreateEnum
CREATE TYPE "SeatAllocationStatus" AS ENUM ('ALLOCATED', 'WAITLISTED');

-- CreateTable
CREATE TABLE "SeatCapacity" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "totalSeats" INTEGER NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeatCapacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatAllocation" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "capacityId" TEXT,
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL DEFAULT '',
    "meritRank" INTEGER NOT NULL,
    "classMeritRank" INTEGER NOT NULL,
    "entranceScore" DOUBLE PRECISION NOT NULL,
    "status" "SeatAllocationStatus" NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allocatedBy" TEXT NOT NULL DEFAULT 'SYSTEM',
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "SeatAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeatCapacity_institutionId_academicYear_className_sectionName_key" ON "SeatCapacity"("institutionId", "academicYear", "className", "sectionName");
CREATE INDEX "SeatCapacity_institutionId_academicYear_idx" ON "SeatCapacity"("institutionId", "academicYear");
CREATE INDEX "SeatCapacity_institutionId_className_idx" ON "SeatCapacity"("institutionId", "className");

-- CreateIndex
CREATE UNIQUE INDEX "SeatAllocation_applicationId_key" ON "SeatAllocation"("applicationId");
CREATE INDEX "SeatAllocation_institutionId_academicYear_status_idx" ON "SeatAllocation"("institutionId", "academicYear", "status");
CREATE INDEX "SeatAllocation_institutionId_className_sectionName_idx" ON "SeatAllocation"("institutionId", "className", "sectionName");
CREATE INDEX "SeatAllocation_capacityId_idx" ON "SeatAllocation"("capacityId");

-- AddForeignKey
ALTER TABLE "SeatCapacity" ADD CONSTRAINT "SeatCapacity_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeatAllocation" ADD CONSTRAINT "SeatAllocation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeatAllocation" ADD CONSTRAINT "SeatAllocation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeatAllocation" ADD CONSTRAINT "SeatAllocation_capacityId_fkey" FOREIGN KEY ("capacityId") REFERENCES "SeatCapacity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
