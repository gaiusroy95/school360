-- CreateTable
CREATE TABLE "InvStore" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "storeCode" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "storeType" TEXT NOT NULL DEFAULT 'MAIN',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvCategory" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvSupplier" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "supplierCode" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvItem" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'Pcs',
    "stockQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inTransitQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderLevel" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "weightedAvgCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyUsage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvGrn" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "supplierId" TEXT,
    "grnNumber" TEXT NOT NULL,
    "grnDate" DATE NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "receivedBy" TEXT NOT NULL DEFAULT 'Store Keeper',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvGrn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvGrnLine" (
    "id" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineValue" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "InvGrnLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvStockOutward" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "outwardNumber" TEXT NOT NULL,
    "outwardDate" DATE NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "issuedTo" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "issuedBy" TEXT NOT NULL DEFAULT 'Store Keeper',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvStockOutward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvStockOutwardLine" (
    "id" TEXT NOT NULL,
    "outwardId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineValue" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "InvStockOutwardLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvTransfer" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "fromStoreId" TEXT NOT NULL,
    "toStoreId" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "transferDate" DATE NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvAdjustment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "adjustmentNumber" TEXT NOT NULL,
    "adjustmentDate" DATE NOT NULL,
    "adjustmentType" TEXT NOT NULL DEFAULT 'CORRECTION',
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvPurchaseOrder" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "supplierId" TEXT,
    "poNumber" TEXT NOT NULL,
    "poDate" DATE NOT NULL,
    "expectedDate" DATE,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvPurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvDashboardStats" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "statsPayload" JSONB NOT NULL DEFAULT '{}',
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvDashboardStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvAlert" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL DEFAULT '',
    "alertType" TEXT NOT NULL DEFAULT 'LOW_STOCK',
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvActivityLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "filterSnapshot" JSONB NOT NULL DEFAULT '{}',
    "performedBy" TEXT NOT NULL DEFAULT 'Inventory Manager',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "cacheRefreshMins" INTEGER NOT NULL DEFAULT 10,
    "roleMatrix" JSONB NOT NULL DEFAULT '[]',
    "notificationRules" JSONB NOT NULL DEFAULT '{}',
    "mobileSyncRules" JSONB NOT NULL DEFAULT '{}',
    "navigationTargets" JSONB NOT NULL DEFAULT '{}',
    "lastCacheRefresh" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvStoreAssignment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userRole" TEXT NOT NULL DEFAULT 'Store Keeper',
    "staffName" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvStoreAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvStore_institutionId_storeCode_key" ON "InvStore"("institutionId", "storeCode");
CREATE INDEX "InvStore_institutionId_academicYear_status_idx" ON "InvStore"("institutionId", "academicYear", "status");

CREATE UNIQUE INDEX "InvCategory_institutionId_categoryCode_key" ON "InvCategory"("institutionId", "categoryCode");
CREATE INDEX "InvCategory_institutionId_academicYear_idx" ON "InvCategory"("institutionId", "academicYear");

CREATE UNIQUE INDEX "InvSupplier_institutionId_supplierCode_key" ON "InvSupplier"("institutionId", "supplierCode");
CREATE INDEX "InvSupplier_institutionId_academicYear_idx" ON "InvSupplier"("institutionId", "academicYear");

CREATE UNIQUE INDEX "InvItem_institutionId_itemCode_key" ON "InvItem"("institutionId", "itemCode");
CREATE INDEX "InvItem_institutionId_storeId_academicYear_idx" ON "InvItem"("institutionId", "storeId", "academicYear");
CREATE INDEX "InvItem_institutionId_categoryId_idx" ON "InvItem"("institutionId", "categoryId");

CREATE UNIQUE INDEX "InvGrn_institutionId_grnNumber_key" ON "InvGrn"("institutionId", "grnNumber");
CREATE INDEX "InvGrn_institutionId_academicYear_grnDate_idx" ON "InvGrn"("institutionId", "academicYear", "grnDate");
CREATE INDEX "InvGrn_storeId_grnDate_idx" ON "InvGrn"("storeId", "grnDate");

CREATE INDEX "InvGrnLine_grnId_idx" ON "InvGrnLine"("grnId");
CREATE INDEX "InvGrnLine_itemId_idx" ON "InvGrnLine"("itemId");

CREATE UNIQUE INDEX "InvStockOutward_institutionId_outwardNumber_key" ON "InvStockOutward"("institutionId", "outwardNumber");
CREATE INDEX "InvStockOutward_institutionId_academicYear_outwardDate_idx" ON "InvStockOutward"("institutionId", "academicYear", "outwardDate");

