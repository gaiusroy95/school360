import { api } from './api';

export type AcademicMeta = {
  defaultAcademicYear: string;
  academicYears: string[];
  classes: string[];
  sectionsByClass: Record<string, string[]>;
  terms: string[];
};

export type AcademicDashboard = {
  filters: { academicYear: string; term: string; className?: string; sectionName?: string };
  kpis: {
    classes: number;
    subjects: number;
    teachers: number;
    lessonPlans: number;
    homeworkAssigned: number;
    assessmentsConducted: number;
    students: number;
  };
  lessonPlanCompletion: {
    percent: number;
    completed: number;
    inProgress: number;
    pending: number;
    byDepartment: { name: string; value: number }[];
  };
  homework: {
    assigned: number;
    submitted: number;
    pending: number;
    overdue: number;
    totalSubmissions: number;
    submittedCount: number;
    submissionRate: number;
  };
  cce: { UNIT_TEST: number; ASSIGNMENT: number; PROJECT: number; ACTIVITY: number };
  syllabusProgress: { className: string; percent: number }[];
  subjectPerformance: { name: string; Math: number; Science: number; English: number; Social: number }[];
  studentPerformanceTrend: { name: string; value: number }[];
  overallAvg: number;
  teacherWorkload: { name: string; value: number; color: string; percent: string }[];
  todaySchedule: { period: string; time: string; subject: string; class: string; teacher: string; periodType?: string; room?: string }[];
  keyActivities: { title: string; date: string; type: string }[];
  calendarEvents: { id: string; title: string; eventType: string; eventTypeLabel: string; eventDate: string; sharedToParents: boolean }[];
  coScholastic: { id: string; title: string; activityDate: string; venue: string; status: string }[];
  insights: string[];
};

export type ClassSection = {
  id: string;
  recordId: string;
  academicYear: string;
  className: string;
  sectionName: string;
  classGroup: string;
  capacity: number;
  room: string;
  classTeacher: string;
  classTeacherPhone: string;
  classTeacherEmail: string;
  isActive: boolean;
};

export type AcademicSubject = {
  id: string;
  recordId: string;
  subjectName: string;
  subjectCode: string;
  subjectType: string;
  subjectGroup: string;
  isElective: boolean;
  isActive: boolean;
};

export type LessonPlan = {
  id: string;
  recordId: string;
  academicYear: string;
  term: string;
  className: string;
  sectionName: string;
  classGroup: string;
  subjectName: string;
  department: string;
  title: string;
  teacherName: string;
  objective: string;
  teachingMethod: string;
  propsUsed: string;
  bloomsLevel: string;
  resultMeasurement: string;
  syllabusChapterId: string | null;
  plannedDate: string | null;
  status: string;
  statusLabel: string;
  completionPercent: number;
  sharedAt: string | null;
  notes: string;
  resources: { type: string; title: string; url: string }[];
  hasClassTest?: boolean;
  classTestId?: string | null;
  resultBuckets?: { excellent: number; good: number; average: number; below: number } | null;
};

export type ClassTest = {
  id: string;
  recordId: string;
  lessonPlanId: string;
  academicYear: string;
  term: string;
  className: string;
  sectionName: string;
  classGroup: string;
  subjectName: string;
  teacherName: string;
  title: string;
  maxMarks: number;
  conductedDate: string | null;
  status: string;
  publishedAt: string | null;
  isPublished: boolean;
  resultBuckets: { excellent: number; good: number; average: number; below: number; total: number; avgPercentage: number };
  resultSummary: {
    excellent: { label: string; count: number };
    good: { label: string; count: number };
    average: { label: string; count: number };
    below: { label: string; count: number };
  };
  lessonPlanTitle?: string;
};

export type MobileLessonAnalytics = {
  studentId: string;
  studentName: string;
  classGroup: string;
  academicYear: string;
  academicPerformance: number;
  classTestAvg: number;
  overallBuckets: Record<string, { label: string; count: number }>;
  subjectPerformance: { subjectName: string; avgScore: number; testCount: number; latestBucketLabel: string | null }[];
  recentTests: { title: string; subjectName: string; percentage: number; bucketLabel: string }[];
};

export const BLOOMS_LEVELS = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'] as const;
export const BLOOMS_LABELS: Record<(typeof BLOOMS_LEVELS)[number], string> = {
  REMEMBER: 'Remember',
  UNDERSTAND: 'Understand',
  APPLY: 'Apply',
  ANALYZE: 'Analyze',
  EVALUATE: 'Evaluate',
  CREATE: 'Create',
};

