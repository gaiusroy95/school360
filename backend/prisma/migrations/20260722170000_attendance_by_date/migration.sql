-- CreateTable
CREATE TABLE "TeacherSubstituteAssignment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "sessionDate" DATE NOT NULL,
    "absentTeacherProfileId" TEXT NOT NULL,
    "substituteTeacherProfileId" TEXT NOT NULL,
    "timetableSlotId" TEXT NOT NULL DEFAULT '',
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL DEFAULT '',
    "subjectName" TEXT NOT NULL,
    "period" INTEGER NOT NULL DEFAULT 1,
    "periodLabel" TEXT NOT NULL DEFAULT 'P1',
    "startTime" TEXT NOT NULL DEFAULT '',
    "endTime" TEXT NOT NULL DEFAULT '',
    "room" TEXT NOT NULL DEFAULT '',
    "notificationSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherSubstituteAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSubstituteAssignment_institutionId_recordId_key" ON "TeacherSubstituteAssignment"("institutionId", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSubstituteAssignment_institutionId_sessionDate_timetab_key" ON "TeacherSubstituteAssignment"("institutionId", "sessionDate", "timetableSlotId", "absentTeacherProfileId");

-- CreateIndex
CREATE INDEX "TeacherSubstituteAssignment_institutionId_academicYear_sessio_idx" ON "TeacherSubstituteAssignment"("institutionId", "academicYear", "sessionDate");

-- AddForeignKey
ALTER TABLE "TeacherSubstituteAssignment" ADD CONSTRAINT "TeacherSubstituteAssignment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubstituteAssignment" ADD CONSTRAINT "TeacherSubstituteAssignment_absentTeacherProfileId_fkey" FOREIGN KEY ("absentTeacherProfileId") REFERENCES "TeacherAttendanceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubstituteAssignment" ADD CONSTRAINT "TeacherSubstituteAssignment_substituteTeacherProfileId_fkey" FOREIGN KEY ("substituteTeacherProfileId") REFERENCES "TeacherAttendanceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
