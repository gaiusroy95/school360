import { prisma } from './prisma.js';

type DeleteCounts = Record<string, number>;

async function del(
  counts: DeleteCounts,
  label: string,
  fn: () => Promise<{ count: number }>,
) {
  const { count } = await fn();
  if (count > 0) counts[label] = count;
  return count;
}

/**
 * Removes seeded demo records for an institution + academic year.
 * Does NOT delete users, institution setup, enquiries, or admissions.
 */
export async function clearInstitutionDemoData(
  institutionId: string,
  academicYear = '2025-26',
) {
  const year = { institutionId, academicYear };
  const promotionYear = {
    institutionId,
    OR: [
      { fromAcademicYear: academicYear },
      { toAcademicYear: academicYear },
    ],
  };
  const counts: DeleteCounts = {};

  await prisma.$transaction(async (tx) => {
    // ── Examination: certificates & promotion ──────────────────────────────
    await del(counts, 'certificates', () => tx.examCoScholasticCertificate.deleteMany({ where: year }));
    await del(counts, 'certificateConfigs', () => tx.examCertificateConfig.deleteMany({ where: year }));
    await del(counts, 'sessionHistory', () => tx.studentSessionHistory.deleteMany({ where: promotionYear }));
    await del(counts, 'gradePromotionBatches', () => tx.examGradePromotionBatch.deleteMany({ where: promotionYear }));

    // ── Examination: revaluation ───────────────────────────────────────────
    await del(counts, 'backPaperExams', () => tx.examBackPaperExam.deleteMany({ where: year }));
    await del(counts, 'revaluationRequests', () => tx.examRevaluationRequest.deleteMany({ where: year }));
    await del(counts, 'revaluationConfigs', () => tx.examRevaluationConfig.deleteMany({ where: year }));
    await del(counts, 'boardMarksheets', () => tx.examBoardMarksheetUpload.deleteMany({ where: year }));

    // ── Examination: results ─────────────────────────────────────────────
    await del(counts, 'resultAuditLogs', () => tx.examResultAuditLog.deleteMany({ where: { institutionId } }));
    await del(counts, 'resultBatches', () => tx.examResultBatch.deleteMany({ where: year }));
    await del(counts, 'reportCardConfigs', () => tx.examReportCardConfig.deleteMany({ where: year }));

    // ── Examination: marks entry (assignments cascade to sheets + cells) ─
    await del(counts, 'teacherAssignments', () => tx.examSubjectTeacherAssignment.deleteMany({ where: year }));

    // ── Examination: invigilation & seating ────────────────────────────────
    await del(counts, 'invigilationPlans', () => tx.examInvigilationPlan.deleteMany({ where: year }));
    await del(counts, 'invigilationRotation', () => tx.examInvigilationRotationState.deleteMany({ where: year }));
    await del(counts, 'seatingPlans', () => tx.examSeatingPlan.deleteMany({ where: year }));

    // ── Examination: papers & syllabus ─────────────────────────────────────
    // Digital attempts cascade when question papers are deleted
    await del(counts, 'questionPapers', () => tx.examQuestionPaper.deleteMany({ where: year }));
    await del(counts, 'examSyllabi', () => tx.examSubjectSyllabus.deleteMany({ where: year }));
    await del(counts, 'examCalendarSessions', () => tx.examCalendarSession.deleteMany({ where: year }));
    await del(counts, 'examSchedules', () => tx.examSchedule.deleteMany({ where: year }));

    // ── Examination: dashboard aggregates ──────────────────────────────────
    await del(counts, 'examAlerts', () => tx.examAlert.deleteMany({ where: year }));
    await del(counts, 'marksEntryProgress', () => tx.examMarksEntryProgress.deleteMany({ where: year }));
    await del(counts, 'dashboardStats', () => tx.examDashboardStats.deleteMany({ where: year }));
    await del(counts, 'questionSubjectStats', () => tx.examQuestionSubjectStat.deleteMany({ where: year }));
    await del(counts, 'topPerformers', () => tx.examTopPerformer.deleteMany({ where: year }));
    await del(counts, 'performanceTrends', () => tx.examPerformanceTrend.deleteMany({ where: year }));

    // ── Academic: assessments & co-scholastic ────────────────────────────
    const classTests = await tx.academicClassTest.findMany({
      where: year,
      select: { id: true },
    });
    if (classTests.length) {
      await del(counts, 'classTestScores', () => tx.academicClassTestScore.deleteMany({
        where: { classTestId: { in: classTests.map((t) => t.id) } },
      }));
    }
    await del(counts, 'classTests', () => tx.academicClassTest.deleteMany({ where: year }));

    const coActivities = await tx.academicCoScholasticActivity.findMany({
      where: year,
      select: { id: true },
    });
    if (coActivities.length) {
      await del(counts, 'coScholasticPerformances', () => tx.academicCoScholasticPerformance.deleteMany({
        where: { activityId: { in: coActivities.map((a) => a.id) } },
      }));
      await del(counts, 'coScholasticFeedbacks', () => tx.academicCoScholasticFeedback.deleteMany({
        where: { activityId: { in: coActivities.map((a) => a.id) } },
      }));
    }
    await del(counts, 'coScholasticActivities', () => tx.academicCoScholasticActivity.deleteMany({ where: year }));

    // ── Academic: teacher dev & roster ─────────────────────────────────────
    const devCycles = await tx.academicTeacherDevCycle.findMany({
      where: year,
      select: { id: true },
    });
    if (devCycles.length) {
      await del(counts, 'teacherEvaluations', () => tx.academicTeacherEvaluation.deleteMany({
        where: { devCycleId: { in: devCycles.map((c) => c.id) } },
      }));
    }
    await del(counts, 'teacherDevCycles', () => tx.academicTeacherDevCycle.deleteMany({ where: year }));
    await del(counts, 'teacherRosterTasks', () => tx.academicTeacherRosterTask.deleteMany({ where: year }));
    await del(counts, 'teacherAllocations', () => tx.academicTeacherAllocation.deleteMany({ where: year }));

    // ── Academic: records ──────────────────────────────────────────────────
    await del(counts, 'studentElectives', () => tx.studentSubjectElective.deleteMany({ where: year }));
    await del(counts, 'cceRecords', () => tx.academicCceRecord.deleteMany({ where: year }));
    await del(counts, 'homework', () => tx.academicHomework.deleteMany({ where: year }));
    await del(counts, 'lessonPlans', () => tx.academicLessonPlan.deleteMany({ where: year }));
    await del(counts, 'timetableSlots', () => tx.academicTimetableSlot.deleteMany({ where: year }));
    await del(counts, 'syllabusChapters', () => tx.academicSyllabusChapter.deleteMany({ where: year }));
    await del(counts, 'subjectAllocations', () => tx.academicSubjectAllocation.deleteMany({ where: year }));
    await del(counts, 'calendarEvents', () => tx.academicCalendarEvent.deleteMany({ where: year }));
    await del(counts, 'boardCalendarUploads', () => tx.academicBoardCalendarUpload.deleteMany({ where: year }));
    await del(counts, 'curricula', () => tx.academicCurriculum.deleteMany({ where: year }));
    await del(counts, 'classSections', () => tx.academicClassSection.deleteMany({ where: year }));

    // Subjects are institution-wide (no academicYear) — remove only if no allocations remain
    const remainingAllocations = await tx.academicSubjectAllocation.count({ where: { institutionId } });
    if (remainingAllocations === 0) {
      await del(counts, 'subjects', () => tx.academicSubject.deleteMany({ where: { institutionId } }));
    }

    // ── Attendance ─────────────────────────────────────────────────────────
    await del(counts, 'attendanceSessions', () => tx.attendanceSession.deleteMany({ where: year }));
    await del(counts, 'teacherDailyRecords', () => tx.teacherAttendanceDailyRecord.deleteMany({ where: year }));
    await del(counts, 'staffDailyRecords', () => tx.staffAttendanceDailyRecord.deleteMany({ where: year }));
    await del(counts, 'studentLeaveApps', () => tx.studentLeaveApplication.deleteMany({ where: year }));
    await del(counts, 'teacherLeaveApps', () => tx.teacherLeaveApplication.deleteMany({ where: year }));
    await del(counts, 'staffLeaveApps', () => tx.staffLeaveApplication.deleteMany({ where: year }));
    await del(counts, 'gatePasses', () => tx.studentGatePass.deleteMany({ where: year }));
    await del(counts, 'teacherLeaveGrants', () => tx.teacherLeaveGrant.deleteMany({ where: year }));
    await del(counts, 'staffLeaveGrants', () => tx.staffLeaveGrant.deleteMany({ where: year }));
    await del(counts, 'substituteAssignments', () => tx.teacherSubstituteAssignment.deleteMany({ where: year }));
    await del(counts, 'biometricPunches', () => tx.biometricAttendancePunch.deleteMany({ where: { institutionId } }));
    await del(counts, 'biometricEnrollments', () => tx.biometricEnrollment.deleteMany({ where: year }));
    await del(counts, 'biometricDevices', () => tx.biometricDevice.deleteMany({ where: { institutionId } }));
    await del(counts, 'attendanceGeoFences', () => tx.attendanceGeoFence.deleteMany({ where: { institutionId } }));
    await del(counts, 'teacherProfiles', () => tx.teacherAttendanceProfile.deleteMany({ where: year }));
    await del(counts, 'staffProfiles', () => tx.staffAttendanceProfile.deleteMany({ where: year }));
  }, { timeout: 120_000 });

  const totalDeleted = Object.values(counts).reduce((s, n) => s + n, 0);

  return {
    cleared: totalDeleted > 0,
    academicYear,
    totalDeleted,
    counts,
    message: totalDeleted > 0
      ? `Cleared ${totalDeleted.toLocaleString('en-IN')} demo records for ${academicYear}`
      : `No demo records found for ${academicYear}`,
  };
}
