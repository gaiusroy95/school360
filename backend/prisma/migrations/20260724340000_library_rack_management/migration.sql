ALTER TABLE "LibCategory" ADD COLUMN IF NOT EXISTS "defaultRackId" TEXT;

ALTER TABLE "LibBookCopy" ADD COLUMN IF NOT EXISTS "shelfId" TEXT;

CREATE TABLE IF NOT EXISTS "LibLocation" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "parentId" TEXT,
    "locationType" TEXT NOT NULL,
    "locationName" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibRack" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "rackNumber" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 50,
    "assetTag" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibRack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibShelf" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "rackId" TEXT NOT NULL,
    "shelfNumber" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 20,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibShelf_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LibLocation_institutionId_branchId_locationCode_key" ON "LibLocation"("institutionId", "branchId", "locationCode");
CREATE INDEX IF NOT EXISTS "LibLocation_institutionId_branchId_parentId_idx" ON "LibLocation"("institutionId", "branchId", "parentId");
CREATE UNIQUE INDEX IF NOT EXISTS "LibRack_institutionId_locationId_rackNumber_key" ON "LibRack"("institutionId", "locationId", "rackNumber");
CREATE INDEX IF NOT EXISTS "LibRack_institutionId_locationId_idx" ON "LibRack"("institutionId", "locationId");
CREATE UNIQUE INDEX IF NOT EXISTS "LibShelf_institutionId_rackId_shelfNumber_key" ON "LibShelf"("institutionId", "rackId", "shelfNumber");
CREATE INDEX IF NOT EXISTS "LibShelf_institutionId_rackId_idx" ON "LibShelf"("institutionId", "rackId");
CREATE INDEX IF NOT EXISTS "LibBookCopy_shelfId_idx" ON "LibBookCopy"("shelfId");

ALTER TABLE "LibCategory" ADD CONSTRAINT "LibCategory_defaultRackId_fkey" FOREIGN KEY ("defaultRackId") REFERENCES "LibRack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibLocation" ADD CONSTRAINT "LibLocation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibLocation" ADD CONSTRAINT "LibLocation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "LibBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibLocation" ADD CONSTRAINT "LibLocation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LibLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibRack" ADD CONSTRAINT "LibRack_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibRack" ADD CONSTRAINT "LibRack_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "LibLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibShelf" ADD CONSTRAINT "LibShelf_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibShelf" ADD CONSTRAINT "LibShelf_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "LibRack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibBookCopy" ADD CONSTRAINT "LibBookCopy_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "LibShelf"("id") ON DELETE SET NULL ON UPDATE CASCADE;
