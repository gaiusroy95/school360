-- CreateEnum
CREATE TYPE "ExamMarksColumnKey" AS ENUM ('UNIT_1', 'UNIT_2', 'UNIT_3', 'HALF_YEARLY', 'YEARLY', 'PRACTICAL_VIVA');

-- CreateEnum
CREATE TYPE "ExamMarkingSheetStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateTable
CREATE TABLE "ExamSubjectTeacherAssignment" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "teacherProfileId" TEXT,
    "teacherName" TEXT NOT NULL,
    "teacherEmail" TEXT NOT NULL DEFAULT '',
    "teacherPhone" TEXT NOT NULL DEFAULT '',
    "assignedColumns" "ExamMarksColumnKey"[],
    "examinationName" TEXT NOT NULL DEFAULT 'Annual Examination',
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSubjectTeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamMarkingSheet" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "examinationName" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "teacherName" TEXT NOT NULL,
    "status" "ExamMarkingSheetStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "submittedBy" TEXT NOT NULL DEFAULT '',
    "pdfGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamMarkingSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamStudentMarkCell" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "columnKey" "ExamMarksColumnKey" NOT NULL,
    "maxMarks" INTEGER NOT NULL,
    "marksObtained" DOUBLE PRECISION,
    "isAbsent" BOOLEAN NOT NULL DEFAULT false,
    "graceMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remarks" TEXT NOT NULL DEFAULT '',
    "grade" TEXT NOT NULL DEFAULT '',
    "examinerObservations" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamStudentMarkCell_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamSubjectTeacherAssignment_institutionId_recordId_key" ON "ExamSubjectTeacherAssignment"("institutionId", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSubjectTeacherAssignment_institutionId_academicYear_class_key" ON "ExamSubjectTeacherAssignment"("institutionId", "academicYear", "className", "sectionName", "subjectName", "teacherName");

-- CreateIndex
CREATE INDEX "ExamSubjectTeacherAssignment_institutionId_academicYear_teache_idx" ON "ExamSubjectTeacherAssignment"("institutionId", "academicYear", "teacherName");

-- CreateIndex
CREATE INDEX "ExamSubjectTeacherAssignment_institutionId_className_sectionNa_idx" ON "ExamSubjectTeacherAssignment"("institutionId", "className", "sectionName");

-- CreateIndex
CREATE UNIQUE INDEX "ExamMarkingSheet_institutionId_recordId_key" ON "ExamMarkingSheet"("institutionId", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamMarkingSheet_assignmentId_key" ON "ExamMarkingSheet"("assignmentId");

-- CreateIndex
CREATE INDEX "ExamMarkingSheet_institutionId_academicYear_status_idx" ON "ExamMarkingSheet"("institutionId", "academicYear", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExamStudentMarkCell_sheetId_studentId_columnKey_key" ON "ExamStudentMarkCell"("sheetId", "studentId", "columnKey");

-- CreateIndex
CREATE INDEX "ExamStudentMarkCell_sheetId_studentId_idx" ON "ExamStudentMarkCell"("sheetId", "studentId");

-- CreateIndex
CREATE INDEX "ExamStudentMarkCell_institutionId_studentId_idx" ON "ExamStudentMarkCell"("institutionId", "studentId");

-- AddForeignKey
ALTER TABLE "ExamSubjectTeacherAssignment" ADD CONSTRAINT "ExamSubjectTeacherAssignment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamMarkingSheet" ADD CONSTRAINT "ExamMarkingSheet_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamMarkingSheet" ADD CONSTRAINT "ExamMarkingSheet_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ExamSubjectTeacherAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamStudentMarkCell" ADD CONSTRAINT "ExamStudentMarkCell_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "ExamMarkingSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamStudentMarkCell" ADD CONSTRAINT "ExamStudentMarkCell_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
