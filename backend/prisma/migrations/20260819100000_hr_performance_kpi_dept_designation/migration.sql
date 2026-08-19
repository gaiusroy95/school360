-- AlterTable
ALTER TABLE "HrPerformanceKpi" ADD COLUMN "department" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HrPerformanceKpi" ADD COLUMN "designation" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "HrPerformanceKpi_institutionId_department_designation_idx" ON "HrPerformanceKpi"("institutionId", "department", "designation");
