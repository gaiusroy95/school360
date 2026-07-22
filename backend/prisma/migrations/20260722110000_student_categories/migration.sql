-- CreateEnum
CREATE TYPE "StudentCategoryGroup" AS ENUM ('ADMISSION', 'TALENT', 'ATTENDANCE', 'GOVERNMENT_RESERVATION');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('GOVERNMENT', 'INTERNAL');

-- CreateEnum
CREATE TYPE "StudentCategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CategoryAssignmentStatus" AS ENUM ('ACTIVE', 'PENDING', 'DRAFT', 'DUE', 'OPEN', 'COMPLETED', 'APPROVED', 'PAID');

-- CreateTable
CREATE TABLE "StudentCategory" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "categoryGroup" "StudentCategoryGroup" NOT NULL,
    "name" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "categoryType" "CategoryType" NOT NULL DEFAULT 'INTERNAL',
    "description" TEXT NOT NULL DEFAULT '',
    "status" "StudentCategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "colorCode" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentCategoryAssignment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "status" "CategoryAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentCategoryAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentCategory_institutionId_categoryGroup_status_idx" ON "StudentCategory"("institutionId", "categoryGroup", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentCategory_institutionId_categoryGroup_shortCode_key" ON "StudentCategory"("institutionId", "categoryGroup", "shortCode");

-- CreateIndex
CREATE INDEX "StudentCategoryAssignment_institutionId_status_idx" ON "StudentCategoryAssignment"("institutionId", "status");

-- CreateIndex
CREATE INDEX "StudentCategoryAssignment_categoryId_idx" ON "StudentCategoryAssignment"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentCategoryAssignment_studentId_categoryId_key" ON "StudentCategoryAssignment"("studentId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentCategoryAssignment_institutionId_recordId_key" ON "StudentCategoryAssignment"("institutionId", "recordId");

-- AddForeignKey
ALTER TABLE "StudentCategory" ADD CONSTRAINT "StudentCategory_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCategoryAssignment" ADD CONSTRAINT "StudentCategoryAssignment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCategoryAssignment" ADD CONSTRAINT "StudentCategoryAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCategoryAssignment" ADD CONSTRAINT "StudentCategoryAssignment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "StudentCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
