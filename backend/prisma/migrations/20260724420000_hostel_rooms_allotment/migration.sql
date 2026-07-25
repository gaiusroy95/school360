-- Hostel physical hierarchy: Block -> Floor -> Room -> Bed
CREATE TABLE "HostelBlock" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "blockCode" TEXT NOT NULL,
    "blockName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelFloor" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "floorNumber" INTEGER NOT NULL,
    "floorName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelFloor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelRoom" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "roomType" TEXT NOT NULL DEFAULT 'NON_AC',
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelBed" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "bedStatus" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelBed_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelAllotmentRequest" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL,
    "studentGender" TEXT NOT NULL DEFAULT 'MALE',
    "admissionNumber" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL DEFAULT '',
    "course" TEXT NOT NULL DEFAULT '',
    "yearLabel" TEXT NOT NULL DEFAULT '',
    "preferredHostelId" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "outstandingFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "eligible" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL DEFAULT 'Student',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "rejectionReason" TEXT NOT NULL DEFAULT '',
    "allottedBedId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelAllotmentRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelTransferRequest" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL,
    "fromBedId" TEXT NOT NULL,
    "toBedId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL DEFAULT 'Warden',
    "wardenApprovedBy" TEXT NOT NULL DEFAULT '',
    "adminApprovedBy" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelTransferRequest_pkey" PRIMARY KEY ("id")
);

-- Extend HostelAllotment
ALTER TABLE "HostelAllotment" ADD COLUMN "bedId" TEXT;
ALTER TABLE "HostelAllotment" ADD COLUMN "studentGender" TEXT NOT NULL DEFAULT 'MALE';
ALTER TABLE "HostelAllotment" ADD COLUMN "allotmentStatus" TEXT NOT NULL DEFAULT 'CONFIRMED';
ALTER TABLE "HostelAllotment" ADD COLUMN "feeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "HostelAllotment" ADD COLUMN "invoiceNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelAllotment" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "HostelAllotment" ADD COLUMN "approvedBy" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelAllotment" ADD COLUMN "notificationSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HostelAllotment" ADD COLUMN "transferFromBedId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "HostelAllotment" ADD COLUMN "remarks" TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX "HostelBlock_institutionId_hostelId_blockCode_key" ON "HostelBlock"("institutionId", "hostelId", "blockCode");
CREATE INDEX "HostelBlock_institutionId_hostelId_status_idx" ON "HostelBlock"("institutionId", "hostelId", "status");

CREATE UNIQUE INDEX "HostelFloor_institutionId_blockId_floorNumber_key" ON "HostelFloor"("institutionId", "blockId", "floorNumber");
CREATE INDEX "HostelFloor_institutionId_blockId_status_idx" ON "HostelFloor"("institutionId", "blockId", "status");

CREATE UNIQUE INDEX "HostelRoom_institutionId_floorId_roomNumber_key" ON "HostelRoom"("institutionId", "floorId", "roomNumber");
CREATE INDEX "HostelRoom_institutionId_floorId_roomType_idx" ON "HostelRoom"("institutionId", "floorId", "roomType");

CREATE UNIQUE INDEX "HostelBed_institutionId_roomId_bedNumber_key" ON "HostelBed"("institutionId", "roomId", "bedNumber");
CREATE INDEX "HostelBed_institutionId_bedStatus_idx" ON "HostelBed"("institutionId", "bedStatus");

CREATE INDEX "HostelAllotmentRequest_institutionId_academicYear_status_idx" ON "HostelAllotmentRequest"("institutionId", "academicYear", "status");
CREATE INDEX "HostelAllotmentRequest_institutionId_studentId_idx" ON "HostelAllotmentRequest"("institutionId", "studentId");

CREATE INDEX "HostelTransferRequest_institutionId_academicYear_status_idx" ON "HostelTransferRequest"("institutionId", "academicYear", "status");

CREATE INDEX "HostelAllotment_institutionId_bedId_idx" ON "HostelAllotment"("institutionId", "bedId");
CREATE INDEX "HostelAllotment_institutionId_studentId_status_idx" ON "HostelAllotment"("institutionId", "studentId", "status");

ALTER TABLE "HostelBlock" ADD CONSTRAINT "HostelBlock_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelBlock" ADD CONSTRAINT "HostelBlock_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "HostelMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelFloor" ADD CONSTRAINT "HostelFloor_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelFloor" ADD CONSTRAINT "HostelFloor_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "HostelBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelRoom" ADD CONSTRAINT "HostelRoom_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelRoom" ADD CONSTRAINT "HostelRoom_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "HostelFloor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelBed" ADD CONSTRAINT "HostelBed_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelBed" ADD CONSTRAINT "HostelBed_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "HostelRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelAllotmentRequest" ADD CONSTRAINT "HostelAllotmentRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelTransferRequest" ADD CONSTRAINT "HostelTransferRequest_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelAllotment" ADD CONSTRAINT "HostelAllotment_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "HostelBed"("id") ON DELETE SET NULL ON UPDATE CASCADE;
