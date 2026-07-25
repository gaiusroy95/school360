-- AlterTable InvSupplier
ALTER TABLE "InvSupplier" ADD COLUMN "address" TEXT NOT NULL DEFAULT '',
ADD COLUMN "city" TEXT NOT NULL DEFAULT '',
ADD COLUMN "state" TEXT NOT NULL DEFAULT '',
ADD COLUMN "pincode" TEXT NOT NULL DEFAULT '',
ADD COLUMN "taxId" TEXT,
ADD COLUMN "gstId" TEXT,
ADD COLUMN "bankName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "bankAccount" TEXT NOT NULL DEFAULT '',
ADD COLUMN "ifscCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN "apLedgerAccount" TEXT NOT NULL DEFAULT '',
ADD COLUMN "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "approvedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "onboardingNotes" TEXT NOT NULL DEFAULT '';

-- CreateTable InvSupplierDoc
CREATE TABLE "InvSupplierDoc" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "docType" TEXT NOT NULL DEFAULT 'GST',
    "docName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "uploadedBy" TEXT NOT NULL DEFAULT 'Inventory Manager',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvSupplierDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable InvSupplierCategoryMap
CREATE TABLE "InvSupplierCategoryMap" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvSupplierCategoryMap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvSupplier_institutionId_approvalStatus_idx" ON "InvSupplier"("institutionId", "approvalStatus");

CREATE UNIQUE INDEX "InvSupplier_institutionId_gstId_key" ON "InvSupplier"("institutionId", "gstId");

CREATE INDEX "InvSupplierDoc_institutionId_supplierId_idx" ON "InvSupplierDoc"("institutionId", "supplierId");

CREATE INDEX "InvSupplierCategoryMap_supplierId_idx" ON "InvSupplierCategoryMap"("supplierId");

CREATE INDEX "InvSupplierCategoryMap_categoryId_idx" ON "InvSupplierCategoryMap"("categoryId");

CREATE UNIQUE INDEX "InvSupplierCategoryMap_institutionId_supplierId_categoryId_key" ON "InvSupplierCategoryMap"("institutionId", "supplierId", "categoryId");

-- AddForeignKey
ALTER TABLE "InvSupplierDoc" ADD CONSTRAINT "InvSupplierDoc_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvSupplierDoc" ADD CONSTRAINT "InvSupplierDoc_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "InvSupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvSupplierCategoryMap" ADD CONSTRAINT "InvSupplierCategoryMap_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvSupplierCategoryMap" ADD CONSTRAINT "InvSupplierCategoryMap_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "InvSupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvSupplierCategoryMap" ADD CONSTRAINT "InvSupplierCategoryMap_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InvCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Approve existing seeded suppliers
UPDATE "InvSupplier" SET "approvalStatus" = 'APPROVED', "approvedBy" = 'System', "rating" = 4 WHERE "approvalStatus" = 'PENDING';
