-- AlterTable InvCategory
ALTER TABLE "InvCategory" ADD COLUMN IF NOT EXISTS "skuPrefix" TEXT NOT NULL DEFAULT '';

-- CreateTable InvUnit
CREATE TABLE "InvUnit" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InvUnit_pkey" PRIMARY KEY ("id")
);

-- AlterTable InvItem
ALTER TABLE "InvItem" ADD COLUMN IF NOT EXISTS "unitId" TEXT;
ALTER TABLE "InvItem" ADD COLUMN IF NOT EXISTS "defaultSupplierId" TEXT;
ALTER TABLE "InvItem" ADD COLUMN IF NOT EXISTS "brand" TEXT NOT NULL DEFAULT '';
ALTER TABLE "InvItem" ADD COLUMN IF NOT EXISTS "itemType" TEXT NOT NULL DEFAULT 'CONSUMABLE';
ALTER TABLE "InvItem" ADD COLUMN IF NOT EXISTS "barcode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "InvItem" ADD COLUMN IF NOT EXISTS "valuationMethod" TEXT NOT NULL DEFAULT 'WAC';
ALTER TABLE "InvItem" ADD COLUMN IF NOT EXISTS "minLevel" DOUBLE PRECISION NOT NULL DEFAULT 5;
ALTER TABLE "InvItem" ADD COLUMN IF NOT EXISTS "maxLevel" DOUBLE PRECISION NOT NULL DEFAULT 1000;
ALTER TABLE "InvItem" ADD COLUMN IF NOT EXISTS "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "InvItem" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "InvItem" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "InvItem" ADD COLUMN IF NOT EXISTS "color" TEXT NOT NULL DEFAULT '';
ALTER TABLE "InvItem" ADD COLUMN IF NOT EXISTS "size" TEXT NOT NULL DEFAULT '';
ALTER TABLE "InvItem" ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "InvItem" ADD COLUMN IF NOT EXISTS "requestedBy" TEXT NOT NULL DEFAULT '';
ALTER TABLE "InvItem" ADD COLUMN IF NOT EXISTS "baseUnitLocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable InvItemImage
CREATE TABLE "InvItemImage" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvItemImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable InvItemCustomField
CREATE TABLE "InvItemCustomField" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldLabel" TEXT NOT NULL,
    "fieldValue" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvItemCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable InvItemAuditLog
CREATE TABLE "InvItemAuditLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL DEFAULT '',
    "newValue" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT 'Inventory Manager',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvItemAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable InvItemRequest
CREATE TABLE "InvItemRequest" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "itemId" TEXT,
    "requestType" TEXT NOT NULL DEFAULT 'NEW_ITEM',
    "itemName" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT '',
    "categoryId" TEXT NOT NULL DEFAULT '',
    "itemType" TEXT NOT NULL DEFAULT 'CONSUMABLE',
    "unit" TEXT NOT NULL DEFAULT 'Pcs',
    "notes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL DEFAULT 'Store Keeper',
    "reviewedBy" TEXT NOT NULL DEFAULT '',
    "reviewedAt" TIMESTAMP(3),
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvItemRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvUnit_institutionId_unitCode_key" ON "InvUnit"("institutionId", "unitCode");
CREATE INDEX "InvUnit_institutionId_academicYear_idx" ON "InvUnit"("institutionId", "academicYear");
CREATE INDEX "InvItem_institutionId_itemName_brand_idx" ON "InvItem"("institutionId", "itemName", "brand");
CREATE INDEX "InvItem_institutionId_barcode_idx" ON "InvItem"("institutionId", "barcode");
CREATE INDEX "InvItemImage_institutionId_itemId_idx" ON "InvItemImage"("institutionId", "itemId");
CREATE UNIQUE INDEX "InvItemCustomField_itemId_fieldKey_key" ON "InvItemCustomField"("itemId", "fieldKey");
CREATE INDEX "InvItemCustomField_institutionId_itemId_idx" ON "InvItemCustomField"("institutionId", "itemId");
CREATE INDEX "InvItemAuditLog_institutionId_itemId_idx" ON "InvItemAuditLog"("institutionId", "itemId");
CREATE INDEX "InvItemAuditLog_institutionId_createdAt_idx" ON "InvItemAuditLog"("institutionId", "createdAt");
CREATE INDEX "InvItemRequest_institutionId_status_academicYear_idx" ON "InvItemRequest"("institutionId", "status", "academicYear");

-- AddForeignKey
ALTER TABLE "InvUnit" ADD CONSTRAINT "InvUnit_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvItem" ADD CONSTRAINT "InvItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "InvUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvItem" ADD CONSTRAINT "InvItem_defaultSupplierId_fkey" FOREIGN KEY ("defaultSupplierId") REFERENCES "InvSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvItemImage" ADD CONSTRAINT "InvItemImage_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvItemImage" ADD CONSTRAINT "InvItemImage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InvItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvItemCustomField" ADD CONSTRAINT "InvItemCustomField_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvItemCustomField" ADD CONSTRAINT "InvItemCustomField_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InvItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvItemAuditLog" ADD CONSTRAINT "InvItemAuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvItemAuditLog" ADD CONSTRAINT "InvItemAuditLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InvItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvItemRequest" ADD CONSTRAINT "InvItemRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvItemRequest" ADD CONSTRAINT "InvItemRequest_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InvItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