CREATE INDEX "InvStockOutwardLine_outwardId_idx" ON "InvStockOutwardLine"("outwardId");
CREATE INDEX "InvStockOutwardLine_itemId_idx" ON "InvStockOutwardLine"("itemId");

CREATE UNIQUE INDEX "InvTransfer_institutionId_transferNumber_key" ON "InvTransfer"("institutionId", "transferNumber");
CREATE INDEX "InvTransfer_institutionId_academicYear_idx" ON "InvTransfer"("institutionId", "academicYear");

CREATE UNIQUE INDEX "InvAdjustment_institutionId_adjustmentNumber_key" ON "InvAdjustment"("institutionId", "adjustmentNumber");
CREATE INDEX "InvAdjustment_institutionId_academicYear_idx" ON "InvAdjustment"("institutionId", "academicYear");

CREATE UNIQUE INDEX "InvPurchaseOrder_institutionId_poNumber_key" ON "InvPurchaseOrder"("institutionId", "poNumber");
CREATE INDEX "InvPurchaseOrder_institutionId_academicYear_status_idx" ON "InvPurchaseOrder"("institutionId", "academicYear", "status");

CREATE UNIQUE INDEX "InvDashboardStats_institutionId_storeId_academicYear_key" ON "InvDashboardStats"("institutionId", "storeId", "academicYear");
CREATE INDEX "InvDashboardStats_institutionId_academicYear_idx" ON "InvDashboardStats"("institutionId", "academicYear");

CREATE INDEX "InvAlert_institutionId_academicYear_status_idx" ON "InvAlert"("institutionId", "academicYear", "status");
CREATE INDEX "InvActivityLog_institutionId_createdAt_idx" ON "InvActivityLog"("institutionId", "createdAt");

CREATE UNIQUE INDEX "InvSettings_institutionId_key" ON "InvSettings"("institutionId");

CREATE UNIQUE INDEX "InvStoreAssignment_institutionId_storeId_userRole_staffName_key" ON "InvStoreAssignment"("institutionId", "storeId", "userRole", "staffName");
CREATE INDEX "InvStoreAssignment_institutionId_userRole_idx" ON "InvStoreAssignment"("institutionId", "userRole");

-- AddForeignKey
ALTER TABLE "InvStore" ADD CONSTRAINT "InvStore_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvCategory" ADD CONSTRAINT "InvCategory_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvSupplier" ADD CONSTRAINT "InvSupplier_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvItem" ADD CONSTRAINT "InvItem_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvItem" ADD CONSTRAINT "InvItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "InvStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvItem" ADD CONSTRAINT "InvItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InvCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvGrn" ADD CONSTRAINT "InvGrn_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvGrn" ADD CONSTRAINT "InvGrn_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "InvStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvGrn" ADD CONSTRAINT "InvGrn_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "InvSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvGrnLine" ADD CONSTRAINT "InvGrnLine_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "InvGrn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvGrnLine" ADD CONSTRAINT "InvGrnLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InvItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvStockOutward" ADD CONSTRAINT "InvStockOutward_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvStockOutward" ADD CONSTRAINT "InvStockOutward_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "InvStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvStockOutwardLine" ADD CONSTRAINT "InvStockOutwardLine_outwardId_fkey" FOREIGN KEY ("outwardId") REFERENCES "InvStockOutward"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvStockOutwardLine" ADD CONSTRAINT "InvStockOutwardLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InvItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvTransfer" ADD CONSTRAINT "InvTransfer_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvTransfer" ADD CONSTRAINT "InvTransfer_fromStoreId_fkey" FOREIGN KEY ("fromStoreId") REFERENCES "InvStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvTransfer" ADD CONSTRAINT "InvTransfer_toStoreId_fkey" FOREIGN KEY ("toStoreId") REFERENCES "InvStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvAdjustment" ADD CONSTRAINT "InvAdjustment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvAdjustment" ADD CONSTRAINT "InvAdjustment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "InvStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvPurchaseOrder" ADD CONSTRAINT "InvPurchaseOrder_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvPurchaseOrder" ADD CONSTRAINT "InvPurchaseOrder_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "InvStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvPurchaseOrder" ADD CONSTRAINT "InvPurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "InvSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvDashboardStats" ADD CONSTRAINT "InvDashboardStats_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvAlert" ADD CONSTRAINT "InvAlert_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvActivityLog" ADD CONSTRAINT "InvActivityLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvSettings" ADD CONSTRAINT "InvSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvStoreAssignment" ADD CONSTRAINT "InvStoreAssignment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvStoreAssignment" ADD CONSTRAINT "InvStoreAssignment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "InvStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
