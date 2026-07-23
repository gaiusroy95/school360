-- CreateEnum
CREATE TYPE "TransportIncidentType" AS ENUM ('COLLISION', 'BREAKDOWN', 'DELAY', 'EMERGENCY', 'OTHER');

-- CreateTable
CREATE TABLE "TransportTrackingConfig" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "trackingStart" TEXT NOT NULL DEFAULT '06:00',
    "trackingEnd" TEXT NOT NULL DEFAULT '10:00',
    "collisionRadiusMeters" INTEGER NOT NULL DEFAULT 50,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportTrackingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportVehicle" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "routeName" TEXT NOT NULL DEFAULT '',
    "driverName" TEXT NOT NULL DEFAULT '',
    "driverMobile" TEXT NOT NULL DEFAULT '',
    "staffProfileId" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleLocation" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL DEFAULT '',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speedKmh" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "heading" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportIncident" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL DEFAULT '',
    "incidentType" "TransportIncidentType" NOT NULL DEFAULT 'OTHER',
    "description" TEXT NOT NULL DEFAULT '',
    "latitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "longitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageDispatchLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "template" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL,
    "response" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageDispatchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransportTrackingConfig_institutionId_key" ON "TransportTrackingConfig"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "TransportVehicle_institutionId_recordId_key" ON "TransportVehicle"("institutionId", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "TransportVehicle_institutionId_vehicleNumber_key" ON "TransportVehicle"("institutionId", "vehicleNumber");

-- CreateIndex
CREATE INDEX "TransportVehicle_institutionId_isActive_idx" ON "TransportVehicle"("institutionId", "isActive");

-- CreateIndex
CREATE INDEX "VehicleLocation_institutionId_vehicleId_recordedAt_idx" ON "VehicleLocation"("institutionId", "vehicleId", "recordedAt");

-- CreateIndex
CREATE INDEX "VehicleLocation_vehicleId_recordedAt_idx" ON "VehicleLocation"("vehicleId", "recordedAt");

-- CreateIndex
CREATE INDEX "TransportIncident_institutionId_createdAt_idx" ON "TransportIncident"("institutionId", "createdAt");

-- CreateIndex
CREATE INDEX "TransportIncident_vehicleId_createdAt_idx" ON "TransportIncident"("vehicleId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageDispatchLog_institutionId_channel_createdAt_idx" ON "MessageDispatchLog"("institutionId", "channel", "createdAt");

-- AddForeignKey
ALTER TABLE "TransportTrackingConfig" ADD CONSTRAINT "TransportTrackingConfig_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportVehicle" ADD CONSTRAINT "TransportVehicle_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleLocation" ADD CONSTRAINT "VehicleLocation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleLocation" ADD CONSTRAINT "VehicleLocation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportIncident" ADD CONSTRAINT "TransportIncident_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportIncident" ADD CONSTRAINT "TransportIncident_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
