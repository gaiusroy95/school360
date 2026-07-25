ALTER TABLE "HostelInventoryItem" ADD COLUMN "itemType" TEXT NOT NULL DEFAULT 'CONSUMABLE';
ALTER TABLE "HostelInventoryItem" ADD COLUMN "subCategory" TEXT NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "HostelInventoryItem" ADD COLUMN "procurementAlertEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "HostelInventoryAsset" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "assetTag" TEXT NOT NULL,
    "assetName" TEXT NOT NULL,
    "assetType" TEXT NOT NULL DEFAULT 'MATTRESS',
    "serialNumber" TEXT NOT NULL DEFAULT '',
    "condition" TEXT NOT NULL DEFAULT 'GOOD',
    "purchaseDate" DATE,
    "hostelId" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelInventoryAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelBedAssetMapping" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL DEFAULT '',
    "studentId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL DEFAULT '',
    "roomLabel" TEXT NOT NULL DEFAULT '',
    "bedLabel" TEXT NOT NULL DEFAULT '',
    "allottedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelBedAssetMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelInventoryAlert" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL DEFAULT '',
    "alertType" TEXT NOT NULL DEFAULT 'LOW_STOCK',
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "message" TEXT NOT NULL DEFAULT '',
    "sentToProcurement" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelInventoryAlert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelInventoryTransaction" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL DEFAULT 'STOCK_IN',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceAfter" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referenceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "referenceId" TEXT NOT NULL DEFAULT '',
    "performedBy" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelInventoryTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HostelInventoryAsset_institutionId_assetTag_key" ON "HostelInventoryAsset"("institutionId", "assetTag");
CREATE INDEX "HostelInventoryAsset_institutionId_assetType_status_idx" ON "HostelInventoryAsset"("institutionId", "assetType", "status");
CREATE INDEX "HostelInventoryAsset_institutionId_academicYear_idx" ON "HostelInventoryAsset"("institutionId", "academicYear");
CREATE INDEX "HostelBedAssetMapping_institutionId_bedId_status_idx" ON "HostelBedAssetMapping"("institutionId", "bedId", "status");
CREATE INDEX "HostelBedAssetMapping_institutionId_assetId_status_idx" ON "HostelBedAssetMapping"("institutionId", "assetId", "status");
CREATE INDEX "HostelBedAssetMapping_institutionId_studentProfileId_idx" ON "HostelBedAssetMapping"("institutionId", "studentProfileId");
CREATE INDEX "HostelInventoryAlert_institutionId_alertType_sentToProcurement_idx" ON "HostelInventoryAlert"("institutionId", "alertType", "sentToProcurement");
CREATE INDEX "HostelInventoryAlert_institutionId_createdAt_idx" ON "HostelInventoryAlert"("institutionId", "createdAt");
CREATE INDEX "HostelInventoryTransaction_institutionId_inventoryItemId_createdAt_idx" ON "HostelInventoryTransaction"("institutionId", "inventoryItemId", "createdAt");
CREATE INDEX "HostelInventoryTransaction_institutionId_transactionType_idx" ON "HostelInventoryTransaction"("institutionId", "transactionType");
CREATE INDEX "HostelInventoryItem_institutionId_itemType_subCategory_idx" ON "HostelInventoryItem"("institutionId", "itemType", "subCategory");

ALTER TABLE "HostelInventoryAsset" ADD CONSTRAINT "HostelInventoryAsset_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelInventoryAsset" ADD CONSTRAINT "HostelInventoryAsset_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "HostelInventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HostelBedAssetMapping" ADD CONSTRAINT "HostelBedAssetMapping_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelBedAssetMapping" ADD CONSTRAINT "HostelBedAssetMapping_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "HostelBed"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelBedAssetMapping" ADD CONSTRAINT "HostelBedAssetMapping_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "HostelInventoryAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelInventoryAlert" ADD CONSTRAINT "HostelInventoryAlert_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelInventoryAlert" ADD CONSTRAINT "HostelInventoryAlert_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "HostelInventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelInventoryTransaction" ADD CONSTRAINT "HostelInventoryTransaction_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelInventoryTransaction" ADD CONSTRAINT "HostelInventoryTransaction_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "HostelInventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