export type TimetableSlot = {
  id: string;
  recordId: string;
  academicYear: string;
  term: string;
  className: string;
  sectionName: string;
  classGroup: string;
  dayOfWeek: number;
  dayLabel: string;
  period: number;
  periodLabel: string;
  periodType: 'THEORY' | 'PRACTICAL' | 'LAB' | 'SPORTS' | 'EVENT';
  periodTypeLabel: string;
  startTime: string;
  endTime: string;
  timeRange: string;
  subjectName: string;
  teacherName: string;
  room: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  versionLabel: string;
  publishedAt: string | null;
  isPublished: boolean;
  notes: string;
};

export type DailySchedule = {
  date: string;
  dayOfWeek: number;
  dayLabel: string;
  audience: string;
  className: string | null;
  sectionName: string | null;
  teacherName: string | null;
  schedule: {
    period: string;
    periodNumber: number;
    time: string;
    subject: string;
    class: string;
    teacher: string;
    periodType: string;
    periodTypeLabel: string;
    room: string;
  }[];
  totalPeriods: number;
  lastUpdated: string;
};

export const PERIOD_TYPES = ['THEORY', 'PRACTICAL', 'LAB', 'SPORTS', 'EVENT'] as const;
export const PERIOD_TYPE_LABELS: Record<(typeof PERIOD_TYPES)[number], string> = {
  THEORY: 'Theory',
  PRACTICAL: 'Practical',
  LAB: 'Lab',
  SPORTS: 'Sports',
  EVENT: 'Event',
};

export type Homework = {
  id: string;
  recordId: string;
  academicYear: string;
  term: string;
  className: string;
  sectionName: string;
  classGroup: string;
  subjectName: string;
  teacherName: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string | null;
  status: string;
  statusLabel: string;
  totalStudents: number;
  submittedCount: number;
  submissionRate: number;
  sharedAt: string | null;
  publishedAt: string | null;
  isPublished: boolean;
};

export type HomeworkDashboardRow = {
  date: string;
  className: string;
  sectionName: string;
  classGroup: string;
  subjectName: string;
  teacherName: string;
  assignmentStatus: 'ASSIGNED' | 'NOT_ASSIGNED';
  assignmentStatusLabel: string;
  homeworkId: string | null;
  homework: Homework | null;
};

export type HomeworkDashboard = {
  date: string;
  academicYear: string | null;
  summary: {
    totalSlots: number;
    assigned: number;
    notAssigned: number;
    assignedPercent: number;
  };
  rows: HomeworkDashboardRow[];
};

