-- AlterTable InvLedger
ALTER TABLE "InvLedger" ADD COLUMN "transferId" TEXT;

-- AlterTable InvTransfer
ALTER TABLE "InvTransfer" ADD COLUMN "vehicleInfo" TEXT NOT NULL DEFAULT '',
ADD COLUMN "driverName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "driverMobile" TEXT NOT NULL DEFAULT '',
ADD COLUMN "notes" TEXT NOT NULL DEFAULT '',
ADD COLUMN "disputeReason" TEXT NOT NULL DEFAULT '',
ADD COLUMN "dispatchedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "dispatchedAt" TIMESTAMP(3),
ADD COLUMN "receivedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "receivedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "InvTransfer" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateTable InvTransferLine
CREATE TABLE "InvTransferLine" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "destItemId" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "InvTransferLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvLedger_transferId_idx" ON "InvLedger"("transferId");

CREATE INDEX "InvTransfer_institutionId_academicYear_status_idx" ON "InvTransfer"("institutionId", "academicYear", "status");

CREATE INDEX "InvTransfer_fromStoreId_idx" ON "InvTransfer"("fromStoreId");

CREATE INDEX "InvTransfer_toStoreId_idx" ON "InvTransfer"("toStoreId");

CREATE INDEX "InvTransferLine_transferId_idx" ON "InvTransferLine"("transferId");

CREATE INDEX "InvTransferLine_itemId_idx" ON "InvTransferLine"("itemId");

-- AddForeignKey
ALTER TABLE "InvLedger" ADD CONSTRAINT "InvLedger_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "InvTransfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvTransferLine" ADD CONSTRAINT "InvTransferLine_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "InvTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvTransferLine" ADD CONSTRAINT "InvTransferLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InvItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Legacy transfers marked received
UPDATE "InvTransfer" SET "status" = 'RECEIVED' WHERE "status" = 'COMPLETED';
