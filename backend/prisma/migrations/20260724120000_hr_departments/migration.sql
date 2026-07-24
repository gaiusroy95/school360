-- HR Departments module
CREATE TABLE IF NOT EXISTS "HrDepartment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "headEmployeeId" TEXT NOT NULL DEFAULT '',
    "reportsToEmployeeId" TEXT NOT NULL DEFAULT '',
    "shortDescription" TEXT NOT NULL DEFAULT '',
    "detailedDescription" TEXT NOT NULL DEFAULT '',
    "campus" TEXT NOT NULL DEFAULT 'Main Campus',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "budgetAllocation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costCenter" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "workingDays" JSONB NOT NULL DEFAULT '[]',
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "functions" JSONB NOT NULL DEFAULT '[]',
    "structureTree" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrDepartment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HrDepartment_institutionId_code_key" ON "HrDepartment"("institutionId", "code");
CREATE INDEX IF NOT EXISTS "HrDepartment_institutionId_parentId_idx" ON "HrDepartment"("institutionId", "parentId");
CREATE INDEX IF NOT EXISTS "HrDepartment_institutionId_status_idx" ON "HrDepartment"("institutionId", "status");

ALTER TABLE "HrDepartment" ADD CONSTRAINT "HrDepartment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HrDepartment" ADD CONSTRAINT "HrDepartment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "HrDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
