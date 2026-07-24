-- HR Designations module
CREATE TABLE IF NOT EXISTS "HrDesignation" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "designationType" TEXT NOT NULL DEFAULT 'Teaching',
    "totalPositions" INTEGER NOT NULL DEFAULT 1,
    "filledPositions" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrDesignation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HrDesignation_institutionId_name_department_key" ON "HrDesignation"("institutionId", "name", "department");
CREATE INDEX IF NOT EXISTS "HrDesignation_institutionId_department_idx" ON "HrDesignation"("institutionId", "department");
CREATE INDEX IF NOT EXISTS "HrDesignation_institutionId_status_idx" ON "HrDesignation"("institutionId", "status");
CREATE INDEX IF NOT EXISTS "HrDesignation_institutionId_designationType_idx" ON "HrDesignation"("institutionId", "designationType");

ALTER TABLE "HrDesignation" ADD CONSTRAINT "HrDesignation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
