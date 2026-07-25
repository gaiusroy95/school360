-- AlterTable
ALTER TABLE "LibBook" ADD COLUMN "inHouseOnly" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "LibBookCopy" ADD COLUMN "rfidTagId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "LibSettings" ADD COLUMN "readingRoomBookingGraceMins" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "LibSettings" ADD COLUMN "readingRoomReminderMins" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "LibReadingSeat" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "seatCode" TEXT NOT NULL,
    "floorZone" TEXT NOT NULL DEFAULT 'Ground Floor',
    "rowIndex" INTEGER NOT NULL DEFAULT 0,
    "colIndex" INTEGER NOT NULL DEFAULT 0,
    "seatType" TEXT NOT NULL DEFAULT 'CARREL',
    "hasPower" BOOLEAN NOT NULL DEFAULT false,
    "hasLamp" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibReadingSeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibReadingSeatBooking" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "occupiedAt" TIMESTAMP(3),
    "vacatedAt" TIMESTAMP(3),
    "gateDeadline" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderSentAt" TIMESTAMP(3),
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "performedBy" TEXT NOT NULL DEFAULT 'Librarian',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibReadingSeatBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibInHouseTxn" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "copyId" TEXT,
    "seatId" TEXT,
    "txnNumber" TEXT NOT NULL,
    "issueTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnTime" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "rfidAlarmActive" BOOLEAN NOT NULL DEFAULT true,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "issuedBy" TEXT NOT NULL DEFAULT 'Librarian',
    "returnedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibInHouseTxn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LibReadingSeat_institutionId_seatCode_key" ON "LibReadingSeat"("institutionId", "seatCode");
CREATE INDEX "LibReadingSeat_institutionId_branchId_status_idx" ON "LibReadingSeat"("institutionId", "branchId", "status");

CREATE INDEX "LibReadingSeatBooking_institutionId_seatId_status_idx" ON "LibReadingSeatBooking"("institutionId", "seatId", "status");
CREATE INDEX "LibReadingSeatBooking_institutionId_memberId_status_idx" ON "LibReadingSeatBooking"("institutionId", "memberId", "status");
CREATE INDEX "LibReadingSeatBooking_institutionId_startTime_endTime_idx" ON "LibReadingSeatBooking"("institutionId", "startTime", "endTime");

CREATE UNIQUE INDEX "LibInHouseTxn_institutionId_txnNumber_key" ON "LibInHouseTxn"("institutionId", "txnNumber");
CREATE INDEX "LibInHouseTxn_institutionId_memberId_status_idx" ON "LibInHouseTxn"("institutionId", "memberId", "status");
CREATE INDEX "LibInHouseTxn_institutionId_bookId_status_idx" ON "LibInHouseTxn"("institutionId", "bookId", "status");
CREATE INDEX "LibInHouseTxn_branchId_issueTime_idx" ON "LibInHouseTxn"("branchId", "issueTime");

-- AddForeignKey
ALTER TABLE "LibReadingSeat" ADD CONSTRAINT "LibReadingSeat_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibReadingSeat" ADD CONSTRAINT "LibReadingSeat_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "LibBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LibReadingSeatBooking" ADD CONSTRAINT "LibReadingSeatBooking_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibReadingSeatBooking" ADD CONSTRAINT "LibReadingSeatBooking_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "LibBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibReadingSeatBooking" ADD CONSTRAINT "LibReadingSeatBooking_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "LibReadingSeat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibReadingSeatBooking" ADD CONSTRAINT "LibReadingSeatBooking_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LibMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LibInHouseTxn" ADD CONSTRAINT "LibInHouseTxn_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibInHouseTxn" ADD CONSTRAINT "LibInHouseTxn_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "LibBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibInHouseTxn" ADD CONSTRAINT "LibInHouseTxn_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LibMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibInHouseTxn" ADD CONSTRAINT "LibInHouseTxn_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "LibBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibInHouseTxn" ADD CONSTRAINT "LibInHouseTxn_copyId_fkey" FOREIGN KEY ("copyId") REFERENCES "LibBookCopy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibInHouseTxn" ADD CONSTRAINT "LibInHouseTxn_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "LibReadingSeat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
