import { api } from './api';

function qs(params?: Record<string, string | undefined>) {
  if (!params) return '';
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export type ExamDashboard = {
  academicYear: string;
  examType: string;
  examTypeLabel: string;
  generatedAt: string;
  kpis: {
    upcomingExams: number;
    nextExamName: string;
    nextExamDate: string;
    studentsRegistered: number;
    examsConducted: number;
    papersCreated: number;
    resultsDeclared: number;
    averagePassPercent: number;
  };
  examSchedule: {
    id: string;
    name: string;
    classRange: string;
    startDate: string;
    endDate: string;
    subjectCount: number;
    studentCount: number;
    examType: string;
    examTypeLabel: string;
  }[];
  workflow: {
    steps: { label: string; desc: string; percent: number; color: string }[];
    currentStatus: { label: string; percent: number }[];
  } | null;
  questionBank: {
    total: number;
    subjective: number;
    objective: number;
    withSolution: number;
    subjectDistribution: { name: string; value: number; count: string; color: string }[];
  };
  todayExam: {
    title: string;
    classGroup: string;
    date: string;
    startTime: string;
    endTime: string;
    subject: string;
    totalStudents: number;
    present: number;
    absent: number;
  } | null;
  alerts: { id: string; type: string; title: string; description: string; date: string }[];
  resultSummary: {
    appeared: number;
    pass: number;
    fail: number;
    passPercent: number;
    failPercent: number;
    highest: number;
    average: number;
  } | null;
  topPerformers: { rank: number; name: string; classGroup: string; percent: string }[];
  performanceTrend: { term: string; average: number; pass: number }[];
  marksEntryStatus: { className: string; total: number; entered: number; pending: number; progress: number }[];
  examAnalytics: {
    passPercent: number;
    passDelta: number;
    average: number;
    averageDelta: number;
    improvement: number;
  } | null;
  revaluation: {
    received: number;
    underReview: number;
    approved: number;
    rejected: number;
  } | null;
  reportCards: {
    generated: number;
    published: number;
    shared: number;
    pending: number;
  } | null;
};

export type ExamDashboardMeta = {
  defaultAcademicYear: string;
  academicYears: string[];
  examTypes: { id: string; label: string }[];
  classes: string[];
};

export async function fetchExamDashboardMeta() {
  return api<ExamDashboardMeta>('/api/examination/dashboard/meta');
}

export async function fetchExamDashboard(params?: { academicYear?: string; examType?: string }) {
  return api<ExamDashboard>(`/api/examination/dashboard${qs(params)}`);
}

export async function seedExamDashboardDemo(academicYear?: string) {
  return api<{ seeded: boolean; schedules: number; studentsRegistered?: number }>(
    '/api/examination/dashboard/seed',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

export type ExamScheduleMeta = {
  defaultAcademicYear: string;
  academicYears: string[];
  examTypes: { id: string; label: string }[];
  eventTypes: { id: string; label: string }[];
  classes: string[];
  sectionsByClass: Record<string, string[]>;
};

export type ExamCalendarEvent = {
  id: string;
  eventType: 'EXAM' | 'CLASS_TEST';
  eventTypeLabel: string;
  examType: string | null;
  examTypeLabel: string | null;
  seriesName: string;
  className: string;
  sectionName: string;
  subjectName: string;
  date: string;
  dateDisplay: string;
  startTime: string;
  endTime: string;
  status: string;
  source: 'calendar' | 'class_test';
};

export type ExamScheduleCalendar = {
  academicYear: string;
  year: number;
  month: number;
  monthLabel: string;
  calendar: {
    date: string;
    day: number;
    isToday: boolean;
    isCurrentMonth: boolean;
    events: ExamCalendarEvent[];
  }[];
  events: ExamCalendarEvent[];
  summary: {
    totalEvents: number;
    examCount: number;
    classTestCount: number;
    examSeries: {
      id: string;
      name: string;
      examType: string;
      examTypeLabel: string;
      classRange: string;
      startDate: string;
      endDate: string;
    }[];
  };
};

export async function fetchExamScheduleMeta() {
  return api<ExamScheduleMeta>('/api/examination/schedule/meta');
}

export async function fetchExamScheduleCalendar(params?: {
  academicYear?: string;
  year?: number;
  month?: number;
  className?: string;
  sectionName?: string;
  examType?: string;
  eventType?: string;
  includeClassTests?: boolean;
}) {
  const q: Record<string, string | undefined> = {};
  if (params?.academicYear) q.academicYear = params.academicYear;
  if (params?.year !== undefined) q.year = String(params.year);
  if (params?.month !== undefined) q.month = String(params.month);
  if (params?.className) q.className = params.className;
  if (params?.sectionName) q.sectionName = params.sectionName;
  if (params?.examType) q.examType = params.examType;
  if (params?.eventType) q.eventType = params.eventType;
  if (params?.includeClassTests === false) q.includeClassTests = 'false';
  return api<ExamScheduleCalendar>(`/api/examination/schedule/calendar${qs(q)}`);
}

export async function seedExamScheduleCalendar(academicYear?: string) {
  return api<{ seeded: boolean; sessions: number }>(
    '/api/examination/schedule/seed',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

export type ExamSyllabusCategory = 'CLASS_TEST_SERIES' | 'UNIT_TEST' | 'MID_TERM' | 'ANNUAL_EXAM';

export type ExamSyllabusTopic = {
  unitNumber: number;
  chapterTitle: string;
  topics: string[];
};

export type ExamSubjectSyllabusRecord = {
  id: string;
  recordId: string;
  academicYear: string;
  category: ExamSyllabusCategory;
  categoryLabel: string;
  className: string;
  sectionName: string;
  classGroup: string;
  subjectName: string;
  title: string;
  unitsCovered: string;
  topics: ExamSyllabusTopic[];
  topicCount: number;
  maxMarks: number;
  weightagePercent: number;
  durationMinutes: number;
  plannedMonth: string;
  status: string;
  notes: string;
};

export type ExamSyllabusOverview = {
  academicYear: string;
  summary: {
    totalRecords: number;
    classCount: number;
    subjectCount: number;
    byCategory: Record<ExamSyllabusCategory, { count: number; label: string }>;
  };
  classes: {
    className: string;
    subjects: {
      subjectName: string;
      sectionName: string;
      classGroup: string;
      totalTopics: number;
      syllabi: Record<ExamSyllabusCategory, ExamSubjectSyllabusRecord | null>;
    }[];
  }[];
  records: ExamSubjectSyllabusRecord[];
};

export type ExamSyllabusMeta = {
  defaultAcademicYear: string;
  academicYears: string[];
  classes: string[];
  sectionsByClass: Record<string, string[]>;
  subjects: string[];
  categories: { id: ExamSyllabusCategory; label: string }[];
};

export async function fetchExamSyllabusMeta() {
  return api<ExamSyllabusMeta>('/api/examination/syllabus/meta');
}

export async function fetchExamSyllabusOverview(params?: {
  academicYear?: string;
  className?: string;
  sectionName?: string;
  subjectName?: string;
  category?: string;
}) {
  return api<ExamSyllabusOverview>(`/api/examination/syllabus${qs(params)}`);
}

export async function seedExamSyllabus(academicYear?: string) {
  return api<{ seeded: boolean; records: number }>(
    '/api/examination/syllabus/seed',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

export type QuestionType = 'Multiple Choice' | 'True/False' | 'Short Answer';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type ExamPaperPurpose = 'CLASS_TEST' | 'UNIT_TEST' | 'MID_TERM' | 'ANNUAL_EXAM' | 'ENTRANCE_TEST' | 'PRACTICE';
export type ExamPaperSource = 'AI_PDF' | 'OCR' | 'MANUAL' | 'SYLLABUS';

export type QuestionInput = {
  type: string;
  difficulty: string;
  questionText: string;
  options?: string[];
  correctAnswer?: string;
  marks?: number;
};

export type QuestionPaperSummary = {
  id: string;
  recordId: string;
  academicYear: string;
  className: string;
  sectionName: string;
  classGroup: string;
  subjectName: string;
  title: string;
  purpose: ExamPaperPurpose;
  purposeLabel: string;
  source: ExamPaperSource;
  sourceLabel: string;
  status: string;
  statusLabel: string;
  durationMinutes: number;
  numQuestions: number;
  questionType: string;
  difficulty: string;
  passMarksPercent: number;
  isDigitalExam: boolean;
  questionCount: number;
  attemptCount: number;
  createdBy: string;
  createdAt: string;
};

export type QuestionPaper = QuestionPaperSummary & {
  questions?: (QuestionInput & { id?: string; sortOrder?: number })[];
};

export type QuestionBankMeta = {
  defaultAcademicYear: string;
  academicYears: string[];
  classes: string[];
  sectionsByClass: Record<string, string[]>;
  subjects: string[];
  questionTypes: QuestionType[];
  difficulties: Difficulty[];
  purposes: { id: ExamPaperPurpose; label: string }[];
  sources: { id: ExamPaperSource; label: string }[];
};

export type PdfFileUpload = { fileName: string; mimeType: string; fileData: string };

export async function fetchQuestionBankMeta() {
  return api<QuestionBankMeta>('/api/examination/question-bank/meta');
}

export async function fetchQuestionPapers(params?: {
  academicYear?: string;
  className?: string;
  sectionName?: string;
  subjectName?: string;
  purpose?: string;
}) {
  return api<{
    academicYear: string;
    summary: {
      totalPapers: number;
      totalQuestions: number;
      published: number;
      digitalExams: number;
    };
    papers: QuestionPaperSummary[];
  }>(`/api/examination/question-bank/papers${qs(params)}`);
}

export async function fetchQuestionPaper(id: string) {
  return api<{ paper: QuestionPaper }>(`/api/examination/question-bank/papers/${id}`);
}

export async function seedQuestionBank(academicYear?: string) {
  return api<{ seeded: boolean; papers: number }>(
    '/api/examination/question-bank/seed',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

export async function generateQuestionPaperFromPdf(payload: {
  title?: string;
  files: PdfFileUpload[];
  numQuestions: number;
  questionType: QuestionType;
  difficulty: Difficulty;
}) {
  return api<{ suggestedTitle: string; fileMeta: unknown[]; questions: QuestionInput[] }>(
    '/api/examination/question-bank/generate-from-pdf',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function scanQuestionPaperOcr(payload: {
  title?: string;
  files: PdfFileUpload[];
  questionType?: QuestionType;
  difficulty?: Difficulty;
}) {
  return api<{
    suggestedTitle: string;
    rawOcrText: string;
    previewFiles: { fileName: string; mimeType: string; dataUrl: string }[];
    fileMeta: unknown[];
    questions: QuestionInput[];
  }>('/api/examination/question-bank/scan-ocr', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function generateQuestionPaperFromSyllabus(payload: {
  academicYear: string;
  className: string;
  sectionName?: string;
  subjectName: string;
  purpose: ExamPaperPurpose;
  numQuestions: number;
  questionType: QuestionType;
  difficulty: Difficulty;
  title?: string;
}) {
  return api<{ suggestedTitle: string; sourceText: string; questions: QuestionInput[] }>(
    '/api/examination/question-bank/generate-from-syllabus',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function createQuestionPaper(payload: {
  academicYear: string;
  className: string;
  sectionName?: string;
  subjectName: string;
  title: string;
  purpose: ExamPaperPurpose;
  source?: ExamPaperSource;
  durationMinutes?: number;
  questionType?: QuestionType;
  difficulty?: Difficulty;
  passMarksPercent?: number;
  isDigitalExam?: boolean;
  sourceFilesMeta?: unknown[];
  status?: 'DRAFT' | 'PUBLISHED';
  questions: QuestionInput[];
}) {
  return api<{ paper: QuestionPaper }>('/api/examination/question-bank/papers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteQuestionPaper(id: string) {
  return api<{ deleted: boolean }>(`/api/examination/question-bank/papers/${id}`, { method: 'DELETE' });
}

export async function startDigitalExam(paperId: string, payload: { candidateName: string; candidateRef?: string }) {
  return api<{
    attemptId: string;
    paper: QuestionPaperSummary;
    questions: { id: string; sortOrder: number; type: string; questionText: string; options: string[] }[];
    durationMinutes: number;
    passMarksPercent: number;
  }>(`/api/examination/question-bank/papers/${paperId}/digital-exam/start`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitDigitalExam(attemptId: string, answers: Record<string, string>) {
  return api<{
    score: number;
    rawScore: number;
    maxScore: number;
    passed: boolean;
    passMarksRequired: number;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
    breakdown: { questionId: string; status: string; givenAnswer: string; correctAnswer: string }[];
    message: string;
  }>(`/api/examination/question-bank/digital-exam/${attemptId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}

export async function fetchDigitalExamAttempts(paperId: string) {
  return api<{ attempts: { id: string; candidateName: string; score: number | null; passed: boolean | null; submittedAt: string | null }[] }>(
    `/api/examination/question-bank/papers/${paperId}/attempts`,
  );
}

export function fileToBase64(file: File): Promise<PdfFileUpload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({ fileName: file.name, mimeType: file.type || 'application/octet-stream', fileData: result });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export type PaperManagementRecord = QuestionPaperSummary & {
  isMobilePublished: boolean;
  mobilePublishedAt: string | null;
  mobilePublishedBy: string;
  mobileVisibleOn: string | null;
  mobileVisibleOnKey: string | null;
  canPublishToMobile: boolean;
};

export type PaperManagementOverview = {
  academicYear: string;
  summary: {
    totalPapers: number;
    mobilePublished: number;
    mobilePending: number;
    digitalExams: number;
    totalQuestions: number;
  };
  papers: PaperManagementRecord[];
};

export type PaperManagementMeta = {
  defaultAcademicYear: string;
  academicYears: string[];
  classes: string[];
  sectionsByClass: Record<string, string[]>;
  subjects: string[];
  purposes: { id: ExamPaperPurpose; label: string }[];
  visibilityOptions: { id: string; label: string }[];
};

export async function fetchPaperManagementMeta() {
  return api<PaperManagementMeta>('/api/examination/paper-management/meta');
}

export async function fetchPaperManagementPapers(params?: {
  academicYear?: string;
  className?: string;
  sectionName?: string;
  subjectName?: string;
  purpose?: string;
  mobileStatus?: string;
}) {
  return api<PaperManagementOverview>(`/api/examination/paper-management/papers${qs(params)}`);
}

export async function publishPaperToMobile(paperId: string, visibleOn: 'APP' | 'BOTH' = 'BOTH') {
  return api<{
    paper: PaperManagementRecord;
    message: string;
    publishedAt: string;
    targetAudience: string;
    studentCount: number;
  }>(`/api/examination/paper-management/papers/${paperId}/publish-mobile`, {
    method: 'POST',
    body: JSON.stringify({ visibleOn }),
  });
}

export async function unpublishPaperFromMobile(paperId: string) {
  return api<{ paper: PaperManagementRecord; message: string }>(
    `/api/examination/paper-management/papers/${paperId}/unpublish-mobile`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function seedPaperManagement(academicYear?: string) {
  return api<{ seeded: boolean; mobilePublished: number }>(
    '/api/examination/paper-management/seed',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

export async function fetchMobilePublishedPapers(params?: {
  academicYear?: string;
  className?: string;
  sectionName?: string;
}) {
  return api<{ papers: unknown[] }>(`/api/examination/mobile/papers${qs(params)}`);
}

export type ExamSeatingPlanStatus =
  | 'DRAFT'
  | 'FINALIZED'
  | 'EXAM_CALL_ISSUED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export type SeatingRoomInput = {
  roomNumber: string;
  buildingName?: string;
  capacity: number;
  invigilatorName?: string;
};

export type SeatingRoom = SeatingRoomInput & {
  id: string;
  sortOrder: number;
  assignedCount: number;
  vacantSeats: number;
};

export type SeatingAssignment = {
  id: string;
  studentId: string;
  seriesNumber: string;
  seatNumber: number;
  rollLabel: string;
  className: string;
  sectionName: string;
  classGroup: string;
  studentName: string;
  admissionNumber: string;
  roomId: string;
  roomNumber: string;
  buildingName: string;
};

export type SeatingPlanSummary = {
  id: string;
  recordId: string;
  academicYear: string;
  title: string;
  examDate: string;
  examDateDisplay: string;
  status: ExamSeatingPlanStatus;
  statusLabel: string;
  seriesPrefix: string;
  totalStudents: number;
  totalRooms: number;
  examCallIssuedAt: string | null;
  examCallIssuedBy: string;
  notificationsSentAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  canEditRoomOnly: boolean;
  canIssueExamCall: boolean;
  canFinalize: boolean;
  canStartExam: boolean;
  roomCount: number;
  assignmentCount: number;
};

export type SeatingPlanDetail = SeatingPlanSummary & {
  rooms: SeatingRoom[];
  assignments: SeatingAssignment[];
};

export type SeatingMeta = {
  defaultAcademicYear: string;
  academicYears: string[];
  classes: string[];
  sectionsByClass: Record<string, string[]>;
  activeStudentCount: number;
  suggestedRooms: SeatingRoomInput[];
};

export async function fetchSeatingMeta() {
  return api<SeatingMeta>('/api/examination/seating/meta');
}

export async function fetchSeatingPlans(academicYear?: string) {
  return api<{ academicYear: string; plans: SeatingPlanSummary[] }>(
    `/api/examination/seating/plans${qs({ academicYear })}`,
  );
}

export async function fetchSeatingPlan(planId: string) {
  return api<{
    plan: SeatingPlanDetail;
    notificationSummary: { channel: string; recipientType: string; count: number }[];
    recentNotifications: {
      id: string;
      channel: string;
      recipientType: string;
      recipientName: string;
      recipientMobile: string;
      status: string;
      message: string;
      sentAt: string;
    }[];
  }>(`/api/examination/seating/plans/${planId}`);
}

export async function createSeatingPlan(payload: {
  academicYear: string;
  title: string;
  examDate: string;
  seriesPrefix?: string;
  rooms: SeatingRoomInput[];
}) {
  return api<{ plan: SeatingPlanDetail }>('/api/examination/seating/plans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function finalizeSeatingPlan(planId: string) {
  return api<{ plan: SeatingPlanDetail }>(`/api/examination/seating/plans/${planId}/finalize`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function issueExamCall(planId: string) {
  return api<{
    plan: SeatingPlanDetail;
    notifications: { pushCount: number; whatsappCount: number; total: number };
    message: string;
  }>(`/api/examination/seating/plans/${planId}/issue-exam-call`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function startExam(planId: string) {
  return api<{ plan: SeatingPlanDetail; message: string }>(
    `/api/examination/seating/plans/${planId}/start-exam`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function completeExam(planId: string) {
  return api<{ plan: SeatingPlanDetail }>(`/api/examination/seating/plans/${planId}/complete`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function updateAssignmentRoom(planId: string, assignmentId: string, roomId: string) {
  return api<{ assignment: SeatingAssignment; message: string }>(
    `/api/examination/seating/plans/${planId}/assignments/${assignmentId}/room`,
    { method: 'PATCH', body: JSON.stringify({ roomId }) },
  );
}

export async function seedSeating(academicYear?: string) {
  return api<{ seeded: boolean; planId?: string; plans?: number }>(
    '/api/examination/seating/seed',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

export type ExamInvigilationPlanStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'ROTATED'
  | 'PUBLISHED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export type ExamInvigilatorRole = 'PRIMARY' | 'CO_INVIGILATOR' | 'FLOOR_SUPERVISOR' | 'RELIEF';

export type InvigilationDuty = {
  id: string;
  personName: string;
  personMobile: string;
  personEmail: string;
  employeeCode: string;
  department: string;
  designation: string;
  role: ExamInvigilatorRole;
  roleLabel: string;
  roomNumber: string;
  buildingName: string;
  areaLabel: string;
  teamNumber: number;
  shiftStart: string;
  shiftEnd: string;
  status: string;
  teacherProfileId: string | null;
  staffProfileId: string | null;
  seatingRoomId: string | null;
  sortOrder: number;
};

export type InvigilationPlanSummary = {
  id: string;
  recordId: string;
  academicYear: string;
  title: string;
  examDate: string;
  examDateDisplay: string;
  seatingPlanId: string | null;
  status: ExamInvigilationPlanStatus;
  statusLabel: string;
  teamSize: number;
  rotationOffset: number;
  autoRotateEnabled: boolean;
  lastRotatedAt: string | null;
  publishedToMobile: boolean;
  mobilePublishedAt: string | null;
  createdBy: string;
  dutyCount: number;
  canRotate: boolean;
  canPublish: boolean;
  canStart: boolean;
};

export type InvigilationPlanDetail = InvigilationPlanSummary & {
  duties: InvigilationDuty[];
};

export type InvigilationMeta = {
  defaultAcademicYear: string;
  academicYears: string[];
  teachers: { id: string; type: 'teacher'; name: string; employeeCode: string; department: string; designation: string; mobile: string; email: string }[];
  staff: { id: string; type: 'staff'; name: string; employeeCode: string; department: string; designation: string; mobile: string; email: string }[];
  seatingPlans: { id: string; recordId: string; title: string; examDate: string; status: string }[];
  upcomingExamDates: { date: string; label: string }[];
  roles: { id: string; label: string }[];
  teamSizeDefault: number;
};

export async function fetchInvigilationMeta() {
  return api<InvigilationMeta>('/api/examination/invigilation/meta');
}

export async function fetchInvigilationPlans(academicYear?: string) {
  return api<{ academicYear: string; plans: InvigilationPlanSummary[] }>(
    `/api/examination/invigilation/plans${qs({ academicYear })}`,
  );
}

export async function fetchInvigilationPlan(planId: string) {
  return api<{
    plan: InvigilationPlanDetail;
    dutiesByRoom: { roomNumber: string; buildingName: string; areaLabel: string; duties: InvigilationDuty[] }[];
    notificationSummary: { channel: string; recipientType: string; count: number }[];
    recentNotifications: { id: string; channel: string; recipientName: string; message: string; sentAt: string }[];
  }>(`/api/examination/invigilation/plans/${planId}`);
}

export async function createInvigilationPlan(payload: {
  academicYear: string;
  title: string;
  examDate: string;
  seatingPlanId?: string;
  teamSize?: number;
  autoRotateEnabled?: boolean;
}) {
  return api<{ plan: InvigilationPlanDetail }>('/api/examination/invigilation/plans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function rotateInvigilationPlan(planId: string) {
  return api<{ plan: InvigilationPlanDetail; message: string }>(
    `/api/examination/invigilation/plans/${planId}/rotate`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function publishInvigilationToMobile(planId: string) {
  return api<{
    plan: InvigilationPlanDetail;
    notifications: { pushCount: number; whatsappCount: number; total: number };
    message: string;
  }>(`/api/examination/invigilation/plans/${planId}/publish-mobile`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function startInvigilation(planId: string) {
  return api<{ plan: InvigilationPlanDetail; message: string }>(
    `/api/examination/invigilation/plans/${planId}/start`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function completeInvigilation(planId: string) {
  return api<{ plan: InvigilationPlanDetail }>(
    `/api/examination/invigilation/plans/${planId}/complete`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function updateInvigilationDuty(
  planId: string,
  dutyId: string,
  data: { role?: ExamInvigilatorRole; roomNumber?: string; buildingName?: string; status?: string },
) {
  return api<{ duty: InvigilationDuty; message: string }>(
    `/api/examination/invigilation/plans/${planId}/duties/${dutyId}`,
    { method: 'PATCH', body: JSON.stringify(data) },
  );
}

export async function seedInvigilation(academicYear?: string) {
  return api<{ seeded: boolean; planId?: string; plans?: number }>(
    '/api/examination/invigilation/seed',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

export async function fetchMobileInvigilationDuties(params?: { date?: string; teacherName?: string }) {
  return api<{ date: string; duties: (InvigilationDuty & { planTitle: string; examDateDisplay: string })[]; total: number }>(
    `/api/examination/mobile/invigilation${qs(params)}`,
  );
}

export type ExamMarksColumnKey =
  | 'UNIT_1' | 'UNIT_2' | 'UNIT_3' | 'HALF_YEARLY' | 'YEARLY' | 'PRACTICAL_VIVA';

export type MarksColumnDef = {
  key: ExamMarksColumnKey;
  label: string;
  maxMarks: number;
  sortOrder: number;
  enabled?: boolean;
};

export type SubjectTeacherAssignment = {
  id: string;
  recordId: string;
  academicYear: string;
  className: string;
  sectionName: string;
  classGroup: string;
  subjectName: string;
  teacherName: string;
  teacherEmail: string;
  teacherPhone: string;
  assignedColumns: ExamMarksColumnKey[];
  assignedColumnLabels: string[];
  examinationName: string;
  studentCount: number;
  sheetId: string | null;
  sheetStatus: string | null;
  submittedAt: string | null;
};

export type MarkingSheetRow = {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  columns: {
    key: ExamMarksColumnKey;
    label: string;
    maxMarks: number;
    enabled: boolean;
    marksObtained: number | null;
    isAbsent: boolean;
    graceMarks: number;
    remarks: string;
    grade: string;
    examinerObservations: string;
  }[];
  totalObtained: number;
  totalMax: number;
  overallGrade: string;
};

export type MarkingSheet = {
  sheet: {
    id: string;
    recordId: string;
    examinationName: string;
    classGroup: string;
    subjectName: string;
    teacherName: string;
    status: string;
    isSubmitted: boolean;
    submittedAt: string | null;
  };
  columns: MarksColumnDef[];
  enabledMaxTotal: number;
  allMaxTotal: number;
  rows: MarkingSheetRow[];
};

export type MarksEntryMeta = {
  defaultAcademicYear: string;
  academicYears: string[];
  classes: string[];
  sectionsByClass: Record<string, string[]>;
  subjects: string[];
  teachers: { id: string; teacherName: string; email: string; mobile: string; department: string }[];
  columns: MarksColumnDef[];
  totalMaxMarks: number;
  bulkTemplateColumns: string[];
};

export async function fetchMarksEntryMeta() {
  return api<MarksEntryMeta>('/api/examination/marks-entry/meta');
}

export async function fetchSubjectTeacherAssignments(academicYear?: string) {
  return api<{ academicYear: string; assignments: SubjectTeacherAssignment[] }>(
    `/api/examination/marks-entry/assignments${qs({ academicYear })}`,
  );
}

export async function createSubjectTeacherAssignment(payload: {
  academicYear: string;
  className: string;
  sectionName: string;
  subjectName: string;
  teacherName: string;
  teacherEmail?: string;
  teacherPhone?: string;
  examinationName?: string;
  assignedColumns: ExamMarksColumnKey[];
}) {
  return api<{ assignment: SubjectTeacherAssignment }>('/api/examination/marks-entry/assignments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function bulkUploadSubjectAssignments(rows: Record<string, string>[]) {
  return api<{ created: number; updated: number; errors: { row: number; message: string }[]; total: number }>(
    '/api/examination/marks-entry/assignments/bulk-upload',
    { method: 'POST', body: JSON.stringify({ rows }) },
  );
}

export async function fetchMarkingSheet(sheetId: string) {
  return api<MarkingSheet & { assignment: SubjectTeacherAssignment }>(
    `/api/examination/marks-entry/sheets/${sheetId}`,
  );
}

export async function saveMarkingDraft(
  sheetId: string,
  entries: {
    studentId: string;
    columnKey: ExamMarksColumnKey;
    marksObtained?: number | null;
    isAbsent?: boolean;
    graceMarks?: number;
    remarks?: string;
    grade?: string;
    examinerObservations?: string;
  }[],
) {
  return api<{ message: string; updated: number }>(
    `/api/examination/marks-entry/sheets/${sheetId}/draft`,
    { method: 'POST', body: JSON.stringify({ entries }) },
  );
}

export async function submitMarkingSheet(sheetId: string) {
  return api<MarkingSheet & { pdfData: import('./examMarksSheetPdf').ExaminerPdfPayload; message: string }>(
    `/api/examination/marks-entry/sheets/${sheetId}/submit`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function seedMarksEntry(academicYear?: string) {
  return api<{ seeded: boolean; assignmentId?: string; assignments?: number }>(
    '/api/examination/marks-entry/seed',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

export type MarkingSheetApproval = {
  id: string;
  recordId: string;
  classGroup: string;
  subjectName: string;
  teacherName: string;
  examinationName: string;
  status: string;
  submittedAt: string | null;
  principalApprovedAt: string | null;
  returnReason: string;
  isLocked: boolean;
  canApprove: boolean;
  canReturn: boolean;
  canReopen: boolean;
};

export type ResultBatch = {
  id: string;
  recordId: string;
  classGroup: string;
  examinationName: string;
  status: string;
  publishMode: string;
  scheduledPublishAt: string | null;
  compiledAt: string | null;
  publishedAt: string | null;
  totalStudents: number;
  subjectsTotal: number;
  subjectsApproved: number;
  averagePercent: number;
  passPercent: number;
  canPublish: boolean;
  isPublished: boolean;
};

export type AuditLogEntry = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actor: string;
  details: string;
  createdAt: string;
};

export async function fetchResultProcessingMeta() {
  return api<{
    defaultAcademicYear: string;
    academicYears: string[];
    classes: string[];
    sectionsByClass: Record<string, string[]>;
    summary: { pendingApproval: number; compiled: number; published: number };
  }>('/api/examination/result-processing/meta');
}

export async function fetchPendingApprovals(academicYear?: string) {
  return api<{
    academicYear: string;
    sheets: MarkingSheetApproval[];
    pending: number;
    approved: number;
  }>(`/api/examination/result-processing/approvals${qs({ academicYear })}`);
}

export async function approveMarks(sheetId: string, remarks?: string) {
  return api<{ sheet: MarkingSheetApproval; message: string }>(
    `/api/examination/result-processing/sheets/${sheetId}/approve`,
    { method: 'POST', body: JSON.stringify({ remarks }) },
  );
}

export async function returnMarksToTeacher(sheetId: string, reason: string) {
  return api<{ sheet: MarkingSheetApproval; message: string }>(
    `/api/examination/result-processing/sheets/${sheetId}/return`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  );
}

export async function reopenMarks(sheetId: string, reason: string) {
  return api<{ sheet: MarkingSheetApproval; message: string }>(
    `/api/examination/result-processing/sheets/${sheetId}/reopen`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  );
}

export async function fetchResultBatches(academicYear?: string) {
  return api<{ academicYear: string; batches: ResultBatch[] }>(
    `/api/examination/result-processing/batches${qs({ academicYear })}`,
  );
}

export async function fetchResultBatch(batchId: string) {
  return api<{
    batch: ResultBatch;
    results: {
      studentName: string;
      admissionNumber: string;
      totalObtained: number;
      totalMax: number;
      percentage: number;
      grade: string;
      gpa: number;
      rank: number;
      overallPerformance: string;
      subjectScores: { subjectName: string; obtained: number; max: number; grade: string }[];
    }[];
    notificationSummary: { channel: string; count: number }[];
  }>(`/api/examination/result-processing/batches/${batchId}`);
}

export async function publishResults(batchId: string) {
  return api<{
    batch: ResultBatch;
    notifications: { pushCount: number; whatsappCount: number; smsCount: number; emailCount: number; total: number };
    message: string;
  }>(`/api/examination/result-processing/batches/${batchId}/publish`, {
    method: 'POST', body: JSON.stringify({}),
  });
}

export async function publishAllResults(academicYear?: string) {
  return api<{ published: number; message: string }>(
    '/api/examination/result-processing/publish-all',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

export async function scheduleResultPublication(batchId: string, scheduledAt: string) {
  return api<{ batch: ResultBatch; message: string }>(
    `/api/examination/result-processing/batches/${batchId}/schedule`,
    { method: 'POST', body: JSON.stringify({ scheduledAt }) },
  );
}

export async function fetchResultAuditTrail(params?: { limit?: number; entityType?: string }) {
  return api<{ logs: AuditLogEntry[] }>(`/api/examination/result-processing/audit${qs(params)}`);
}

export async function seedResultProcessing(academicYear?: string) {
  return api<{ seeded: boolean; action?: string; reason?: string }>(
    '/api/examination/result-processing/seed',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

// ── Report Cards ──────────────────────────────────────────────────────────────

export type ReportCardTemplate = 'PRE_PRIMARY' | 'PRIMARY' | 'MIDDLE' | 'UPPER' | 'BOARD';

export type ClassReportCardStatus = {
  className: string;
  sectionName: string;
  classGroup: string;
  examinationName: string;
  marksEntryStatus: 'COMPLETE' | 'PENDING';
  pendingSubjectCount: number;
  totalSubjects: number;
  reportCardStatus: string;
  templateType: ReportCardTemplate;
  templateLabel: string;
  isBoardExam: boolean;
  totalStudents: number;
  generatedCount: number;
  publishedCount: number;
  sharedCount: number;
  pendingCount: number;
  batchId: string | null;
  batchStatus: string | null;
  canPublish: boolean;
  canGenerate: boolean;
  blockers: string[];
};

export type ReportCardConfig = {
  id: string;
  academicYear: string;
  schoolName: string;
  schoolAddress: string;
  principalName: string;
  hasPrincipalSignature: boolean;
  hasSchoolSeal: boolean;
  hasClassTeacherSignature: boolean;
  hasHeaderLogo: boolean;
  footerNote: string;
  boardExamNotice: string;
  updatedAt: string;
};

export type ReportCardPreviewData = {
  result: {
    id: string;
    studentName: string;
    admissionNumber: string;
    className: string;
    sectionName: string;
    examinationName: string;
    academicYear: string;
    totalObtained: number;
    totalMax: number;
    percentage: number;
    grade: string;
    gpa: number;
    rank: number;
    remarks: string;
    overallPerformance: string;
    subjectScores: { subjectName: string; obtained: number; max: number; grade: string }[];
    templateType: ReportCardTemplate;
    reportCardStatus: string;
    reportCardToken: string;
  };
  config: {
    schoolName: string;
    schoolAddress: string;
    principalName: string;
    principalSignatureData: string;
    schoolSealData: string;
    classTeacherSignatureData: string;
    headerLogoData: string;
    footerNote: string;
    boardExamNotice: string;
  } | null;
  student: { dateOfBirth: string; fatherName: string; motherName: string };
};

export async function fetchReportCardsMeta() {
  return api<{
    defaultAcademicYear: string;
    academicYears: string[];
    classes: string[];
    sectionsByClass: Record<string, string[]>;
    templates: { id: string; label: string }[];
    boardClasses: string[];
    config: ReportCardConfig | null;
  }>('/api/examination/report-cards/meta');
}

export async function fetchClassReportCardStatuses(academicYear?: string) {
  return api<{
    academicYear: string;
    classes: ClassReportCardStatus[];
    summary: {
      totalClasses: number;
      marksPending: number;
      generated: number;
      published: number;
      boardExam: number;
      pending: number;
    };
  }>(`/api/examination/report-cards/status${qs({ academicYear })}`);
}

export async function fetchReportCardConfig(academicYear?: string) {
  return api<{ config: ReportCardConfig }>(`/api/examination/report-cards/config${qs({ academicYear })}`);
}

export async function updateReportCardConfig(data: {
  academicYear?: string;
  schoolName?: string;
  schoolAddress?: string;
  principalName?: string;
  footerNote?: string;
  boardExamNotice?: string;
}) {
  return api<{ config: ReportCardConfig; message: string }>(
    '/api/examination/report-cards/config',
    { method: 'PUT', body: JSON.stringify(data) },
  );
}

export async function uploadReportCardAsset(
  assetType: 'principalSignature' | 'schoolSeal' | 'classTeacherSignature' | 'headerLogo',
  fileName: string,
  fileData: string,
  academicYear?: string,
) {
  return api<{ config: ReportCardConfig; message: string }>(
    `/api/examination/report-cards/assets/${assetType}`,
    { method: 'POST', body: JSON.stringify({ fileName, fileData, academicYear }) },
  );
}

export async function generateReportCards(batchId: string) {
  return api<{ generated: number; templateType: ReportCardTemplate; templateLabel: string; message: string }>(
    `/api/examination/report-cards/batches/${batchId}/generate`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function generateAllReportCards(academicYear?: string) {
  return api<{ generated: number; classes: number; message: string }>(
    '/api/examination/report-cards/generate-all',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

export async function fetchReportCardPreview(resultId: string) {
  return api<ReportCardPreviewData>(`/api/examination/report-cards/results/${resultId}/preview`);
}

export async function shareReportCards(batchId: string) {
  return api<{ shared: number; message: string }>(
    `/api/examination/report-cards/batches/${batchId}/share`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function fetchBoardMarksheetUploads(params?: {
  academicYear?: string;
  className?: string;
  sectionName?: string;
}) {
  return api<{
    uploads: {
      id: string;
      studentId: string;
      studentName: string;
      admissionNumber: string;
      className: string;
      sectionName: string;
      examinationName: string;
      fileName: string;
      mimeType: string;
      uploadedBy: string;
      uploadedAt: string;
    }[];
  }>(`/api/examination/report-cards/board-uploads${qs(params)}`);
}

export async function uploadBoardMarksheet(data: {
  studentId: string;
  academicYear?: string;
  examinationName?: string;
  className: string;
  sectionName: string;
  fileName: string;
  mimeType?: string;
  fileData: string;
}) {
  return api<{ upload: { id: string; fileName: string }; message: string }>(
    '/api/examination/report-cards/board-uploads',
    { method: 'POST', body: JSON.stringify(data) },
  );
}

export async function seedReportCards(academicYear?: string) {
  return api<{ seeded: boolean; generated: number; message: string }>(
    '/api/examination/report-cards/seed',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

// ── Revaluation / Recheck ─────────────────────────────────────────────────────

export type RevaluationRequestType = 'REVALUATION' | 'RECHECK';
export type RevaluationStatus =
  | 'RECEIVED' | 'FEE_PENDING' | 'FEE_PAID' | 'UNDER_REVIEW'
  | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'PUBLISHED';

export type RevaluationRequest = {
  id: string;
  recordId: string;
  academicYear: string;
  examinationName: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  classGroup: string;
  subjectName: string;
  requestType: RevaluationRequestType;
  status: RevaluationStatus;
  originalMarks: number;
  originalMaxMarks: number;
  originalGrade: string;
  revisedMarks: number | null;
  revisedMaxMarks: number | null;
  revisedGrade: string;
  feeAmount: number;
  feePaid: boolean;
  feeReceiptNumber: string;
  feePaymentMode: string;
  feePaidAt: string | null;
  gracePeriodEndsAt: string;
  resultPublishedAt: string | null;
  withinGracePeriod: boolean;
  daysLeftInGrace: number;
  requestedAt: string;
  requestedBy: string;
  reviewedAt: string | null;
  reviewedBy: string;
  completedAt: string | null;
  publishedAt: string | null;
  remarks: string;
  rejectionReason: string;
  canPayFee: boolean;
  canReview: boolean;
  canComplete: boolean;
  canPublish: boolean;
};

export type BackPaperExam = {
  id: string;
  recordId: string;
  academicYear: string;
  examinationName: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  classGroup: string;
  subjectName: string;
  status: 'CREATED' | 'MARKS_ENTRY' | 'COMPLETED' | 'PUBLISHED';
  originalMarks: number;
  originalMaxMarks: number;
  originalGrade: string;
  passingMarks: number;
  examDate: string | null;
  newMarks: number | null;
  newMaxMarks: number | null;
  newGrade: string;
  marksEnteredAt: string | null;
  marksEnteredBy: string;
  publishedAt: string | null;
  remarks: string;
  createdBy: string;
  createdAt: string;
  canEnterMarks: boolean;
  canPublish: boolean;
};

export async function fetchRevaluationMeta() {
  return api<{
    defaultAcademicYear: string;
    academicYears: string[];
    classes: string[];
    sectionsByClass: Record<string, string[]>;
    config: { revaluationFee: number; recheckFee: number; gracePeriodDays: number; passingPercent: number };
    summary: { received: number; underReview: number; approved: number; rejected: number; published: number; backPapers: number };
  }>('/api/examination/revaluation/meta');
}

export async function fetchRevaluationRequests(params?: {
  academicYear?: string;
  status?: string;
  requestType?: string;
}) {
  return api<{
    academicYear: string;
    requests: RevaluationRequest[];
    summary: { total: number; received: number; underReview: number; completed: number; published: number; rejected: number };
  }>(`/api/examination/revaluation/requests${qs(params)}`);
}

export async function fetchEligibleForRevaluation(params?: {
  academicYear?: string;
  className?: string;
  sectionName?: string;
}) {
  return api<{
    eligible: {
      studentId: string;
      studentResultId: string;
      batchId: string;
      studentName: string;
      admissionNumber: string;
      className: string;
      sectionName: string;
      examinationName: string;
      subjectName: string;
      obtained: number;
      max: number;
      grade: string;
      resultPublishedAt: string;
      gracePeriodEndsAt: string;
      withinGracePeriod: boolean;
      revaluationFee: number;
      recheckFee: number;
    }[];
  }>(`/api/examination/revaluation/eligible${qs(params)}`);
}

export async function createRevaluationRequest(data: {
  studentResultId: string;
  subjectName: string;
  requestType: RevaluationRequestType;
  remarks?: string;
}) {
  return api<{ request: RevaluationRequest; message: string }>(
    '/api/examination/revaluation/requests',
    { method: 'POST', body: JSON.stringify(data) },
  );
}

export async function payRevaluationFee(requestId: string, data: { feeReceiptNumber: string; feePaymentMode?: string }) {
  return api<{ request: RevaluationRequest; message: string }>(
    `/api/examination/revaluation/requests/${requestId}/pay-fee`,
    { method: 'POST', body: JSON.stringify(data) },
  );
}

export async function startRevaluationReview(requestId: string) {
  return api<{ request: RevaluationRequest; message: string }>(
    `/api/examination/revaluation/requests/${requestId}/start-review`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function completeRevaluationReview(requestId: string, data: {
  revisedMarks: number;
  revisedMaxMarks?: number;
  approved?: boolean;
  rejectionReason?: string;
}) {
  return api<{ request: RevaluationRequest; message: string }>(
    `/api/examination/revaluation/requests/${requestId}/complete`,
    { method: 'POST', body: JSON.stringify(data) },
  );
}

export async function publishRevaluationResult(requestId: string) {
  return api<{ request: RevaluationRequest; updatedResult: { percentage: number; grade: string; gpa: number }; message: string }>(
    `/api/examination/revaluation/requests/${requestId}/publish`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function updateRevaluationConfig(data: {
  academicYear?: string;
  revaluationFee?: number;
  recheckFee?: number;
  gracePeriodDays?: number;
  passingPercent?: number;
}) {
  return api<{ config: { revaluationFee: number; recheckFee: number; gracePeriodDays: number; passingPercent: number }; message: string }>(
    '/api/examination/revaluation/config',
    { method: 'PUT', body: JSON.stringify(data) },
  );
}

export async function fetchBackPaperExams(params?: { academicYear?: string; status?: string }) {
  return api<{
    academicYear: string;
    exams: BackPaperExam[];
    summary: { total: number; created: number; marksEntry: number; completed: number; published: number };
  }>(`/api/examination/revaluation/back-papers${qs(params)}`);
}

export async function fetchFailedStudentsForBackPaper(params?: {
  academicYear?: string;
  className?: string;
  sectionName?: string;
}) {
  return api<{
    failed: {
      studentId: string;
      studentResultId: string;
      studentName: string;
      admissionNumber: string;
      className: string;
      sectionName: string;
      examinationName: string;
      subjectName: string;
      obtained: number;
      max: number;
      grade: string;
      passingMarks: number;
    }[];
  }>(`/api/examination/revaluation/back-papers/failed-students${qs(params)}`);
}

export async function createBackPaperExam(data: {
  studentResultId: string;
  subjectName: string;
  examDate?: string;
  remarks?: string;
}) {
  return api<{ exam: BackPaperExam; message: string }>(
    '/api/examination/revaluation/back-papers',
    { method: 'POST', body: JSON.stringify(data) },
  );
}

export async function enterBackPaperMarks(examId: string, data: { newMarks: number; newMaxMarks?: number }) {
  return api<{ exam: BackPaperExam; message: string }>(
    `/api/examination/revaluation/back-papers/${examId}/marks`,
    { method: 'POST', body: JSON.stringify(data) },
  );
}

export async function publishBackPaperResult(examId: string) {
  return api<{ exam: BackPaperExam; updatedResult: { percentage: number; grade: string; gpa: number }; message: string }>(
    `/api/examination/revaluation/back-papers/${examId}/publish`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function seedRevaluation(academicYear?: string) {
  return api<{ seeded: boolean; message?: string; reason?: string }>(
    '/api/examination/revaluation/seed',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

// ── Grade & Promotion ───────────────────────────────────────────────────────────

export type EligiblePromotionStudent = {
  studentId: string;
  studentResultId: string;
  batchId: string;
  studentName: string;
  admissionNumber: string;
  rollNumber: string;
  className: string;
  sectionName: string;
  classGroup: string;
  academicYear: string;
  examinationName: string;
  percentage: number;
  grade: string;
  remarks: string;
  fatherName: string;
  motherName: string;
  alreadyPromoted: boolean;
  nextClass: string;
  nextSection: string;
  promotionType: string;
  status: string;
};

export type PromotionBatch = {
  id: string;
  recordId: string;
  fromAcademicYear: string;
  toAcademicYear: string;
  fromClassName: string;
  fromSectionName: string;
  toClassName: string;
  toSectionName: string;
  classGroup: string;
  studentCount: number;
  promotedBy: string;
  promotedAt: string;
  remarks: string;
};

export async function fetchGradePromotionMeta() {
  return api<{
    defaultAcademicYear: string;
    nextAcademicYear: string;
    academicYears: string[];
    classes: string[];
    sectionsByClass: Record<string, string[]>;
    summary: { passedStudents: number; promotedStudents: number; promotionBatches: number };
  }>('/api/examination/grade-promotion/meta');
}

export async function fetchEligiblePromotionStudents(params?: {
  academicYear?: string;
  className?: string;
  sectionName?: string;
}) {
  return api<{
    academicYear: string;
    nextAcademicYear: string;
    students: EligiblePromotionStudent[];
    summary: { total: number; passed: number; alreadyPromoted: number; pending: number };
  }>(`/api/examination/grade-promotion/eligible${qs(params)}`);
}

export async function promoteStudents(data: {
  studentIds: string[];
  fromAcademicYear: string;
  toAcademicYear: string;
  fromClassName: string;
  fromSectionName: string;
  toClassName?: string;
  toSectionName?: string;
  remarks?: string;
}) {
  return api<{
    batch: PromotionBatch;
    promoted: number;
    studentIds: string[];
    message: string;
  }>('/api/examination/grade-promotion/promote', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchPromotionBatches(academicYear?: string) {
  return api<{ academicYear: string; batches: PromotionBatch[] }>(
    `/api/examination/grade-promotion/batches${qs({ academicYear })}`,
  );
}

export async function seedGradePromotion(academicYear?: string) {
  return api<{ seeded: boolean; message?: string; reason?: string }>(
    '/api/examination/grade-promotion/seed',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

// ── Certificates ──────────────────────────────────────────────────────────────

export type CertificateCategory =
  | 'PHYSICAL_HEALTH'
  | 'WORK_EDUCATION'
  | 'VISUAL_PERFORMING_ARTS'
  | 'LEADERSHIP_COMMUNITY';

export type CoScholasticCertificate = {
  id: string;
  recordId: string;
  academicYear: string;
  term: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  classGroup: string;
  category: CertificateCategory;
  categoryLabel: string;
  subCategory: string;
  activityTitle: string;
  activityId: string | null;
  performanceScore: number;
  performanceGrade: string;
  performanceBand: string;
  performanceBandLabel: string;
  status: 'RECORDED' | 'GENERATED' | 'ISSUED';
  certificateToken: string;
  recordedBy: string;
  recordedAt: string;
  generatedAt: string | null;
  issuedAt: string | null;
  remarks: string;
  canGenerate: boolean;
  canIssue: boolean;
  templateDesign?: { id: string; label: string; description: string; colors: { primary: string; accent: string; bg: string } };
};

export async function fetchCertificatesMeta() {
  return api<{
    defaultAcademicYear: string;
    academicYears: string[];
    classes: string[];
    sectionsByClass: Record<string, string[]>;
    categories: unknown[];
    templateDesigns: { id: CertificateCategory; label: string; description: string; colors: { primary: string; accent: string; bg: string } }[];
    summary: { recorded: number; generated: number; issued: number; total: number };
  }>('/api/examination/certificates/meta');
}

export async function fetchCertificates(params?: {
  academicYear?: string;
  className?: string;
  sectionName?: string;
  category?: string;
  status?: string;
}) {
  return api<{
    academicYear: string;
    certificates: CoScholasticCertificate[];
    summary: {
      total: number;
      recorded: number;
      generated: number;
      issued: number;
      byCategory: { category: string; label: string; count: number }[];
    };
  }>(`/api/examination/certificates${qs(params)}`);
}

export async function generateCertificates(certificateIds: string[]) {
  return api<{ generated: number; message: string }>(
    '/api/examination/certificates/generate',
    { method: 'POST', body: JSON.stringify({ certificateIds }) },
  );
}

export async function generateAllCertificates(data: {
  academicYear?: string;
  className?: string;
  sectionName?: string;
  category?: string;
}) {
  return api<{ generated: number; message: string }>(
    '/api/examination/certificates/generate-all',
    { method: 'POST', body: JSON.stringify(data) },
  );
}

export async function issueCertificates(certificateIds: string[]) {
  return api<{ issued: number; message: string }>(
    '/api/examination/certificates/issue',
    { method: 'POST', body: JSON.stringify({ certificateIds }) },
  );
}

export async function fetchCertificatePreview(certificateId: string) {
  return api<{
    certificate: CoScholasticCertificate;
    config: {
      schoolName: string;
      schoolAddress: string;
      principalName: string;
      principalSignatureData: string;
      schoolSealData: string;
      headerLogoData: string;
      footerNote: string;
    } | null;
  }>(`/api/examination/certificates/${certificateId}/preview`);
}

export async function seedCertificates(academicYear?: string) {
  return api<{ seeded: boolean; count?: number; message?: string; reason?: string }>(
    '/api/examination/certificates/seed',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

// ── Exam Analytics ────────────────────────────────────────────────────────────

export type ExamAnalytics = {
  academicYear: string;
  examType: string;
  examTypeLabel: string;
  generatedAt: string;
  overview: {
    studentsRegistered: number;
    examsConducted: number;
    resultsDeclared: number;
    averagePassPercent: number;
    averagePercent: number;
    totalStudentsWithResults: number;
    highestPercent: number;
  };
  resultSummary: {
    appeared: number;
    pass: number;
    fail: number;
    passPercent: number;
    failPercent: number;
    highest: number;
    average: number;
  } | null;
  examAnalytics: {
    passPercent: number;
    passDelta: number;
    average: number;
    averageDelta: number;
    improvement: number;
  } | null;
  performanceTrend: { term: string; average: number; pass: number }[];
  marksEntryStatus: { className: string; total: number; entered: number; pending: number; progress: number }[];
  classAnalytics: {
    className: string;
    sectionName: string;
    classGroup: string;
    examinationName: string;
    status: string;
    totalStudents: number;
    averagePercent: number;
    passPercent: number;
    passCount: number;
    failCount: number;
  }[];
  subjectAnalytics: { subjectName: string; averagePercent: number; studentCount: number }[];
  gradeDistribution: { grade: string; count: number; percentage: number }[];
  topPerformers: { rank: number; name: string; admissionNumber: string; classGroup: string; percentage: number; grade: string }[];
  bottomPerformers: { rank: number; name: string; admissionNumber: string; classGroup: string; percentage: number; grade: string }[];
  teacherWork: {
    summary: {
      totalAssignments: number;
      pendingAssignments: number;
      completedAssignments: number;
      returnedAssignments: number;
      assignedTeachers: number;
      pendingTeachers: number;
      completedTeachers: number;
    };
    assignedTeachers: {
      teacherName: string;
      teacherEmail: string;
      teacherPhone: string;
      totalAssignments: number;
      pendingAssignments: number;
      completedAssignments: number;
      returnedAssignments: number;
      overallProgress: number;
      subjects: string[];
      classGroups: string[];
    }[];
    pendingTeachers: ExamAnalytics['teacherWork']['assignedTeachers'];
    completedTeachers: ExamAnalytics['teacherWork']['assignedTeachers'];
    workItems: {
      assignmentId: string;
      recordId: string;
      teacherName: string;
      teacherEmail: string;
      classGroup: string;
      subjectName: string;
      examinationName: string;
      studentCount: number;
      sheetStatus: string;
      marksEntered: number;
      marksTotal: number;
      progress: number;
      isPending: boolean;
      isComplete: boolean;
      isReturned: boolean;
      submittedAt: string | null;
    }[];
  };
  revaluation: {
    received?: number;
    underReview?: number;
    approved?: number;
    rejected?: number;
    pending?: number;
  } | null;
  reportCards: {
    generated: number;
    published: number;
    shared: number;
    pending: number;
  } | null;
  questionBank: {
    total: number;
    subjective: number;
    objective: number;
    withSolution: number;
    subjectDistribution: { name: string; value: number; count: string; color: string }[];
  };
};

export async function fetchExamAnalyticsMeta() {
  return api<{
    defaultAcademicYear: string;
    academicYears: string[];
    examTypes: { id: string; label: string }[];
    classes: string[];
    sectionsByClass: Record<string, string[]>;
    examTypeLabels: Record<string, string>;
  }>('/api/examination/analytics/meta');
}

export async function fetchExamAnalytics(params?: {
  academicYear?: string;
  examType?: string;
  className?: string;
  sectionName?: string;
}) {
  return api<ExamAnalytics>(`/api/examination/analytics${qs(params)}`);
}

export async function seedExamAnalytics(academicYear?: string) {
  return api<{ seeded: boolean; message?: string }>(
    '/api/examination/analytics/seed',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}
