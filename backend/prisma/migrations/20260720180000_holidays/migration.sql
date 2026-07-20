-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('NATIONAL', 'RESTRICTED', 'OPTIONAL', 'INSTITUTIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "HolidayAudience" AS ENUM ('ALL', 'STAFF', 'STUDENTS');

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "type" "HolidayType" NOT NULL DEFAULT 'NATIONAL',
    "applicableTo" "HolidayAudience" NOT NULL DEFAULT 'ALL',
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Holiday_institutionId_date_idx" ON "Holiday"("institutionId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_institutionId_date_name_key" ON "Holiday"("institutionId", "date", "name");

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