function qs(params?: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  if (!params) return '';
  for (const [k, v] of Object.entries(params)) {
    if (v) q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function fetchAcademicMeta() {
  return api<AcademicMeta>('/api/academic/meta');
}

export async function fetchAcademicDashboard(params?: {
  academicYear?: string;
  term?: string;
  className?: string;
  sectionName?: string;
}) {
  return api<AcademicDashboard>(`/api/academic/dashboard${qs(params)}`);
}

export async function seedAcademicData(academicYear?: string) {
  return api<{ seeded: boolean; message: string }>('/api/academic/seed', {
    method: 'POST',
    body: JSON.stringify({ academicYear }),
  });
}

export async function syncAcademicClasses(academicYear?: string) {
  return api<{ created: number }>('/api/academic/sync-classes', {
    method: 'POST',
    body: JSON.stringify({ academicYear }),
  });
}

export async function fetchClassSections(academicYear?: string) {
  return api<{ records: ClassSection[] }>(`/api/academic/class-sections${qs({ academicYear })}`);
}

export async function createClassSection(payload: Partial<ClassSection> & { className: string; sectionName: string }) {
  return api<{ record: ClassSection }>('/api/academic/class-sections', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateClassSection(id: string, payload: Partial<ClassSection>) {
  return api<{ record: ClassSection }>(`/api/academic/class-sections/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteClassSection(id: string) {
  return api<{ ok: boolean }>(`/api/academic/class-sections/${id}`, { method: 'DELETE' });
}

export async function fetchAcademicSubjects() {
  return api<{ records: AcademicSubject[] }>('/api/academic/subjects');
}

export async function createAcademicSubject(payload: {
  subjectName: string;
  subjectCode?: string;
  subjectType?: string;
  subjectGroup?: string;
  isElective?: boolean;
  academicYear?: string;
  teachers?: {
    teacherName: string;
    teacherEmail?: string;
    teacherPhone?: string;
    className: string;
    sectionName: string;
    courseStartDate?: string;
    courseCompletionDeadline?: string;
    revisionDeadline?: string;
  }[];
}) {
  return api<{ record?: AcademicSubject; subject?: AcademicSubject; offeringsCreated?: number }>(
    '/api/academic/subjects',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function deleteAcademicSubject(id: string) {
  return api<{ ok: boolean }>(`/api/academic/subjects/${id}`, { method: 'DELETE' });
}

export async function fetchSyllabus(params?: { academicYear?: string; className?: string }) {
  return api<{ records: Record<string, unknown>[] }>(`/api/academic/syllabus${qs(params)}`);
}

export async function createSyllabusChapter(payload: Record<string, unknown>) {
  return api<{ record: Record<string, unknown> }>('/api/academic/syllabus', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateSyllabusChapter(id: string, payload: Record<string, unknown>) {
  return api<{ record: Record<string, unknown> }>(`/api/academic/syllabus/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function fetchTimetable(params?: {
  academicYear?: string;
  term?: string;
  className?: string;
  sectionName?: string;
  teacherName?: string;
  dayOfWeek?: string;
  effectiveDate?: string;
  periodType?: string;
}) {
  return api<{ records: TimetableSlot[] }>(`/api/academic/timetable${qs(params)}`);
}

export async function createTimetableSlot(payload: Record<string, unknown>) {
  return api<{ record: TimetableSlot }>('/api/academic/timetable', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateTimetableSlot(id: string, payload: Record<string, unknown>) {
  return api<{ record: TimetableSlot }>(`/api/academic/timetable/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteTimetableSlot(id: string) {
  return api<{ ok: boolean }>(`/api/academic/timetable/${id}`, { method: 'DELETE' });
}

export async function bulkUploadTimetable(payload: {
  academicYear: string;
  term?: string;
  className?: string;
  sectionName?: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  versionLabel?: string;
  replaceExisting?: boolean;
  slots: Record<string, unknown>[];
}) {
  return api<{ created: number; updated: number; errors: string[]; total: number }>('/api/academic/timetable/bulk', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function publishTimetable(payload: {
  academicYear: string;
  className?: string;
  sectionName?: string;
  term?: string;
}) {
  return api<{ published: number; publishedAt: string }>('/api/academic/timetable/publish', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchDailySchedule(params: {
  date?: string;
  audience: 'teacher' | 'parent' | 'principal';
  academicYear?: string;
  teacherName?: string;
  studentId?: string;
  className?: string;
  sectionName?: string;
}) {
  return api<DailySchedule>(`/api/academic/timetable/schedule/daily${qs(params)}`);
}

export async function fetchLessonPlans(academicYear?: string, params?: { className?: string; sectionName?: string }) {
  return api<{ records: LessonPlan[] }>(`/api/academic/lesson-plans${qs({ academicYear, ...params })}`);
}

export async function fetchLessonPlanDetail(id: string) {
  return api<{ record: LessonPlan & { scores?: { studentId: string; studentName: string; marksObtained: number; percentage: number; bucketLabel: string }[] } }>(`/api/academic/lesson-plans/${id}`);
}

export async function createLessonPlan(payload: Record<string, unknown>) {
  return api<{ record: LessonPlan }>('/api/academic/lesson-plans', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateLessonPlan(id: string, payload: Record<string, unknown>) {
  return api<{ record: LessonPlan }>(`/api/academic/lesson-plans/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function createClassTestForLessonPlan(lessonPlanId: string, payload?: { title?: string; maxMarks?: number }) {
  return api<{ record: ClassTest }>(`/api/academic/lesson-plans/${lessonPlanId}/class-test`, { method: 'POST', body: JSON.stringify(payload || {}) });
}

export async function fetchClassTests(params?: { academicYear?: string; className?: string; sectionName?: string; status?: string }) {
  return api<{ records: ClassTest[] }>(`/api/academic/class-tests${qs(params)}`);
}

export async function fetchClassTestDetail(id: string) {
  return api<{ record: ClassTest; scores: { studentId: string; studentName: string; marksObtained: number; maxMarks: number; percentage: number; bucket: string; bucketLabel: string }[] }>(`/api/academic/class-tests/${id}`);
}

export async function submitClassTestScores(classTestId: string, scores: { studentId: string; marksObtained: number }[]) {
  return api<{ upserted: number; buckets: { excellent: number; good: number; average: number; below: number; total: number; avgPercentage: number }; publishedAt: string }>(
    `/api/academic/class-tests/${classTestId}/scores`,
    { method: 'POST', body: JSON.stringify({ scores }) },
  );
}

export async function fetchMobileLessonAnalytics(studentId: string, academicYear?: string) {
  return api<MobileLessonAnalytics>(`/api/academic/analytics/mobile/lesson-performance${qs({ studentId, academicYear })}`);
}

export async function fetchHomeworkDashboard(params?: {
  date?: string;
  academicYear?: string;
  className?: string;
  sectionName?: string;
  teacherName?: string;
}) {
  return api<HomeworkDashboard>(`/api/academic/homework/dashboard${qs(params)}`);
}

export async function fetchHomeworkDetail(id: string) {
  return api<{ record: Homework }>(`/api/academic/homework/${id}`);
}

export async function fetchHomework(academicYear?: string, params?: { className?: string; sectionName?: string; date?: string }) {
  return api<{ records: Homework[] }>(`/api/academic/homework${qs({ academicYear, ...params })}`);
}

export async function fetchMobileHomework(studentId: string, params?: { date?: string; academicYear?: string }) {
  return api<{ homework: Homework[]; total: number; classGroup: string; date: string }>(`/api/academic/homework/mobile${qs({ studentId, ...params })}`);
}

export async function createHomework(payload: Record<string, unknown>) {
  return api<{ record: Homework }>('/api/academic/homework', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateHomework(id: string, payload: Record<string, unknown>) {
  return api<{ record: Homework }>(`/api/academic/homework/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export type CalendarEvent = {
  id: string;
  recordId: string;
  academicYear: string;
  term: string;
  boardName: string;
  title: string;
  eventType: string;
  eventTypeLabel: string;
  eventDate: string;
  endDate: string | null;
  description: string;
  eventSource: string;
  uploadId: string | null;
  sharedToParents: boolean;
  publishedAt: string | null;
  isPublished: boolean;
};

export type CalendarUpload = {
  id: string;
  recordId: string;
  boardName: string;
  academicYear: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  status: string;
  eventCount: number;
  publishedAt: string | null;
  isPublished: boolean;
  errorMessage: string;
  previewEvents: OcrCalendarEventPreview[];
  createdAt: string;
};

export type OcrCalendarEventPreview = {
  title: string;
  eventDate: string;
  endDate?: string | null;
  eventType: string;
  description?: string;
};

export const BOARD_OPTIONS = ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge', 'NIOS', 'Other'] as const;

export async function fetchAcademicCalendar(params?: { academicYear?: string; boardName?: string }) {
  return api<{ records: CalendarEvent[] }>(`/api/academic/calendar${qs(params)}`);
}

export async function fetchCalendarUploads(academicYear?: string) {
  return api<{ uploads: CalendarUpload[] }>(`/api/academic/calendar/uploads${qs({ academicYear })}`);
}

export async function uploadBoardCalendarOcr(payload: {
  boardName: string;
  academicYear: string;
  fileName: string;
  fileData: string;
  mimeType?: string;
}) {
  return api<{ upload: CalendarUpload; previewEvents: OcrCalendarEventPreview[] }>(
    '/api/academic/calendar/upload-ocr',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function confirmCalendarUpload(uploadId: string, payload?: {
  replaceExisting?: boolean;
  events?: OcrCalendarEventPreview[];
}) {
  return api<{ created: number; uploadId: string }>(
    `/api/academic/calendar/uploads/${uploadId}/confirm`,
    { method: 'POST', body: JSON.stringify(payload || {}) },
  );
}

export async function publishAcademicCalendar(payload: { academicYear: string; boardName?: string }) {
  return api<{ publishedEvents: number; publishedUploads: number; publishedAt: string }>(
    '/api/academic/calendar/publish',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function fetchMobileAcademicCalendar(params?: {
  academicYear?: string;
  boardName?: string;
  month?: string;
  audience?: string;
}) {
  return api<{ events: CalendarEvent[]; boards: string[]; totalEvents: number }>(
    `/api/academic/calendar/mobile${qs(params)}`,
  );
}

export async function createAcademicCalendarEvent(payload: Record<string, unknown>) {
  return api<{ record: CalendarEvent }>('/api/academic/calendar', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateAcademicCalendarEvent(id: string, payload: Record<string, unknown>) {
  return api<{ record: CalendarEvent }>(`/api/academic/calendar/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteAcademicCalendarEvent(id: string) {
  return api<{ ok: boolean }>(`/api/academic/calendar/${id}`, { method: 'DELETE' });
}

export async function fetchCceRecords(academicYear?: string) {
  return api<{ records: Record<string, unknown>[] }>(`/api/academic/cce${qs({ academicYear })}`);
}

export async function createCceRecord(payload: Record<string, unknown>) {
  return api<{ record: Record<string, unknown> }>('/api/academic/cce', { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchCoScholastic(academicYear?: string) {
  return api<{ records: CoScholasticActivity[] }>(`/api/academic/co-scholastic${qs({ academicYear })}`);
}

export type CoScholasticCategory = {
  id: string;
  label: string;
  subCategories: { id: string; label: string; activities: string[] }[];
};

export type CoScholasticActivity = {
  id: string;
  recordId: string;
  academicYear: string;
  term: string;
  title: string;
  category: string;
  categoryLabel: string;
  subCategory: string;
  subCategoryLabel: string;
  activityType: string;
  className: string;
  sectionName: string;
  classGroup: string;
  teacherName: string;
  coTeacherName: string;
  activityDate: string;
  startDate: string | null;
  endDate: string | null;
  venue: string;
  description: string;
  measurementCriteria: string;
  maxScore: number;
  status: string;
  statusLabel: string;
  publishedAt: string | null;
  isPublished: boolean;
  performanceCount: number;
  feedbackCount: number;
  avgPerformanceScore: number;
  avgParentRating: number;
};

export type CoScholasticPerformance = {
  id: string;
  studentId: string;
  studentName: string;
  classGroup: string;
  performanceScore: number;
  performanceGrade: string;
  performanceBand: string;
  performanceBandLabel: string;
  performanceBandColor: string;
  remarks: string;
  recordedBy: string;
  recordedAt: string | null;
};

export type CoScholasticDashboard = {
  academicYear: string;
  categories: CoScholasticCategory[];
  byCategory: (CoScholasticCategory & { count: number; activities: CoScholasticActivity[] })[];
  activities: CoScholasticActivity[];
  kpis: {
    totalActivities: number;
    planned: number;
    inProgress: number;
    completed: number;
    published: number;
    performancesRecorded: number;
  };
};

export async function fetchCoScholasticDashboard(params?: { academicYear?: string; category?: string; status?: string }) {
  return api<CoScholasticDashboard>(`/api/academic/co-scholastic/dashboard${qs(params)}`);
}

export async function fetchCoScholasticCategories() {
  return api<{ categories: CoScholasticCategory[] }>('/api/academic/co-scholastic/categories');
}

export async function fetchCoScholasticDetail(id: string) {
  return api<{ activity: CoScholasticActivity; performances: CoScholasticPerformance[]; feedbacks: Record<string, unknown>[] }>(
    `/api/academic/co-scholastic/${id}`,
  );
}

export async function createCoScholastic(payload: Record<string, unknown>) {
  return api<{ record: CoScholasticActivity }>('/api/academic/co-scholastic', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateCoScholastic(id: string, payload: Record<string, unknown>) {
  return api<{ record: CoScholasticActivity }>(`/api/academic/co-scholastic/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function recordCoScholasticPerformances(activityId: string, payload: {
  recordedBy: string;
  performances: { studentId: string; studentName?: string; className?: string; sectionName?: string; performanceScore: number; remarks?: string }[];
}) {
  return api<{ upserted: number }>(`/api/academic/co-scholastic/${activityId}/performances`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function publishCoScholasticActivities(payload: { academicYear: string; activityIds?: string[] }) {
  return api<{ published: number; publishedAt: string }>('/api/academic/co-scholastic/publish', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchTeacherAllocations(academicYear?: string) {
  return api<{ records: Record<string, unknown>[] }>(`/api/academic/teacher-allocations${qs({ academicYear })}`);
}

export async function createTeacherAllocation(payload: Record<string, unknown>) {
  return api<{ record: Record<string, unknown> }>('/api/academic/teacher-allocations', { method: 'POST', body: JSON.stringify(payload) });
}

// ─── Teacher Roster Planner ───────────────────────────────────────────────────

export type TeacherRosterTask = {
  id: string;
  recordId: string;
  academicYear: string;
  term: string;
  teacherName: string;
  department: string;
  taskType: string;
  taskTypeLabel: string;
  taskTypeColor: string;
  title: string;
  description: string;
  className: string;
  sectionName: string;
  classGroup: string;
  subjectName: string;
  startDate: string | null;
  dueDate: string | null;
  endDate: string | null;
  priority: string;
  priorityLabel: string;
  status: string;
  statusLabel: string;
  feedbackRequired: boolean;
  feedbackRecorded: boolean;
  feedbackNotes: string;
  parentFeedbackRating: number;
  assignedBy: string;
  completedAt: string | null;
  publishedAt: string | null;
  isPublished: boolean;
  isOverdue: boolean;
};

export type TeacherRosterDashboard = {
  academicYear: string;
  taskTypes: { id: string; label: string; description: string }[];
  tasks: TeacherRosterTask[];
  allocations: Record<string, unknown>[];
  teacherRosters: {
    teacherName: string;
    department: string;
    tasks: TeacherRosterTask[];
    classSubjects: Record<string, unknown>[];
    totalTasks: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  }[];
  byType: { id: string; label: string; description: string; count: number }[];
  kpis: {
    totalTeachers: number;
    totalTasks: number;
    classSubjectAllocations: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    published: number;
    parentEngagements: number;
  };
};

export async function fetchTeacherRosterDashboard(params?: {
  academicYear?: string;
  teacherName?: string;
  taskType?: string;
  status?: string;
}) {
  return api<TeacherRosterDashboard>(`/api/academic/teacher-roster/dashboard${qs(params)}`);
}

export async function createTeacherRosterTask(payload: Record<string, unknown>) {
  return api<{ task: TeacherRosterTask }>('/api/academic/teacher-roster/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTeacherRosterTask(id: string, payload: Record<string, unknown>) {
  return api<{ task: TeacherRosterTask }>(`/api/academic/teacher-roster/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function syncTeacherRosterAllocations(academicYear: string) {
  return api<{ created: number; total: number }>('/api/academic/teacher-roster/sync-allocations', {
    method: 'POST',
    body: JSON.stringify({ academicYear }),
  });
}

export async function publishTeacherRosterTasks(payload: { academicYear: string; taskIds?: string[] }) {
  return api<{ published: number; publishedAt: string }>('/api/academic/teacher-roster/publish', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchSubjectAllocations(academicYear?: string) {
  return api<{ records: Record<string, unknown>[] }>(`/api/academic/subject-allocations${qs({ academicYear })}`);
}

export async function createSubjectAllocation(payload: Record<string, unknown>) {
  return api<{ record: SubjectOffering }>('/api/academic/subject-allocations', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateSubjectOffering(id: string, payload: Record<string, unknown>) {
  return api<{ record: SubjectOffering }>(`/api/academic/subject-allocations/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function fetchSubjectManagementDashboard(academicYear?: string) {
  return api<SubjectManagementDashboard>(`/api/academic/subjects/management${qs({ academicYear })}`);
}

export async function bulkSetSyllabusRevisionDeadlines(chapterIds: string[], revisionDeadline: string) {
  return api<{ updated: number }>('/api/academic/syllabus/bulk-revision-deadlines', {
    method: 'POST',
    body: JSON.stringify({ chapterIds, revisionDeadline }),
  });
}

// ─── Academic Reports ─────────────────────────────────────────────────────────

export type AcademicReportType =
  | 'overview'
  | 'class-sections'
  | 'curriculum-syllabus'
  | 'timetable'
  | 'lesson-planning'
  | 'homework'
  | 'academic-calendar'
  | 'teacher-evaluation'
  | 'subject-management'
  | 'co-scholastic'
  | 'teacher-roster'
  | 'cce';

export type AcademicReportCatalogItem = {
  id: AcademicReportType;
  tab: string;
  title: string;
  description: string;
};

export type AcademicReportPayload = {
  reportType: AcademicReportType;
  reportTitle: string;
  tab: string;
  academicYear: string;
  term: string;
  generatedAt: string;
  summary: Record<string, unknown>;
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
};

export type AcademicReportsPack = {
  academicYear: string;
  term: string;
  generatedAt: string;
  reportCount: number;
  reports: AcademicReportPayload[];
};

export async function fetchAcademicReportsMeta() {
  return api<{ reports: AcademicReportCatalogItem[] }>('/api/academic/reports/meta');
}

export async function fetchAcademicReport(
  type: AcademicReportType,
  params?: { academicYear?: string; term?: string; className?: string; sectionName?: string },
) {
  return api<AcademicReportPayload>(`/api/academic/reports/${type}${qs(params)}`);
}

export async function fetchAllAcademicReports(params?: { academicYear?: string; term?: string }) {
  return api<AcademicReportsPack>(`/api/academic/reports/all${qs(params)}`);
}

export async function fetchAcademicReportSummary(academicYear?: string, term?: string) {
  return api<Record<string, unknown>>(`/api/academic/reports/summary${qs({ academicYear, term })}`);
}

// ─── Curriculum Hub ───────────────────────────────────────────────────────────

export type CurriculumFramework = {
  id: string;
  recordId: string;
  academicYear: string;
  boardName: string;
  boardCode: string;
  standardAlignment: string;
  termSystem: string;
  terms: string[];
  gradingSystem: string;
  maxMarks: number;
  passMarks: number;
  weightageEnabled: boolean;
  assessmentWeightage: Record<string, number>;
  complianceNotes: string;
  isActive: boolean;
};

export type SyllabusChapter = {
  id: string;
  recordId: string;
  academicYear: string;
  term: string;
  className: string;
  sectionName: string;
  classGroup: string;
  subjectName: string;
  chapterTitle: string;
  unitNumber: number;
  boardTopicCode: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  revisionDeadline?: string | null;
  completionPercent: number;
  scheduleStatus: 'on_track' | 'behind' | 'ahead' | 'no_plan';
  daysBehind: number;
};

export type SubjectOffering = {
  id: string;
  recordId: string;
  subjectId: string;
  subjectName: string;
  academicYear: string;
  className: string;
  sectionName: string;
  classGroup: string;
  teacherName: string;
  teacherEmail: string;
  teacherPhone: string;
  courseStartDate: string | null;
  courseCompletionDeadline: string | null;
  revisionDeadline: string | null;
  currentProgress: number;
  idealProgress: number;
  progressGap: number;
  progressStatus: 'ahead' | 'on_track' | 'behind' | 'not_started';
  chapterCount: number;
  syllabusChapters: SyllabusChapter[];
  upcomingRevisions: SyllabusChapter[];
};

export type SubjectManagementDashboard = {
  academicYear: string;
  subjects: (AcademicSubject & {
    teachers: string[];
    offerings: SubjectOffering[];
    avgCurrentProgress: number;
    avgIdealProgress: number;
  })[];
  offerings: SubjectOffering[];
  teachersMultiSubject: { teacherName: string; subjects: string[]; subjectCount: number }[];
  kpis: {
    totalSubjects: number;
    totalOfferings: number;
    teachersAssigned: number;
    multiSubjectTeachers: number;
    behindSchedule: number;
    onTrack: number;
  };
};

export type CurriculumAnalytics = {
  chapters: SyllabusChapter[];
  subjectProgress: {
    className: string;
    sectionName: string;
    subjectName: string;
    classGroup: string;
    plannedPercent: number;
    actualPercent: number;
    gap: number;
    chapterCount: number;
  }[];
  bottlenecks: {
    severity: 'high' | 'medium' | 'low';
    message: string;
    className: string;
    sectionName: string;
    subjectName: string;
    completionPercent: number;
    daysBehind: number;
  }[];
  performanceByClass: { className: string; avgScore: number }[];
  summary: { totalChapters: number; onTrack: number; behind: number; noPlan: number; avgCompletion: number };
};

export async function fetchCurriculumFramework(academicYear?: string) {
  return api<{ curriculum: CurriculumFramework; institutionFramework: Record<string, string> }>(
    `/api/academic/curriculum/framework${qs({ academicYear })}`,
  );
}

export async function saveCurriculumFramework(payload: Record<string, unknown>) {
  return api<{ curriculum: CurriculumFramework }>('/api/academic/curriculum/framework', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchCurriculumAnalytics(params?: {
  academicYear?: string;
  term?: string;
  className?: string;
  sectionName?: string;
}) {
  return api<CurriculumAnalytics>(`/api/academic/curriculum/analytics${qs(params)}`);
}

export async function fetchCurriculumTeacherWorkload(academicYear?: string) {
  return api<{ teachers: { teacherName: string; periodsPerWeek: number; subjectCount: number; classCount: number; workloadLevel: string; isOverloaded: boolean }[] }>(
    `/api/academic/curriculum/teacher-workload${qs({ academicYear })}`,
  );
}

export async function fetchTimetableConflicts(academicYear?: string) {
  return api<{ conflicts: { type: string; message: string; dayOfWeek: number; period: number; details: string }[]; slotCount: number }>(
    `/api/academic/timetable/conflicts${qs({ academicYear })}`,
  );
}

export async function fetchElectives(params?: { academicYear?: string; className?: string; sectionName?: string }) {
  return api<{ records: Record<string, unknown>[] }>(`/api/academic/electives${qs(params)}`);
}

export async function bulkAssignElectives(payload: {
  academicYear: string;
  subjectId: string;
  className: string;
  sectionName?: string;
  studentIds: string[];
}) {
  return api<{ created: number; skipped: number }>('/api/academic/electives/bulk', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── Teacher Continuous Evaluation ────────────────────────────────────────────

export type TeacherDevCycle = {
  id: string;
  recordId: string;
  academicYear: string;
  cycleNumber: number;
  title: string;
  startDate: string;
  endDate: string;
  evaluationDueDate: string;
  description: string;
  publishedAt: string | null;
  isPublished: boolean;
};

export type TeacherEvaluation = {
  id: string;
  recordId: string;
  academicYear: string;
  devCycleId: string;
  cycleNumber: number | null;
  cycleTitle: string;
  teacherName: string;
  department: string;
  className: string;
  sectionName: string;
  subjectName: string;
  classGroup: string;
  taskActionScore: number;
  taskActionNotes: string;
  taskActionEvidence: string;
  improvementPlanScore: number;
  improvementPlanNotes: string;
  improvementPlanDetails: string;
  parentEngagementScore: number;
  parentEngagementNotes: string;
  parentEngagementCount: number;
  parentFeedbackScore: number;
  parentFeedbackNotes: string;
  parentFeedbackCount: number;
  studentFeedbackScore: number;
  studentFeedbackNotes: string;
  studentFeedbackCount: number;
  overallScore: number;
  performanceBand: string;
  performanceBandLabel: string;
  performanceBandColor: string;
  status: string;
  statusLabel: string;
  evaluatedBy: string;
  evaluatedAt: string | null;
  publishedAt: string | null;
  isPublished: boolean;
  dimensions: { key: string; label: string; weight: number; score: number }[];
};

export type TeacherEvaluationDashboard = {
  academicYear: string;
  cycles: TeacherDevCycle[];
  activeCycleId: string;
  kpis: {
    totalTeachers: number;
    evaluationsRecorded: number;
    completed: number;
    published: number;
    averageScore: number;
    pending: number;
  };
  bandDistribution: { band: string; label: string; count: number }[];
  evaluations: TeacherEvaluation[];
};

export async function fetchTeacherEvaluationDashboard(params?: { academicYear?: string; devCycleId?: string }) {
  return api<TeacherEvaluationDashboard>(`/api/academic/teacher-evaluation/dashboard${qs(params)}`);
}

export async function fetchTeacherDevCycles(academicYear?: string) {
  return api<{ cycles: TeacherDevCycle[] }>(`/api/academic/teacher-evaluation/cycles${qs({ academicYear })}`);
}

export async function upsertTeacherDevCycle(payload: Record<string, unknown>) {
  return api<{ cycle: TeacherDevCycle }>('/api/academic/teacher-evaluation/cycles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function publishTeacherDevCyclesToCalendar(academicYear: string) {
  return api<{ published: number; publishedAt: string }>('/api/academic/teacher-evaluation/cycles/publish-calendar', {
    method: 'POST',
    body: JSON.stringify({ academicYear }),
  });
}

export async function bulkGenerateTeacherEvaluations(devCycleId: string) {
  return api<{ created: number; total: number }>('/api/academic/teacher-evaluation/bulk-generate', {
    method: 'POST',
    body: JSON.stringify({ devCycleId }),
  });
}

export async function createTeacherEvaluation(payload: Record<string, unknown>) {
  return api<{ record: TeacherEvaluation }>('/api/academic/teacher-evaluation', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTeacherEvaluation(id: string, payload: Record<string, unknown>) {
  return api<{ record: TeacherEvaluation }>(`/api/academic/teacher-evaluation/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function syncTeacherEvaluationFeedback(id: string) {
  return api<{ record: TeacherEvaluation }>(`/api/academic/teacher-evaluation/${id}/sync-feedback`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function publishTeacherEvaluations(payload: { academicYear: string; devCycleId?: string }) {
  return api<{ published: number; publishedAt: string }>('/api/academic/teacher-evaluation/publish', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
