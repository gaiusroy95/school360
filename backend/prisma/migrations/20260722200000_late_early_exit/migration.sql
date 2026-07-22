-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN "checkOutTime" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AttendanceRecord" ADD COLUMN "earlyExitMinutes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TeacherAttendanceDailyRecord" ADD COLUMN "checkOutTime" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TeacherAttendanceDailyRecord" ADD COLUMN "lateMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TeacherAttendanceDailyRecord" ADD COLUMN "earlyExitMinutes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StaffAttendanceDailyRecord" ADD COLUMN "checkOutTime" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StaffAttendanceDailyRecord" ADD COLUMN "lateMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StaffAttendanceDailyRecord" ADD COLUMN "earlyExitMinutes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AttendanceTimelineConfig" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "studentSchoolStart" TEXT NOT NULL DEFAULT '08:00',
    "studentLateAfter" TEXT NOT NULL DEFAULT '08:15',
    "studentSchoolEnd" TEXT NOT NULL DEFAULT '15:30',
    "studentEarlyExitBefore" TEXT NOT NULL DEFAULT '15:00',
    "teacherSchoolStart" TEXT NOT NULL DEFAULT '08:00',
    "teacherLateAfter" TEXT NOT NULL DEFAULT '08:30',
    "teacherSchoolEnd" TEXT NOT NULL DEFAULT '16:00',
    "teacherEarlyExitBefore" TEXT NOT NULL DEFAULT '15:30',
    "staffSchoolStart" TEXT NOT NULL DEFAULT '08:00',
    "staffLateAfter" TEXT NOT NULL DEFAULT '08:30',
    "staffSchoolEnd" TEXT NOT NULL DEFAULT '16:00',
    "staffEarlyExitBefore" TEXT NOT NULL DEFAULT '15:30',
    "updatedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceTimelineConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceTimelineConfig_institutionId_key" ON "AttendanceTimelineConfig"("institutionId");

-- AddForeignKey
ALTER TABLE "AttendanceTimelineConfig" ADD CONSTRAINT "AttendanceTimelineConfig_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
