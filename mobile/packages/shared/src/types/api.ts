export type HomeworkAttachment = {
  id?: string;
  type?: string;
  title?: string;
  url?: string;
  fileName?: string;
};

export type HomeworkItem = {
  id: string;
  subjectName: string;
  teacherName: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string | null;
  statusLabel: string;
  attachments?: HomeworkAttachment[];
};

export type HomeworkResponse = {
  studentId: string;
  date: string;
  classGroup: string;
  homework: HomeworkItem[];
  total: number;
};

export type DashboardResponse = {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classGroup: string;
  academicYear: string;
  date: string;
  attendance: {
    month: string;
    present: number;
    absent: number;
    onLeave: number;
    totalMarked: number;
    attendancePercent: number;
  };
  performance: {
    academicPerformance: number;
    classTestAvg: number;
    subjectPerformance: { subjectName: string; avgScore: number }[];
    overallBuckets: Record<string, { label: string; count: number }>;
  };
  behavior: {
    behaviourScore: number | null;
    disciplineScore: number | null;
    riskFlags: Record<string, boolean>;
  };
  extracurricular: {
    totalActivities: number;
    withPerformance: number;
    recent: { id: string; title: string; category: string; band: string | null }[];
  };
};

export type TimetableSlot = {
  periodNumber: number;
  period: string;
  time: string;
  subject: string;
  teacher: string;
  room: string;
};

export type TimetableResponse = {
  date: string;
  dayOfWeek: number;
  dayLabel: string;
  className: string | null;
  sectionName: string | null;
  schedule: TimetableSlot[];
  totalPeriods: number;
};

export type TestPaper = {
  id: string;
  title: string;
  subjectName: string;
  purposeLabel?: string;
  durationMinutes?: number;
  questionCount?: number;
  mobilePublishedAt?: string | null;
};

export type TestsResponse = {
  studentId: string;
  papers: TestPaper[];
};

export type ProfileResponse = {
  student: {
    id: string;
    admissionNumber: string;
    name: string;
    classGroup: string;
    academicYear: string;
    mobile: string;
    email: string;
    photoUrl: string;
    status: string;
  };
  parents: { relationship: string; name: string; mobile: string }[];
  account: {
    role: string;
    displayName: string;
    mustResetPassword: boolean;
  };
};

export type NotificationRecord = {
  id: string;
  studentId: string | null;
  category: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  isRead: boolean;
};

export type NotificationsResponse = {
  unreadCount: number;
  records: NotificationRecord[];
};

export type FeeDue = {
  id: string;
  title: string;
  feeHeadLabel: string;
  amount: number;
  dueDate: string;
  status: string;
};

export type FeesResponse = {
  studentId: string;
  paymentsEnabled: boolean;
  summary: { pendingAmount: number; paidAmount: number; currency: string };
  dues: FeeDue[];
  receipts: { id: string; receiptNumber: string; amountPaid: number; collectedAt: string }[];
};

export type LeaveApplication = {
  id: string;
  recordId: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: string;
  attachmentUrl: string | null;
  createdAt: string;
};

export type ConsentItem = {
  id: string;
  status: string;
  sharedAt: string;
  template: { id: string; title: string; description: string };
};

export type LmsChapter = {
  id: string;
  subjectName: string;
  chapterTitle: string;
  teacherInstructions?: string;
  mediaItems: { id: string; type: string; title: string; url: string }[];
};

export type LmsResponse = {
  studentId: string;
  chapters: LmsChapter[];
};

export type ReminderPreferences = {
  preferences: Record<string, { enabled: boolean; daysBefore?: number; minutesBefore?: number }>;
  updatedAt: string | null;
};

export type MobileUpload = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
};
