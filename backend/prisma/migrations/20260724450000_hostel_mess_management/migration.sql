CREATE TABLE "HostelMessMealType" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "mealCode" TEXT NOT NULL,
    "mealName" TEXT NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '07:00',
    "endTime" TEXT NOT NULL DEFAULT '09:00',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelMessMealType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelMessMenu" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL DEFAULT '',
    "mealTypeId" TEXT NOT NULL,
    "menuDate" DATE NOT NULL,
    "menuItems" TEXT NOT NULL DEFAULT '',
    "mealPreference" TEXT NOT NULL DEFAULT 'ALL',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelMessMenu_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelMessEnrollment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL,
    "mealPreference" TEXT NOT NULL DEFAULT 'VEG',
    "optedIn" BOOLEAN NOT NULL DEFAULT true,
    "optOutFrom" DATE,
    "optOutTo" DATE,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelMessEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelMessAttendance" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL DEFAULT '',
    "studentId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL,
    "mealTypeId" TEXT NOT NULL,
    "mealDate" DATE NOT NULL,
    "scanMethod" TEXT NOT NULL DEFAULT 'RFID',
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scanToken" TEXT NOT NULL DEFAULT '',
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "recordedBy" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',

    CONSTRAINT "HostelMessAttendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelMessExpense" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "expenseDate" DATE NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Raw Materials',
    "description" TEXT NOT NULL DEFAULT '',
    "amount" DOUBLE PRECISION NOT NULL,
    "recordedBy" TEXT NOT NULL DEFAULT 'Mess Manager',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelMessExpense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelMessFeedback" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL DEFAULT '',
    "menuId" TEXT,
    "mealTypeId" TEXT,
    "mealDate" DATE NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "comments" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelMessFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelMessRebate" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL DEFAULT '',
    "studentName" TEXT NOT NULL,
    "leaveDays" INTEGER NOT NULL DEFAULT 0,
    "rebateAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "periodLabel" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelMessRebate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HostelMessInventoryLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "mealTypeId" TEXT NOT NULL,
    "menuDate" DATE NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "headcount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostelMessInventoryLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HostelMessMealType_institutionId_mealCode_key" ON "HostelMessMealType"("institutionId", "mealCode");
CREATE INDEX "HostelMessMealType_institutionId_status_idx" ON "HostelMessMealType"("institutionId", "status");

CREATE UNIQUE INDEX "HostelMessMenu_institutionId_mealTypeId_menuDate_mealPreference_key" ON "HostelMessMenu"("institutionId", "mealTypeId", "menuDate", "mealPreference");
CREATE INDEX "HostelMessMenu_institutionId_menuDate_isPublished_idx" ON "HostelMessMenu"("institutionId", "menuDate", "isPublished");

CREATE UNIQUE INDEX "HostelMessEnrollment_institutionId_studentProfileId_academicYear_key" ON "HostelMessEnrollment"("institutionId", "studentProfileId", "academicYear");
CREATE INDEX "HostelMessEnrollment_institutionId_academicYear_optedIn_idx" ON "HostelMessEnrollment"("institutionId", "academicYear", "optedIn");

CREATE UNIQUE INDEX "HostelMessAttendance_institutionId_studentId_mealTypeId_mealDate_key" ON "HostelMessAttendance"("institutionId", "studentId", "mealTypeId", "mealDate");
CREATE INDEX "HostelMessAttendance_institutionId_mealDate_idx" ON "HostelMessAttendance"("institutionId", "mealDate");

CREATE INDEX "HostelMessExpense_institutionId_expenseDate_idx" ON "HostelMessExpense"("institutionId", "expenseDate");
CREATE INDEX "HostelMessExpense_institutionId_academicYear_idx" ON "HostelMessExpense"("institutionId", "academicYear");

CREATE INDEX "HostelMessFeedback_institutionId_mealDate_idx" ON "HostelMessFeedback"("institutionId", "mealDate");

CREATE INDEX "HostelMessRebate_institutionId_academicYear_idx" ON "HostelMessRebate"("institutionId", "academicYear");

CREATE INDEX "HostelMessInventoryLog_institutionId_menuDate_idx" ON "HostelMessInventoryLog"("institutionId", "menuDate");

ALTER TABLE "HostelMessMealType" ADD CONSTRAINT "HostelMessMealType_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelMessMenu" ADD CONSTRAINT "HostelMessMenu_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelMessMenu" ADD CONSTRAINT "HostelMessMenu_mealTypeId_fkey" FOREIGN KEY ("mealTypeId") REFERENCES "HostelMessMealType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelMessEnrollment" ADD CONSTRAINT "HostelMessEnrollment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelMessEnrollment" ADD CONSTRAINT "HostelMessEnrollment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "HostelStudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelMessAttendance" ADD CONSTRAINT "HostelMessAttendance_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelMessAttendance" ADD CONSTRAINT "HostelMessAttendance_mealTypeId_fkey" FOREIGN KEY ("mealTypeId") REFERENCES "HostelMessMealType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelMessExpense" ADD CONSTRAINT "HostelMessExpense_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelMessFeedback" ADD CONSTRAINT "HostelMessFeedback_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelMessFeedback" ADD CONSTRAINT "HostelMessFeedback_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "HostelMessMenu"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HostelMessFeedback" ADD CONSTRAINT "HostelMessFeedback_mealTypeId_fkey" FOREIGN KEY ("mealTypeId") REFERENCES "HostelMessMealType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HostelMessRebate" ADD CONSTRAINT "HostelMessRebate_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HostelMessInventoryLog" ADD CONSTRAINT "HostelMessInventoryLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostelMessInventoryLog" ADD CONSTRAINT "HostelMessInventoryLog_mealTypeId_fkey" FOREIGN KEY ("mealTypeId") REFERENCES "HostelMessMealType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
