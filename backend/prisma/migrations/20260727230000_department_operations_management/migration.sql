-- Department & Operations Management module

CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "departmentCode" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "parentId" TEXT,
    "hrDepartmentId" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "departments_institutionId_departmentCode_key" ON "departments"("institutionId", "departmentCode");
CREATE INDEX "departments_institutionId_isActive_idx" ON "departments"("institutionId", "isActive");

CREATE TABLE "department_heads" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "staffEmail" TEXT NOT NULL DEFAULT '',
    "tenureStart" TIMESTAMP(3),
    "tenureEnd" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "appointedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appointedBy" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "department_heads_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "department_heads_institutionId_departmentId_isActive_idx" ON "department_heads"("institutionId", "departmentId", "isActive");

CREATE TABLE "department_staff" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "staffEmail" TEXT NOT NULL DEFAULT '',
    "mappingType" TEXT NOT NULL DEFAULT 'PRIMARY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "department_staff_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "department_staff_institutionId_departmentId_staffName_mappingType_key" ON "department_staff"("institutionId", "departmentId", "staffName", "mappingType");
CREATE INDEX "department_staff_institutionId_staffName_idx" ON "department_staff"("institutionId", "staffName");

CREATE TABLE "department_locations" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "building" TEXT NOT NULL DEFAULT '',
    "floor" TEXT NOT NULL DEFAULT '',
    "roomLabel" TEXT NOT NULL DEFAULT '',
    "campus" TEXT NOT NULL DEFAULT 'Main Campus',
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "department_locations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "department_locations_institutionId_departmentId_idx" ON "department_locations"("institutionId", "departmentId");

CREATE TABLE "department_budgets" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL DEFAULT '2025-26',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "allocated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "categoryCaps" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "department_budgets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "department_budgets_institutionId_departmentId_fiscalYear_key" ON "department_budgets"("institutionId", "departmentId", "fiscalYear");

CREATE TABLE "important_dates" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventDate" DATE NOT NULL,
    "endDate" DATE,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "description" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "important_dates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "important_dates_institutionId_eventDate_idx" ON "important_dates"("institutionId", "eventDate");

CREATE TABLE "academic_calendars" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "term" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "academic_calendars_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "academic_calendars_institutionId_startDate_idx" ON "academic_calendars"("institutionId", "startDate");

CREATE TABLE "event_calendars" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "audience" TEXT NOT NULL DEFAULT 'ALL',
    "location" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "event_calendars_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "event_calendars_institutionId_startDate_idx" ON "event_calendars"("institutionId", "startDate");

CREATE TABLE "custom_events" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "departmentCode" TEXT NOT NULL DEFAULT '',
    "invitees" JSONB NOT NULL DEFAULT '[]',
    "description" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "custom_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "custom_events_institutionId_startDate_idx" ON "custom_events"("institutionId", "startDate");

ALTER TABLE "departments" ADD CONSTRAINT "departments_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "departments" ADD CONSTRAINT "departments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "department_heads" ADD CONSTRAINT "department_heads_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "department_heads" ADD CONSTRAINT "department_heads_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "department_staff" ADD CONSTRAINT "department_staff_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "department_staff" ADD CONSTRAINT "department_staff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "department_locations" ADD CONSTRAINT "department_locations_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "department_locations" ADD CONSTRAINT "department_locations_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "department_budgets" ADD CONSTRAINT "department_budgets_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "department_budgets" ADD CONSTRAINT "department_budgets_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "important_dates" ADD CONSTRAINT "important_dates_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "academic_calendars" ADD CONSTRAINT "academic_calendars_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_calendars" ADD CONSTRAINT "event_calendars_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_events" ADD CONSTRAINT "custom_events_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
