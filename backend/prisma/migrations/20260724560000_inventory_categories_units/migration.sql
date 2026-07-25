-- AlterTable
ALTER TABLE "InvCategory" ADD COLUMN "parentId" TEXT,
ADD COLUMN "baseUnit" TEXT NOT NULL DEFAULT 'Pcs',
ADD COLUMN "ledgerCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "InvUnit" ADD COLUMN "isBase" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "InvUnitConversion" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "baseUnitId" TEXT NOT NULL,
    "alternateUnitId" TEXT NOT NULL,
    "conversionFactor" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvUnitConversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvCategory_institutionId_parentId_idx" ON "InvCategory"("institutionId", "parentId");

-- CreateIndex
CREATE INDEX "InvUnitConversion_institutionId_academicYear_idx" ON "InvUnitConversion"("institutionId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "InvUnitConversion_institutionId_baseUnitId_alternateUnitId_key" ON "InvUnitConversion"("institutionId", "baseUnitId", "alternateUnitId");

-- AddForeignKey
ALTER TABLE "InvCategory" ADD CONSTRAINT "InvCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "InvCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvUnitConversion" ADD CONSTRAINT "InvUnitConversion_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvUnitConversion" ADD CONSTRAINT "InvUnitConversion_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "InvUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvUnitConversion" ADD CONSTRAINT "InvUnitConversion_alternateUnitId_fkey" FOREIGN KEY ("alternateUnitId") REFERENCES "InvUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
