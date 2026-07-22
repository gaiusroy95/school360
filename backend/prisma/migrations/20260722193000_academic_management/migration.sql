-- CreateEnum
CREATE TYPE "AcademicLessonPlanStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'PENDING');
CREATE TYPE "AcademicHomeworkStatus" AS ENUM ('ASSIGNED', 'SUBMITTED', 'PENDING', 'OVERDUE');
CREATE TYPE "AcademicCceType" AS ENUM ('UNIT_TEST', 'ASSIGNMENT', 'PROJECT', 'ACTIVITY');
CREATE TYPE "AcademicEventType" AS ENUM ('HOLIDAY', 'EXAM', 'PTM', 'ACTIVITY', 'OTHER');
CREATE TYPE "AcademicWorkloadLevel" AS ENUM ('FULL', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "AcademicClassSection" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 40,
    "room" TEXT NOT NULL DEFAULT '',
    "classTeacher" TEXT NOT NULL DEFAULT '',
    "classTeacherPhone" TEXT NOT NULL DEFAULT '',
    "classTeacherEmail" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicClassSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicSubject" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "subjectCode" TEXT NOT NULL DEFAULT '',
    "subjectType" TEXT NOT NULL DEFAULT 'Core',
    "subjectGroup" TEXT NOT NULL DEFAULT 'General',
    "isElective" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicSubject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicSubjectAllocation" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "teacherName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicSubjectAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicSyllabusChapter" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "term" TEXT NOT NULL DEFAULT 'Term 1',
    "className" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "chapterTitle" TEXT NOT NULL,
    "unitNumber" INTEGER NOT NULL DEFAULT 1,
    "completionPercent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicSyllabusChapter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicTimetableSlot" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL DEFAULT 1,
    "period" INTEGER NOT NULL DEFAULT 1,
    "periodLabel" TEXT NOT NULL DEFAULT 'P1',
    "startTime" TEXT NOT NULL DEFAULT '08:00',
    "endTime" TEXT NOT NULL DEFAULT '08:40',
    "subjectName" TEXT NOT NULL,
    "teacherName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicTimetableSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicLessonPlan" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "term" TEXT NOT NULL DEFAULT 'Term 1',
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'General',
    "title" TEXT NOT NULL,
    "teacherName" TEXT NOT NULL DEFAULT '',
    "plannedDate" TIMESTAMP(3),
    "status" "AcademicLessonPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "completionPercent" INTEGER NOT NULL DEFAULT 0,
    "sharedAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicLessonPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicHomework" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "term" TEXT NOT NULL DEFAULT 'Term 1',
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "assignedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "status" "AcademicHomeworkStatus" NOT NULL DEFAULT 'ASSIGNED',
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "submittedCount" INTEGER NOT NULL DEFAULT 0,
    "sharedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicHomework_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicCalendarEvent" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "term" TEXT NOT NULL DEFAULT 'Term 1',
    "title" TEXT NOT NULL,
    "eventType" "AcademicEventType" NOT NULL DEFAULT 'OTHER',
    "eventDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sharedToParents" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicCalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicCceRecord" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "term" TEXT NOT NULL DEFAULT 'Term 1',
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL DEFAULT '',
    "cceType" "AcademicCceType" NOT NULL,
    "title" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL DEFAULT '',
    "conductedDate" TIMESTAMP(3),
    "maxMarks" INTEGER NOT NULL DEFAULT 100,
    "evaluatedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Conducted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicCceRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicCoScholasticActivity" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "title" TEXT NOT NULL,
    "activityDate" TIMESTAMP(3) NOT NULL,
    "venue" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicCoScholasticActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicTeacherAllocation" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "teacherName" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'General',
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL DEFAULT '',
    "subjectName" TEXT NOT NULL,
    "periodsPerWeek" INTEGER NOT NULL DEFAULT 0,
    "workloadLevel" "AcademicWorkloadLevel" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicTeacherAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademicClassSection_institutionId_recordId_key" ON "AcademicClassSection"("institutionId", "recordId");
CREATE UNIQUE INDEX "AcademicClassSection_institutionId_academicYear_className_sectionName_key" ON "AcademicClassSection"("institutionId", "academicYear", "className", "sectionName");
CREATE INDEX "AcademicClassSection_institutionId_academicYear_idx" ON "AcademicClassSection"("institutionId", "academicYear");

CREATE UNIQUE INDEX "AcademicSubject_institutionId_recordId_key" ON "AcademicSubject"("institutionId", "recordId");
CREATE INDEX "AcademicSubject_institutionId_subjectName_idx" ON "AcademicSubject"("institutionId", "subjectName");

CREATE UNIQUE INDEX "AcademicSubjectAllocation_institutionId_recordId_key" ON "AcademicSubjectAllocation"("institutionId", "recordId");
CREATE UNIQUE INDEX "AcademicSubjectAllocation_institutionId_academicYear_className_sectionName_subjectId_key" ON "AcademicSubjectAllocation"("institutionId", "academicYear", "className", "sectionName", "subjectId");
CREATE INDEX "AcademicSubjectAllocation_institutionId_academicYear_idx" ON "AcademicSubjectAllocation"("institutionId", "academicYear");

CREATE UNIQUE INDEX "AcademicSyllabusChapter_institutionId_recordId_key" ON "AcademicSyllabusChapter"("institutionId", "recordId");
CREATE INDEX "AcademicSyllabusChapter_institutionId_academicYear_className_idx" ON "AcademicSyllabusChapter"("institutionId", "academicYear", "className");

CREATE UNIQUE INDEX "AcademicTimetableSlot_institutionId_recordId_key" ON "AcademicTimetableSlot"("institutionId", "recordId");
CREATE INDEX "AcademicTimetableSlot_institutionId_academicYear_className_sectionName_idx" ON "AcademicTimetableSlot"("institutionId", "academicYear", "className", "sectionName");

CREATE UNIQUE INDEX "AcademicLessonPlan_institutionId_recordId_key" ON "AcademicLessonPlan"("institutionId", "recordId");
CREATE INDEX "AcademicLessonPlan_institutionId_academicYear_status_idx" ON "AcademicLessonPlan"("institutionId", "academicYear", "status");

CREATE UNIQUE INDEX "AcademicHomework_institutionId_recordId_key" ON "AcademicHomework"("institutionId", "recordId");
CREATE INDEX "AcademicHomework_institutionId_academicYear_status_idx" ON "AcademicHomework"("institutionId", "academicYear", "status");

CREATE UNIQUE INDEX "AcademicCalendarEvent_institutionId_recordId_key" ON "AcademicCalendarEvent"("institutionId", "recordId");
CREATE INDEX "AcademicCalendarEvent_institutionId_academicYear_eventDate_idx" ON "AcademicCalendarEvent"("institutionId", "academicYear", "eventDate");

CREATE UNIQUE INDEX "AcademicCceRecord_institutionId_recordId_key" ON "AcademicCceRecord"("institutionId", "recordId");
CREATE INDEX "AcademicCceRecord_institutionId_academicYear_cceType_idx" ON "AcademicCceRecord"("institutionId", "academicYear", "cceType");

CREATE UNIQUE INDEX "AcademicCoScholasticActivity_institutionId_recordId_key" ON "AcademicCoScholasticActivity"("institutionId", "recordId");
CREATE INDEX "AcademicCoScholasticActivity_institutionId_academicYear_idx" ON "AcademicCoScholasticActivity"("institutionId", "academicYear");

CREATE UNIQUE INDEX "AcademicTeacherAllocation_institutionId_recordId_key" ON "AcademicTeacherAllocation"("institutionId", "recordId");
CREATE INDEX "AcademicTeacherAllocation_institutionId_academicYear_teacherName_idx" ON "AcademicTeacherAllocation"("institutionId", "academicYear", "teacherName");

-- AddForeignKey
ALTER TABLE "AcademicClassSection" ADD CONSTRAINT "AcademicClassSection_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicSubject" ADD CONSTRAINT "AcademicSubject_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicSubjectAllocation" ADD CONSTRAINT "AcademicSubjectAllocation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicSubjectAllocation" ADD CONSTRAINT "AcademicSubjectAllocation_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "AcademicSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicSyllabusChapter" ADD CONSTRAINT "AcademicSyllabusChapter_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicTimetableSlot" ADD CONSTRAINT "AcademicTimetableSlot_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicLessonPlan" ADD CONSTRAINT "AcademicLessonPlan_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicHomework" ADD CONSTRAINT "AcademicHomework_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicCalendarEvent" ADD CONSTRAINT "AcademicCalendarEvent_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicCceRecord" ADD CONSTRAINT "AcademicCceRecord_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicCoScholasticActivity" ADD CONSTRAINT "AcademicCoScholasticActivity_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicTeacherAllocation" ADD CONSTRAINT "AcademicTeacherAllocation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
