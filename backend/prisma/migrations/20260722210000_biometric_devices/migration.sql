-- CreateEnum
CREATE TYPE "BiometricPersonType" AS ENUM ('STUDENT', 'TEACHER', 'STAFF');

-- CreateEnum
CREATE TYPE "BiometricDeviceType" AS ENUM ('FINGERPRINT', 'FACE_RECOGNITION', 'RFID_READER', 'MOBILE_GEOFENCE');

-- CreateEnum
CREATE TYPE "BiometricDeviceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "BiometricAttendanceEventType" AS ENUM ('CHECK_IN', 'CHECK_OUT');

-- CreateEnum
CREATE TYPE "BiometricPunchStatus" AS ENUM ('ACCEPTED', 'REJECTED_OUTSIDE_FENCE', 'REJECTED_NOT_ENROLLED', 'REJECTED_DEVICE_INACTIVE');

-- CreateTable
CREATE TABLE "AttendanceGeoFence" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 150,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceGeoFence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricDevice" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deviceType" "BiometricDeviceType" NOT NULL,
    "status" "BiometricDeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "location" TEXT NOT NULL DEFAULT '',
    "serialNumber" TEXT NOT NULL DEFAULT '',
    "geoFenceId" TEXT,
    "supportsStudents" BOOLEAN NOT NULL DEFAULT true,
    "supportsTeachers" BOOLEAN NOT NULL DEFAULT true,
    "supportsStaff" BOOLEAN NOT NULL DEFAULT true,
    "requiresGeoFence" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiometricDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricEnrollment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "personType" "BiometricPersonType" NOT NULL,
    "studentId" TEXT,
    "teacherProfileId" TEXT,
    "staffProfileId" TEXT,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "rfidCardId" TEXT NOT NULL DEFAULT '',
    "biometricTemplateId" TEXT NOT NULL DEFAULT '',
    "deviceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enrolledBy" TEXT NOT NULL DEFAULT '',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiometricEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricAttendancePunch" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "personType" "BiometricPersonType" NOT NULL,
    "personId" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "personCode" TEXT NOT NULL DEFAULT '',
    "classGroup" TEXT NOT NULL DEFAULT '',
    "deviceId" TEXT,
    "deviceType" "BiometricDeviceType" NOT NULL,
    "eventType" "BiometricAttendanceEventType" NOT NULL,
    "punchStatus" "BiometricPunchStatus" NOT NULL,
    "verificationMethod" TEXT NOT NULL DEFAULT 'BIOMETRIC',
    "rfidCardId" TEXT NOT NULL DEFAULT '',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "distanceMeters" DOUBLE PRECISION,
    "withinGeoFence" BOOLEAN NOT NULL DEFAULT false,
    "geoFenceId" TEXT,
    "geoFenceName" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT NOT NULL DEFAULT '',
    "punchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricAttendancePunch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceGeoFence_institutionId_recordId_key" ON "AttendanceGeoFence"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "AttendanceGeoFence_institutionId_isActive_idx" ON "AttendanceGeoFence"("institutionId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricDevice_institutionId_recordId_key" ON "BiometricDevice"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "BiometricDevice_institutionId_status_idx" ON "BiometricDevice"("institutionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricEnrollment_institutionId_recordId_key" ON "BiometricEnrollment"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "BiometricEnrollment_institutionId_personType_isActive_idx" ON "BiometricEnrollment"("institutionId", "personType", "isActive");

-- CreateIndex
CREATE INDEX "BiometricEnrollment_institutionId_rfidCardId_idx" ON "BiometricEnrollment"("institutionId", "rfidCardId");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricAttendancePunch_institutionId_recordId_key" ON "BiometricAttendancePunch"("institutionId", "recordId");

-- CreateIndex
CREATE INDEX "BiometricAttendancePunch_institutionId_punchedAt_idx" ON "BiometricAttendancePunch"("institutionId", "punchedAt");

-- CreateIndex
CREATE INDEX "BiometricAttendancePunch_institutionId_personType_punchStatus_idx" ON "BiometricAttendancePunch"("institutionId", "personType", "punchStatus");

-- AddForeignKey
ALTER TABLE "AttendanceGeoFence" ADD CONSTRAINT "AttendanceGeoFence_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricDevice" ADD CONSTRAINT "BiometricDevice_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricDevice" ADD CONSTRAINT "BiometricDevice_geoFenceId_fkey" FOREIGN KEY ("geoFenceId") REFERENCES "AttendanceGeoFence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricEnrollment" ADD CONSTRAINT "BiometricEnrollment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricEnrollment" ADD CONSTRAINT "BiometricEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricEnrollment" ADD CONSTRAINT "BiometricEnrollment_teacherProfileId_fkey" FOREIGN KEY ("teacherProfileId") REFERENCES "TeacherAttendanceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricEnrollment" ADD CONSTRAINT "BiometricEnrollment_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffAttendanceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricEnrollment" ADD CONSTRAINT "BiometricEnrollment_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BiometricDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricAttendancePunch" ADD CONSTRAINT "BiometricAttendancePunch_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricAttendancePunch" ADD CONSTRAINT "BiometricAttendancePunch_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BiometricDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricAttendancePunch" ADD CONSTRAINT "BiometricAttendancePunch_geoFenceId_fkey" FOREIGN KEY ("geoFenceId") REFERENCES "AttendanceGeoFence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
