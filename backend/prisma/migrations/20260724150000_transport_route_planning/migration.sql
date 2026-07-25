-- Transport Route Planning module

CREATE TABLE "TransportRoutePlan" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "planNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "routeId" TEXT,
    "planType" TEXT NOT NULL DEFAULT 'DAILY',
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "branch" TEXT NOT NULL DEFAULT 'Main Campus',
    "transportCategory" TEXT NOT NULL DEFAULT 'Regular',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "workflowStage" TEXT NOT NULL DEFAULT 'PLANNING',
    "vehicleId" TEXT,
    "driverId" TEXT,
    "backupDriverId" TEXT,
    "attendantId" TEXT,
    "scheduledDate" DATE,
    "startTime" TEXT NOT NULL DEFAULT '07:00',
    "endTime" TEXT NOT NULL DEFAULT '08:30',
    "schoolOpenTime" TEXT NOT NULL DEFAULT '08:00',
    "schoolCloseTime" TEXT NOT NULL DEFAULT '15:30',
    "distanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 0,
    "fuelEstimate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costEstimate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tollEstimate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "occupiedSeats" INTEGER NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "capacityValid" BOOLEAN NOT NULL DEFAULT false,
    "versionLabel" TEXT NOT NULL DEFAULT 'v1',
    "clonedFromId" TEXT,
    "optimizationNotes" TEXT NOT NULL DEFAULT '',
    "weatherAlert" TEXT NOT NULL DEFAULT '',
    "trafficAlternate" TEXT NOT NULL DEFAULT '',
    "simulationResult" JSONB NOT NULL DEFAULT '{}',
    "publishedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT NOT NULL DEFAULT '',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportRoutePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportRoutePlanStop" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "stopName" TEXT NOT NULL,
    "sequenceOrder" INTEGER NOT NULL DEFAULT 0,
    "stopType" TEXT NOT NULL DEFAULT 'PICKUP',
    "pickupTime" TEXT NOT NULL DEFAULT '',
    "dropTime" TEXT NOT NULL DEFAULT '',
    "waitMinutes" INTEGER NOT NULL DEFAULT 2,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 3,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "geoValidated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportRoutePlanStop_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportRoutePlanAllocation" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL DEFAULT 'STUDENT',
    "entityName" TEXT NOT NULL,
    "stopName" TEXT NOT NULL DEFAULT '',
    "seatNumber" INTEGER,
    "specialNeeds" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportRoutePlanAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportRoutePlanApproval" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "approverRole" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT NOT NULL DEFAULT '',
    "actionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportRoutePlanApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportPlanningSettings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "workflowStages" JSONB NOT NULL DEFAULT '[]',
    "transportCategories" JSONB NOT NULL DEFAULT '[]',
    "roleMatrix" JSONB NOT NULL DEFAULT '[]',
    "notificationRules" JSONB NOT NULL DEFAULT '{}',
    "mobileSyncRules" JSONB NOT NULL DEFAULT '{}',
    "reportCatalog" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportPlanningSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TransportRoutePlan_institutionId_planNumber_key" ON "TransportRoutePlan"("institutionId", "planNumber");
CREATE INDEX "TransportRoutePlan_institutionId_status_scheduledDate_idx" ON "TransportRoutePlan"("institutionId", "status", "scheduledDate");
CREATE INDEX "TransportRoutePlan_institutionId_academicYear_branch_idx" ON "TransportRoutePlan"("institutionId", "academicYear", "branch");

CREATE INDEX "TransportRoutePlanStop_planId_sequenceOrder_idx" ON "TransportRoutePlanStop"("planId", "sequenceOrder");
CREATE INDEX "TransportRoutePlanStop_institutionId_idx" ON "TransportRoutePlanStop"("institutionId");

CREATE INDEX "TransportRoutePlanAllocation_planId_entityType_idx" ON "TransportRoutePlanAllocation"("planId", "entityType");
CREATE INDEX "TransportRoutePlanAllocation_institutionId_idx" ON "TransportRoutePlanAllocation"("institutionId");

CREATE INDEX "TransportRoutePlanApproval_planId_approverRole_idx" ON "TransportRoutePlanApproval"("planId", "approverRole");
CREATE INDEX "TransportRoutePlanApproval_institutionId_idx" ON "TransportRoutePlanApproval"("institutionId");

CREATE UNIQUE INDEX "TransportPlanningSettings_institutionId_key" ON "TransportPlanningSettings"("institutionId");

ALTER TABLE "TransportRoutePlan" ADD CONSTRAINT "TransportRoutePlan_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportRoutePlan" ADD CONSTRAINT "TransportRoutePlan_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportRoutePlan" ADD CONSTRAINT "TransportRoutePlan_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportRoutePlan" ADD CONSTRAINT "TransportRoutePlan_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "TransportStaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportRoutePlan" ADD CONSTRAINT "TransportRoutePlan_backupDriverId_fkey" FOREIGN KEY ("backupDriverId") REFERENCES "TransportStaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportRoutePlan" ADD CONSTRAINT "TransportRoutePlan_attendantId_fkey" FOREIGN KEY ("attendantId") REFERENCES "TransportStaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TransportRoutePlanStop" ADD CONSTRAINT "TransportRoutePlanStop_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportRoutePlanStop" ADD CONSTRAINT "TransportRoutePlanStop_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TransportRoutePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportRoutePlanAllocation" ADD CONSTRAINT "TransportRoutePlanAllocation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportRoutePlanAllocation" ADD CONSTRAINT "TransportRoutePlanAllocation_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TransportRoutePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportRoutePlanApproval" ADD CONSTRAINT "TransportRoutePlanApproval_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportRoutePlanApproval" ADD CONSTRAINT "TransportRoutePlanApproval_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TransportRoutePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransportPlanningSettings" ADD CONSTRAINT "TransportPlanningSettings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
