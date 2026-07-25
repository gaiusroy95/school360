-- Transport Dashboard extensions

ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "routeCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "attendantName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "operationalStatus" TEXT NOT NULL DEFAULT 'IN_CAMPUS';
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "healthStatus" TEXT NOT NULL DEFAULT 'EXCELLENT';
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "studentCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "stopCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "maintenanceDueDays" INTEGER;
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "mapTopPct" DOUBLE PRECISION NOT NULL DEFAULT 50;
ALTER TABLE "TransportVehicle" ADD COLUMN IF NOT EXISTS "mapLeftPct" DOUBLE PRECISION NOT NULL DEFAULT 50;

CREATE INDEX IF NOT EXISTS "TransportVehicle_institutionId_operationalStatus_idx" ON "TransportVehicle"("institutionId", "operationalStatus");

CREATE TABLE "TransportRoute" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "routeCode" TEXT NOT NULL,
    "routeName" TEXT NOT NULL, "stopCount" INTEGER NOT NULL DEFAULT 0,
    "studentCount" INTEGER NOT NULL DEFAULT 0, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportRoute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportTrip" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "busLabel" TEXT NOT NULL,
    "routeCode" TEXT NOT NULL, "routeName" TEXT NOT NULL, "driverName" TEXT NOT NULL,
    "tripType" TEXT NOT NULL DEFAULT 'MORNING', "stopsCompleted" INTEGER NOT NULL DEFAULT 0,
    "stopsTotal" INTEGER NOT NULL DEFAULT 0, "studentsPicked" INTEGER NOT NULL DEFAULT 0,
    "studentsTotal" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'On Time',
    "tripDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportTrip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportStaffMember" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "name" TEXT NOT NULL,
    "role" TEXT NOT NULL, "mobile" TEXT NOT NULL DEFAULT '',
    "onDuty" BOOLEAN NOT NULL DEFAULT true, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportStaffMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportActivityLog" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "vehicleLabel" TEXT NOT NULL,
    "message" TEXT NOT NULL, "activityType" TEXT NOT NULL DEFAULT 'UPDATE',
    "color" TEXT NOT NULL DEFAULT 'green',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransportActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportMaintenanceSchedule" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "busLabel" TEXT NOT NULL,
    "dueInDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransportMaintenanceSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportAttendanceDaily" (
    "id" TEXT NOT NULL, "institutionId" TEXT NOT NULL, "recordDate" DATE NOT NULL,
    "picked" INTEGER NOT NULL DEFAULT 0, "pendingPick" INTEGER NOT NULL DEFAULT 0,
    "dropped" INTEGER NOT NULL DEFAULT 0, "pendingDrop" INTEGER NOT NULL DEFAULT 0,
    "attendancePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransportAttendanceDaily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TransportRoute_institutionId_routeCode_key" ON "TransportRoute"("institutionId", "routeCode");
CREATE INDEX "TransportRoute_institutionId_isActive_idx" ON "TransportRoute"("institutionId", "isActive");
CREATE INDEX "TransportTrip_institutionId_tripDate_tripType_idx" ON "TransportTrip"("institutionId", "tripDate", "tripType");
CREATE INDEX "TransportStaffMember_institutionId_role_idx" ON "TransportStaffMember"("institutionId", "role");
CREATE INDEX "TransportActivityLog_institutionId_createdAt_idx" ON "TransportActivityLog"("institutionId", "createdAt");
CREATE INDEX "TransportMaintenanceSchedule_institutionId_idx" ON "TransportMaintenanceSchedule"("institutionId");
CREATE UNIQUE INDEX "TransportAttendanceDaily_institutionId_recordDate_key" ON "TransportAttendanceDaily"("institutionId", "recordDate");

ALTER TABLE "TransportRoute" ADD CONSTRAINT "TransportRoute_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportTrip" ADD CONSTRAINT "TransportTrip_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStaffMember" ADD CONSTRAINT "TransportStaffMember_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportActivityLog" ADD CONSTRAINT "TransportActivityLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportMaintenanceSchedule" ADD CONSTRAINT "TransportMaintenanceSchedule_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportAttendanceDaily" ADD CONSTRAINT "TransportAttendanceDaily_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
