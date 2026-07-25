import { api } from './api';

function qs(params?: Record<string, string | undefined>) {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export type HostelDashboard = {
  academicYear: string;
  academicYears: string[];
  hostels: { id: string; code: string; name: string; type: string; accessible: boolean }[];
  selectedHostelId: string;
  userRole: string;
  cacheRefreshMins: number;
  lastCacheRefresh: string | null;
  capacityAlert: boolean;
  kpis: {
    totalHostels: { value: number; subtitle: string };
    totalStudents: { value: number; subtitle: string };
    totalRooms: { value: number; subtitle: string };
    occupiedRooms: { value: number; subtitle: string; occupancyPct: number };
    totalStaff: { value: number; subtitle: string };
    messBalance: { value: string; subtitle: string; hidden?: boolean };
  };
  roomOccupancy: { name: string; value: number; color: string; percent: string }[];
  hostelWiseStudents: { name: string; students: number; color: string }[];
  checkInOut: { checkInToday: number; checkOutToday: number; currentlyInHostel: number; onLeaveOuting: number };
  leaveApplications: { name: string; value: number; color: string; percent: string }[];
  leaveTotal: number;
  messDashboard: {
    totalCollection: string;
    totalExpense: string;
    messBalance: string;
    studentsOpted: number;
    mealPreferences: { name: string; pct: number; color: string }[];
  } | null;
  recentAllotments: { student: string; hostel: string; room: string; bed: string; date: string; status: string }[];
  pendingPayments: { student: string; hostel: string; amount: string; dueDate: string; isPastDue: boolean }[];
  visitorLog: { visitorName: string; studentName: string; inTime: string; outTime: string; purpose: string }[];
  maintenanceRequests: { issue: string; location: string; date: string; status: string; statusColor: string }[];
  importantNotices: { text: string; date: string; iconColor: string; bg: string }[];
  attendanceSummary: { present: number; presentPct: string; absent: number; absentPct: string; onLeave: number; onLeavePct: string };
  incidentSummary: { total: number; resolved: number; open: number };
  hostelOverview: { totalHostels: number; totalRooms: number; occupiedRooms: number; vacantRooms: number; totalStudents: number; staffMembers: number };
  quickActions: { label: string; target: string }[];
  facilities: { label: string; target: string }[];
  exportFormats: string[];
  automationRules: string[];
  erpIntegration: string[];
};

export async function fetchHostelDashboard(seed?: boolean, academicYear?: string, hostelId?: string, role?: string) {
  const params: Record<string, string | undefined> = {};
  if (seed) params.seed = '1';
  if (academicYear) params.academicYear = academicYear;
  if (hostelId && hostelId !== 'ALL') params.hostelId = hostelId;
  if (role) params.role = role;
  return api<HostelDashboard>(`/api/hostel/dashboard${qs(params)}`);
}

export async function exportHostelDashboard(academicYear?: string, hostelId?: string, format = 'PDF') {
  return api<{ success: boolean; message: string; fileName: string; format: string }>(
    '/api/hostel/dashboard/export',
    { method: 'POST', body: JSON.stringify({ academicYear, hostelId, format }) },
  );
}

export type RoomsAllotmentBed = {
  id: string;
  bedNumber: string;
  status: string;
  color: string;
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    className: string;
    gender: string;
    paymentStatus: string;
    feeAmount: number;
    invoiceNumber: string;
    allotmentId: string;
    allotmentStatus: string;
  } | null;
};

export type RoomsAllotment = {
  academicYear: string;
  academicYears: string[];
  hostels: { id: string; code: string; name: string; type: string; accessible: boolean }[];
  selectedHostelId: string;
  blocks: { id: string; code: string; name: string }[];
  selectedBlockId: string;
  floors: { id: string; number: number; name: string }[];
  selectedFloorId: string;
  roomTypes: string[];
  selectedRoomType: string;
  matrix: {
    id: string;
    roomNumber: string;
    roomType: string;
    floorName: string;
    blockName: string;
    capacity: number;
    roomStatus: string;
    beds: RoomsAllotmentBed[];
  }[];
  kpis: { totalRooms: number; totalBeds: number; available: number; occupied: number; maintenance: number; occupancyPct: string };
  pendingRequests: {
    id: string;
    studentId: string;
    studentName: string;
    gender: string;
    className: string;
    course: string;
    yearLabel: string;
    outstandingFees: number;
    eligible: boolean;
    status: string;
    createdAt: string;
  }[];
  transferRequests: { id: string; studentName: string; fromBedId: string; toBedId: string; status: string; requestedBy: string }[];
  recentAllotments: { student: string; hostel: string; room: string; bed: string; date: string; status: string; paymentStatus: string }[];
  permissions: { canAllocate: boolean; canDeallocate: boolean; canTransfer: boolean; canApprove: boolean; canEditBed: boolean; canExport: boolean };
  defaultHostelFee: number;
  reports: string[];
  exportFormats: string[];
  wardenContact: { staffName: string; mobile: string } | null;
};

export async function fetchRoomsAllotment(
  seed?: boolean,
  academicYear?: string,
  filters?: { hostelId?: string; blockId?: string; floorId?: string; roomType?: string; role?: string },
) {
  const params: Record<string, string | undefined> = {};
  if (seed) params.seed = '1';
  if (academicYear) params.academicYear = academicYear;
  if (filters?.hostelId) params.hostelId = filters.hostelId;
  if (filters?.blockId) params.blockId = filters.blockId;
  if (filters?.floorId) params.floorId = filters.floorId;
  if (filters?.roomType) params.roomType = filters.roomType;
  if (filters?.role) params.role = filters.role;
  return api<RoomsAllotment>(`/api/hostel/rooms-allotment${qs(params)}`);
}

export async function allocateHostelBed(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string; notification?: string }>('/api/hostel/rooms-allotment/allocate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function confirmHostelAllotmentPayment(allotmentId: string) {
  return api<{ success: boolean; message: string }>('/api/hostel/rooms-allotment/confirm-payment', {
    method: 'POST',
    body: JSON.stringify({ allotmentId }),
  });
}

export async function deallocateHostelBed(body: { allotmentId?: string; bedId?: string; reason?: string }) {
  return api<{ success: boolean; message: string }>('/api/hostel/rooms-allotment/deallocate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function requestHostelTransfer(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string }>('/api/hostel/rooms-allotment/transfer', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function approveHostelTransfer(transferId: string, approverRole: 'Warden' | 'Admin') {
  return api<{ success: boolean; message: string }>('/api/hostel/rooms-allotment/approve-transfer', {
    method: 'POST',
    body: JSON.stringify({ transferId, approverRole, approverName: approverRole === 'Admin' ? 'Hostel Admin' : 'Warden' }),
  });
}

export async function autoAssignHostelBed(requestId: string) {
  return api<{ success: boolean; message: string }>('/api/hostel/rooms-allotment/auto-assign', {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  });
}

export async function updateHostelBedStatus(bedId: string, bedStatus: string) {
  return api<{ success: boolean; message: string }>('/api/hostel/rooms-allotment/bed-status', {
    method: 'POST',
    body: JSON.stringify({ bedId, bedStatus }),
  });
}

export async function exportRoomsAllotment(academicYear?: string, hostelId?: string, format = 'PDF') {
  return api<{ success: boolean; message: string; fileName: string }>('/api/hostel/rooms-allotment/export', {
    method: 'POST',
    body: JSON.stringify({ academicYear, hostelId, format }),
  });
}

export type HostelStudentRow = {
  id: string;
  studentId: string;
  name: string;
  admissionNumber: string;
  classLabel: string;
  gender: string;
  photoUrl: string;
  mobile: string;
  branch: string;
  batch: string;
  hostel: string;
  room: string;
  bed: string;
  block: string;
  bloodGroup: string;
  dietaryPreference: string;
  disciplinaryPoints: number;
  docStatus: string;
  hasSevereAllergy: boolean;
  guardianName: string;
  guardianMobile: string;
};

export type HostelStudents = {
  academicYear: string;
  academicYears: string[];
  hostels: { id: string; name: string; code: string }[];
  branches: string[];
  batches: string[];
  docStatuses: string[];
  dietaryOptions: string[];
  kpis: { totalResidents: number; verifiedDocs: number; pendingDocs: number; severeAllergyCases: number; pendingUpdateRequests: number };
  students: HostelStudentRow[];
  permissions: { canEdit: boolean; canVerifyDocs: boolean; canExport: boolean; canRequestUpdate: boolean };
  reports: string[];
  exportFormats: string[];
  lastSyncNote: string;
};

export type HostelStudentDetail = HostelStudentRow & {
  email: string;
  dateOfBirth: string;
  isMinor: boolean;
  fatherName: string;
  fatherMobile: string;
  motherName: string;
  motherMobile: string;
  address: string;
  localGuardian: { name: string; mobile: string; relation: string; address: string; idType: string; idMasked: string };
  medical: { restrictions: string; allergies: string; currentMedications: string; bloodGroup: string };
  documents: { id: string; docType: string; fileName: string; verificationStatus: string; verifiedBy: string; verifiedAt: string | null }[];
  pendingUpdateRequests: { id: string; requestedBy: string; fieldChanges: Record<string, unknown>; createdAt: string }[];
  roommates: { name: string; bed: string }[];
  warden: { name: string; mobile: string } | null;
};

export async function fetchHostelStudents(
  seed?: boolean,
  academicYear?: string,
  filters?: { q?: string; branch?: string; batch?: string; hostelId?: string; room?: string; docStatus?: string },
) {
  const params: Record<string, string | undefined> = {};
  if (seed) params.seed = '1';
  if (academicYear) params.academicYear = academicYear;
  if (filters?.q) params.q = filters.q;
  if (filters?.branch) params.branch = filters.branch;
  if (filters?.batch) params.batch = filters.batch;
  if (filters?.hostelId) params.hostelId = filters.hostelId;
  if (filters?.room) params.room = filters.room;
  if (filters?.docStatus) params.docStatus = filters.docStatus;
  return api<HostelStudents>(`/api/hostel/students${qs(params)}`);
}

export async function syncHostelStudentsErp(academicYear?: string) {
  return api<HostelStudents & { message: string; synced: number; created: number }>('/api/hostel/students/sync', {
    method: 'POST',
    body: JSON.stringify({ academicYear }),
  });
}

export async function fetchHostelStudentDetail(id: string) {
  return api<HostelStudentDetail>(`/api/hostel/students/${id}`);
}

export async function updateHostelStudent(id: string, body: Record<string, unknown>) {
  return api<HostelStudentDetail>(`/api/hostel/students/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function requestHostelProfileUpdate(id: string, fieldChanges: Record<string, unknown>) {
  return api<{ success: boolean; message: string }>(`/api/hostel/students/${id}/update-request`, {
    method: 'POST',
    body: JSON.stringify({ fieldChanges, requestedBy: 'Parent' }),
  });
}

export async function reviewHostelProfileUpdate(requestId: string, action: 'APPROVE' | 'REJECT') {
  return api<{ success: boolean; message: string }>(`/api/hostel/students/update-requests/${requestId}/review`, {
    method: 'POST',
    body: JSON.stringify({ action, reviewedBy: 'Hostel Admin' }),
  });
}

export async function verifyHostelStudentDoc(documentId: string, status: 'VERIFIED' | 'REJECTED') {
  return api<{ success: boolean; message: string }>(`/api/hostel/students/documents/${documentId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ status, verifiedBy: 'Hostel Admin' }),
  });
}

export async function exportHostelStudents(academicYear?: string, format = 'PDF', reportType?: string) {
  return api<{ success: boolean; message: string; fileName: string }>('/api/hostel/students/export', {
    method: 'POST',
    body: JSON.stringify({ academicYear, format, reportType }),
  });
}

export type VisitorLogRow = {
  id: string;
  visitorName: string;
  studentName: string;
  hostel: string;
  visitorType: string;
  visitorPhone: string;
  purpose: string;
  inTime: string;
  outTime: string;
  visitStatus: string;
  otpVerified: boolean;
  canTakeStudentOut: boolean;
  wardenStatus: string;
  qrToken: string;
  hasOverride: boolean;
};

export type VisitorManagement = {
  academicYear: string;
  visitDate: string;
  hostels: { id: string; name: string }[];
  visitorTypes: string[];
  kpis: {
    visitorsToday: number;
    currentlyInside: number;
    exitedToday: number;
    pendingOtp: number;
    overstayed: number;
    authorizedGuardians: number;
    blacklisted: number;
  };
  todayLog: VisitorLogRow[];
  overstayedVisitors: VisitorLogRow[];
  preRegistrations: {
    id: string;
    studentName: string;
    visitorName: string;
    visitorPhone: string;
    visitorType: string;
    scheduledTime: string;
    status: string;
    qrToken: string;
    requestedBy: string;
  }[];
  residents: { profileId: string; studentId: string; studentName: string; hostelId: string | null; hostelName: string; room: string }[];
  permissions: { canCreateEntry: boolean; canVerifyOtp: boolean; canLogExit: boolean; canPreRegister: boolean; canApprove: boolean; canOverride: boolean };
  reports: string[];
};

export async function fetchVisitorManagement(seed?: boolean, academicYear?: string, hostelId?: string) {
  const params: Record<string, string | undefined> = {};
  if (seed) params.seed = '1';
  if (academicYear) params.academicYear = academicYear;
  if (hostelId && hostelId !== 'ALL') params.hostelId = hostelId;
  return api<VisitorManagement>(`/api/hostel/visitors${qs(params)}`);
}

export async function createHostelVisitorEntry(body: Record<string, unknown>) {
  return api<{ success: boolean; logId: string; message: string; demoOtp?: string; notifications?: string[] }>(
    '/api/hostel/visitors/entry',
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export async function verifyHostelVisitorOtp(logId: string, otp: string) {
  return api<{ success: boolean; message: string }>(`/api/hostel/visitors/${logId}/verify-otp`, {
    method: 'POST',
    body: JSON.stringify({ otp }),
  });
}

export async function logHostelVisitorExit(logId: string) {
  return api<{ success: boolean; message: string }>(`/api/hostel/visitors/${logId}/exit`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Security' }),
  });
}

export async function approveHostelVisitor(logId: string, action: 'APPROVE' | 'REJECT') {
  return api<{ success: boolean; message: string; demoOtp?: string }>(`/api/hostel/visitors/${logId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ action, wardenName: 'Warden' }),
  });
}

export async function overrideHostelVisitor(logId: string, reason: string) {
  return api<{ success: boolean; message: string }>(`/api/hostel/visitors/${logId}/override`, {
    method: 'POST',
    body: JSON.stringify({ reason, wardenName: 'Warden' }),
  });
}

export async function preRegisterHostelVisitor(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string; qrPreview?: string }>('/api/hostel/visitors/pre-register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function reviewHostelPreRegistration(id: string, action: 'APPROVE' | 'REJECT') {
  return api<{ success: boolean; message: string; qrToken?: string }>(`/api/hostel/visitors/pre-register/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({ action, wardenName: 'Warden' }),
  });
}

export async function exportHostelVisitors(academicYear?: string, format = 'PDF', reportType?: string) {
  return api<{ success: boolean; message: string }>('/api/hostel/visitors/export', {
    method: 'POST',
    body: JSON.stringify({ academicYear, format, reportType }),
  });
}

export type MessManagement = {
  academicYear: string;
  weekStart: string;
  weekStartIso: string;
  mealTypes: { id: string; code: string; name: string; timeRange: string }[];
  financials: { totalCollection: string; totalExpense: string; messBalance: string; studentsOpted: number };
  preferenceChart: { name: string; pct: number; color: string }[];
  calendar: {
    date: string;
    dateIso: string;
    isToday: boolean;
    meals: { mealTypeId: string; mealName: string; timeRange: string; menuItems: string; isPublished: boolean; isClosed: boolean; menuId: string | null }[];
  }[];
  todayAttendance: { id: string; studentName: string; meal: string; scanMethod: string; time: string; isManual: boolean }[];
  todayConsumption: { meal: string; count: number }[];
  expenses: { id: string; date: string; category: string; description: string; amount: string }[];
  feedbacks: { id: string; studentName: string; meal: string; rating: number; comments: string }[];
  rebatesSummary: { studentName: string; leaveDays: number; rebateAmount: string; periodLabel: string }[];
  importantNotices: { title: string; date: string }[];
  permissions: { canPublishMenu: boolean; canRecordExpense: boolean; canMarkAttendance: boolean; canViewFinancials: boolean };
  reports: string[];
};

export async function fetchMessManagement(seed?: boolean, academicYear?: string, weekStart?: string) {
  const params: Record<string, string | undefined> = {};
  if (seed) params.seed = '1';
  if (academicYear) params.academicYear = academicYear;
  if (weekStart) params.weekStart = weekStart;
  return api<MessManagement>(`/api/hostel/mess${qs(params)}`);
}

export async function upsertHostelMessMenu(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string; notification?: string }>('/api/hostel/mess/menu', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function logHostelMessAttendance(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string }>('/api/hostel/mess/attendance', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function recordHostelMessExpense(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string }>('/api/hostel/mess/expense', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function exportHostelMess(academicYear?: string, format = 'PDF', reportType?: string) {
  return api<{ success: boolean; message: string }>('/api/hostel/mess/export', {
    method: 'POST',
    body: JSON.stringify({ academicYear, format, reportType }),
  });
}

export type LeaveManagement = {
  academicYear: string;
  leaveTypes: { value: string; label: string }[];
  kpis: { pending: number; approved: number; rejected: number; overstayed: number; total: number };
  chart: { name: string; value: number; color: string; percent: string }[];
  applications: {
    id: string;
    studentName: string;
    hostel: string;
    leaveType: string;
    reason: string;
    outDateTime: string;
    expectedInDateTime: string;
    status: string;
    gatePassQr: string;
    isOverstayed: boolean;
  }[];
  overstayedLeaves: LeaveManagement['applications'];
  students: { profileId: string; studentId: string; studentName: string; disciplinaryPoints: number }[];
  permissions: { canApply: boolean; canParentApprove: boolean; canWardenApprove: boolean; canSecurityVerify: boolean; canExport: boolean };
  minNoticeHours: number;
  reports: string[];
};

export async function fetchLeaveManagement(seed?: boolean, academicYear?: string, status?: string) {
  const params: Record<string, string | undefined> = {};
  if (seed) params.seed = '1';
  if (academicYear) params.academicYear = academicYear;
  if (status && status !== 'ALL') params.status = status;
  return api<LeaveManagement>(`/api/hostel/leave${qs(params)}`);
}

export async function submitHostelLeaveRequest(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string; demoParentOtp?: string }>('/api/hostel/leave/request', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function parentApproveHostelLeave(id: string, otp: string) {
  return api<{ success: boolean; message: string }>(`/api/hostel/leave/${id}/parent-approve`, {
    method: 'POST',
    body: JSON.stringify({ otp, parentName: 'Parent' }),
  });
}

export async function wardenApproveHostelLeave(id: string) {
  return api<{ success: boolean; message: string; gatePassQr?: string }>(`/api/hostel/leave/${id}/warden-approve`, {
    method: 'POST',
    body: JSON.stringify({ wardenName: 'Warden' }),
  });
}

export async function rejectHostelLeave(id: string, reason: string, rejectedBy: string) {
  return api<{ success: boolean; message: string }>(`/api/hostel/leave/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ rejectionReason: reason, rejectedBy }),
  });
}

export async function verifyHostelLeaveExit(gatePassQr: string) {
  return api<{ success: boolean; message: string }>('/api/hostel/leave/verify-exit', {
    method: 'POST',
    body: JSON.stringify({ gatePassQr, securityName: 'Security' }),
  });
}

export async function logHostelLeaveReturn(id: string) {
  return api<{ success: boolean; message: string }>(`/api/hostel/leave/${id}/return`, {
    method: 'POST',
    body: JSON.stringify({ securityName: 'Security' }),
  });
}

export async function exportHostelLeave(academicYear?: string, format = 'PDF', reportType?: string) {
  return api<{ success: boolean; message: string }>('/api/hostel/leave/export', {
    method: 'POST',
    body: JSON.stringify({ academicYear, format, reportType }),
  });
}

export type GatePassManagement = {
  academicYear: string;
  defaultMaxDuration: number;
  maxDurationCap: number;
  maxOutingsPerDay: number;
  finePer15Min: number;
  kpis: {
    pending: number;
    issued: number;
    out: number;
    returned: number;
    lateReturn: number;
    rejected: number;
    total: number;
  };
  chart: { name: string; value: number; color: string; percent: string }[];
  passes: {
    id: string;
    studentName: string;
    hostel: string;
    purpose: string;
    destination: string;
    maxDurationMinutes: number;
    status: string;
    qrToken: string;
    validUntil: string | null;
    exitScannedAt: string | null;
    returnScannedAt: string | null;
    lateMinutes: number;
    fineAmount: number;
    fineApplied: boolean;
    isLateActive?: boolean;
    remainingMins?: number | null;
  }[];
  lateReturns: GatePassManagement['passes'];
  students: { profileId: string; studentId: string; studentName: string; hostelId: string | null }[];
  hostels: { id: string; name: string }[];
  permissions: {
    canRequest: boolean;
    canIssue: boolean;
    canReject: boolean;
    canScan: boolean;
    canExport: boolean;
  };
  statusFlow: string[];
  reports: string[];
};

export async function fetchGatePassManagement(seed?: boolean, academicYear?: string, status?: string) {
  const params: Record<string, string | undefined> = { academicYear, status };
  if (seed) params.seed = '1';
  return api<GatePassManagement>(`/api/hostel/gate-pass${qs(params)}`);
}

export async function submitHostelGatePassRequest(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string }>('/api/hostel/gate-pass/request', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function issueHostelGatePass(id: string, body?: { wardenName?: string; maxDurationMinutes?: number }) {
  return api<{ success: boolean; message: string; qrToken?: string; validUntil?: string }>(
    `/api/hostel/gate-pass/${id}/issue`,
    { method: 'POST', body: JSON.stringify(body ?? {}) },
  );
}

export async function rejectHostelGatePass(id: string, reason: string, rejectedBy: string) {
  return api<{ success: boolean; message: string }>(`/api/hostel/gate-pass/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ rejectionReason: reason, rejectedBy }),
  });
}

export async function scanHostelGatePassOut(qrToken: string) {
  return api<{ success: boolean; message: string; validUntil?: string }>('/api/hostel/gate-pass/scan-out', {
    method: 'POST',
    body: JSON.stringify({ qrToken }),
  });
}

export async function scanHostelGatePassIn(qrToken: string) {
  return api<{ success: boolean; message: string; lateMinutes?: number; fineAmount?: number }>(
    '/api/hostel/gate-pass/scan-in',
    { method: 'POST', body: JSON.stringify({ qrToken }) },
  );
}

export async function exportHostelGatePass(academicYear?: string, format = 'PDF', reportType?: string) {
  return api<{ success: boolean; message: string }>('/api/hostel/gate-pass/export', {
    method: 'POST',
    body: JSON.stringify({ academicYear, format, reportType }),
  });
}

export type ComplaintsManagement = {
  academicYear: string;
  escalationHours: number;
  scopeNote: string;
  categories: { value: string; label: string }[];
  severities: { value: string; label: string }[];
  kpis: {
    open: number;
    inProgress: number;
    resolved: number;
    confirmed: number;
    escalated: number;
    feedback: number;
    total: number;
  };
  categoryChart: { name: string; value: number; color: string; percent: string }[];
  statusChart: { name: string; value: number; color: string; percent: string }[];
  complaints: {
    id: string;
    studentName: string;
    hostel: string;
    category: string;
    categoryCode: string;
    complaintType: string;
    subject: string;
    description: string;
    severity: string;
    status: string;
    rawStatus: string;
    assignedWarden: string;
    actionTaken: string;
    resolutionNotes: string;
    isEscalated: boolean;
    escalationEmailSent: boolean;
    ageHours: number;
    studentRating: number;
    loggedOn: string;
  }[];
  students: { profileId: string; studentId: string; studentName: string; hostelId: string | null }[];
  wardens: { id: string; name: string; hostelId: string | null }[];
  permissions: {
    canSubmit: boolean;
    canTakeAction: boolean;
    canResolve: boolean;
    canConfirm: boolean;
    canExport: boolean;
  };
  reports: string[];
};

export async function fetchComplaintsManagement(seed?: boolean, academicYear?: string, status?: string, category?: string) {
  const params: Record<string, string | undefined> = { academicYear, status, category };
  if (seed) params.seed = '1';
  return api<ComplaintsManagement>(`/api/hostel/complaints${qs(params)}`);
}

export async function submitHostelComplaint(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string }>('/api/hostel/complaints/submit', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function takeHostelComplaintAction(id: string, actionTaken: string, wardenName?: string) {
  return api<{ success: boolean; message: string }>(`/api/hostel/complaints/${id}/action`, {
    method: 'POST',
    body: JSON.stringify({ actionTaken, wardenName }),
  });
}

export async function resolveHostelComplaint(id: string, resolutionNotes: string, wardenName?: string) {
  return api<{ success: boolean; message: string }>(`/api/hostel/complaints/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolutionNotes, wardenName }),
  });
}

export async function confirmHostelComplaint(id: string, studentRating?: number, studentFeedbackNote?: string) {
  return api<{ success: boolean; message: string }>(`/api/hostel/complaints/${id}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ studentRating, studentFeedbackNote }),
  });
}

export async function exportHostelComplaints(academicYear?: string, format = 'PDF', reportType?: string) {
  return api<{ success: boolean; message: string }>('/api/hostel/complaints/export', {
    method: 'POST',
    body: JSON.stringify({ academicYear, format, reportType }),
  });
}

export type MaintenanceManagement = {
  academicYear: string;
  statusLegend: { open: string; inProgress: string; resolved: string };
  categories: { value: string; label: string }[];
  priorities: { value: string; label: string }[];
  kpis: { open: number; inProgress: number; resolved: number; closed: number; total: number };
  statusChart: { name: string; value: number; color: string; percent: string }[];
  tickets: {
    id: string;
    ticketNumber: string;
    issue: string;
    description: string;
    category: string;
    location: string;
    hostel: string;
    priority: string;
    status: string;
    statusLabel: string;
    statusColor: string;
    raisedBy: string;
    assignedTechnician: string;
    fixNotes: string;
    partsUsed: string[];
    requestDate: string;
  }[];
  widgetPreview: MaintenanceManagement['tickets'];
  inventory: {
    id: string;
    itemCode: string;
    itemName: string;
    stockQty: number;
    unit: string;
    lowStock: boolean;
  }[];
  lowStockCount: number;
  students: { profileId: string; studentName: string; hostelId: string | null }[];
  technicians: { id: string; name: string; role: string; hostelId: string | null }[];
  hostels: { id: string; name: string }[];
  permissions: {
    canRaise: boolean;
    canAssign: boolean;
    canWork: boolean;
    canResolve: boolean;
    canClose: boolean;
    canExport: boolean;
  };
  reports: string[];
};

export async function fetchMaintenanceManagement(seed?: boolean, academicYear?: string, status?: string, category?: string) {
  const params: Record<string, string | undefined> = { academicYear, status, category };
  if (seed) params.seed = '1';
  return api<MaintenanceManagement>(`/api/hostel/maintenance${qs(params)}`);
}

export async function raiseHostelMaintenanceTicket(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string }>('/api/hostel/maintenance/raise', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function assignHostelMaintenance(id: string, technicianId: string, technicianName?: string) {
  return api<{ success: boolean; message: string }>(`/api/hostel/maintenance/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ technicianId, technicianName, facilityManagerName: 'Facility Manager' }),
  });
}

export async function startHostelMaintenance(id: string) {
  return api<{ success: boolean; message: string }>(`/api/hostel/maintenance/${id}/start`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function resolveHostelMaintenance(id: string, fixNotes: string) {
  return api<{ success: boolean; message: string }>(`/api/hostel/maintenance/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ fixNotes }),
  });
}

export async function closeHostelMaintenance(
  id: string,
  parts?: { inventoryItemId: string; quantity: number }[],
) {
  return api<{ success: boolean; message: string }>(`/api/hostel/maintenance/${id}/close`, {
    method: 'POST',
    body: JSON.stringify({ parts, closedBy: 'Facility Manager' }),
  });
}

export async function exportHostelMaintenance(academicYear?: string, format = 'PDF', reportType?: string) {
  return api<{ success: boolean; message: string }>('/api/hostel/maintenance/export', {
    method: 'POST',
    body: JSON.stringify({ academicYear, format, reportType }),
  });
}

export type InventoryManagement = {
  academicYear: string;
  kpis: {
    totalItems: number;
    consumables: number;
    lowStock: number;
    assetTotal: number;
    assetAllotted: number;
    assetAvailable: number;
    mappings: number;
  };
  categoryChart: { name: string; value: number; color: string; percent: string }[];
  items: {
    id: string;
    itemCode: string;
    itemName: string;
    itemType: string;
    subCategory: string;
    subCategoryCode: string;
    unit: string;
    stockQty: number;
    reorderLevel: number;
    lowStock: boolean;
  }[];
  assets: {
    id: string;
    assetTag: string;
    assetName: string;
    assetType: string;
    assetTypeCode: string;
    condition: string;
    status: string;
    mappedToBed: string | null;
    mappedStudent: string | null;
    isAllotted: boolean;
  }[];
  bedMappings: {
    id: string;
    assetTag: string;
    assetName: string;
    assetType: string;
    studentName: string;
    roomLabel: string;
    bedLabel: string;
    allottedAt: string;
  }[];
  lowStockItems: InventoryManagement['items'];
  procurementAlerts: {
    id: string;
    itemName: string;
    message: string;
    currentStock: number;
    reorderLevel: number;
    sentToProcurement: boolean;
    sentAt: string | null;
    acknowledged: boolean;
  }[];
  recentTransactions: { id: string; itemName: string; type: string; quantity: number; balanceAfter: number; at: string }[];
  availableBeds: { bedId: string; bedLabel: string; roomLabel: string; hostelName: string; studentName: string; studentId: string }[];
  availableAssets: InventoryManagement['assets'];
  consumableSubCategories: { value: string; label: string }[];
  assetTypes: { value: string; label: string }[];
  automationRules: string[];
};

export async function fetchInventoryManagement(seed?: boolean, academicYear?: string, itemType?: string, subCategory?: string) {
  const params: Record<string, string | undefined> = { academicYear, itemType, subCategory };
  if (seed) params.seed = '1';
  return api<InventoryManagement>(`/api/hostel/inventory${qs(params)}`);
}

export async function stockInHostelInventory(inventoryItemId: string, quantity: number, notes?: string) {
  return api<{ success: boolean; message: string }>('/api/hostel/inventory/stock-in', {
    method: 'POST',
    body: JSON.stringify({ inventoryItemId, quantity, notes, performedBy: 'Store Keeper' }),
  });
}

export async function assignHostelAssetToBed(assetId: string, bedId: string, studentName?: string, studentId?: string) {
  return api<{ success: boolean; message: string }>('/api/hostel/inventory/assign-bed', {
    method: 'POST',
    body: JSON.stringify({ assetId, bedId, studentName, studentId, performedBy: 'Facility Manager' }),
  });
}

export async function releaseHostelAssetMapping(mappingId: string) {
  return api<{ success: boolean; message: string }>(`/api/hostel/inventory/mappings/${mappingId}/release`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Facility Manager' }),
  });
}

export async function acknowledgeHostelProcurementAlert(alertId: string) {
  return api<{ success: boolean; message: string }>(`/api/hostel/inventory/alerts/${alertId}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function exportHostelInventory(academicYear?: string, format = 'PDF', reportType?: string) {
  return api<{ success: boolean; message: string }>('/api/hostel/inventory/export', {
    method: 'POST',
    body: JSON.stringify({ academicYear, format, reportType }),
  });
}

export type LaundryManagement = {
  academicYear: string;
  currentMonth: string;
  defaultQuota: { monthlyItemLimit: number; monthlyWeightLimitKg: number };
  kpis: {
    tokenIssued: number;
    withVendor: number;
    readyForPickup: number;
    collected: number;
    total: number;
    pendingDispatch: number;
  };
  statusChart: { name: string; value: number; color: string; percent: string }[];
  requests: {
    id: string;
    tokenNumber: string;
    qrToken: string;
    studentName: string;
    hostel: string;
    itemCount: number;
    weightKg: number;
    status: string;
    statusLabel: string;
    mobileStatus: string;
    droppedAt: string;
    batchNumber: string | null;
  }[];
  vendors: { id: string; name: string; contact: string; mobile: string; schedule: string }[];
  batches: {
    id: string;
    batchNumber: string;
    vendor: string;
    status: string;
    totalItems: number;
    requestCount: number;
    dispatchedAt: string | null;
    receivedAt: string | null;
    expectedReturnAt: string | null;
  }[];
  students: {
    profileId: string;
    studentName: string;
    monthlyItemsUsed: number;
    monthlyItemsRemaining: number;
    monthlyWeightUsed: number;
    monthlyWeightRemaining: number;
    activeStatus: string | null;
    readyForPickup: boolean;
  }[];
  mobileSync: { readyMessage: string };
};

export async function fetchLaundryManagement(seed?: boolean, academicYear?: string, status?: string) {
  const params: Record<string, string | undefined> = { academicYear, status };
  if (seed) params.seed = '1';
  return api<LaundryManagement>(`/api/hostel/laundry${qs(params)}`);
}

export async function dropHostelLaundry(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string; tokenNumber?: string; qrToken?: string }>('/api/hostel/laundry/drop', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function dispatchHostelLaundry(vendorId: string, requestIds?: string[]) {
  return api<{ success: boolean; message: string }>('/api/hostel/laundry/dispatch', {
    method: 'POST',
    body: JSON.stringify({ vendorId, requestIds }),
  });
}

export async function receiveHostelLaundryBatch(batchId: string) {
  return api<{ success: boolean; message: string }>(`/api/hostel/laundry/batch/${batchId}/receive`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Laundry Staff' }),
  });
}

export async function collectHostelLaundry(qrToken: string) {
  return api<{ success: boolean; message: string }>('/api/hostel/laundry/collect', {
    method: 'POST',
    body: JSON.stringify({ qrToken, collectedBy: 'Laundry Staff' }),
  });
}

export async function fetchStudentLaundryMobile(studentProfileId: string, academicYear?: string) {
  return api<{
    laundryStatus: string;
    readyForPickup: boolean;
    remainingMonthlyQuota: number;
    remainingWeightQuota: number;
    activeToken: string | null;
    qrToken: string | null;
  }>(`/api/hostel/laundry/mobile/${studentProfileId}${qs({ academicYear })}`);
}

export async function exportHostelLaundry(academicYear?: string, format = 'PDF', reportType?: string) {
  return api<{ success: boolean; message: string }>('/api/hostel/laundry/export', {
    method: 'POST',
    body: JSON.stringify({ academicYear, format, reportType }),
  });
}

export type DisciplineManagement = {
  academicYear: string;
  academicYears: string[];
  currentMonth: string;
  settings: {
    leaveSuspensionPoints: number;
    parentNotifyPoints: number;
    parentNotifySeverities: string[];
    managementSeverities: string[];
  };
  monthSummary: { total: number; resolved: number; open: number; escalated: number };
  yearKpis: { total: number; resolved: number; open: number; escalated: number };
  severityChart: { name: string; value: number; color: string; percent: string }[];
  incidents: {
    id: string;
    studentName: string;
    hostel: string;
    incidentType: string;
    incidentTypeCode: string;
    severity: string;
    title: string;
    description: string;
    penaltyPoints: number;
    status: string;
    statusLabel: string;
    incidentDate: string;
    reportedBy: string;
    resolutionNotes: string;
    resolvedBy: string;
    resolvedAt: string | null;
    parentNotified: boolean;
    managementEscalated: boolean;
    leaveSuspended: boolean;
    monthLabel: string;
  }[];
  students: {
    profileId: string;
    studentId: string;
    studentName: string;
    hostelId: string | null;
    disciplinaryPoints: number;
    leaveSuspended: boolean;
  }[];
  suspendedStudents: { studentName: string; disciplinaryPoints: number }[];
  hostels: { id: string; name: string }[];
  incidentTypes: { value: string; label: string }[];
  severities: { value: string; label: string; defaultPoints: number }[];
  permissions: { canLog: boolean; canResolve: boolean; canEscalate: boolean; canExport: boolean };
  statusFlow: string[];
  automationRules: string[];
  reports: string[];
  exportFormats: string[];
};

export async function fetchDisciplineManagement(
  seed?: boolean,
  academicYear?: string,
  status?: string,
  severity?: string,
  monthLabel?: string,
) {
  const params: Record<string, string | undefined> = { academicYear, status, severity, monthLabel };
  if (seed) params.seed = '1';
  return api<DisciplineManagement>(`/api/hostel/discipline${qs(params)}`);
}

export async function logHostelDisciplineIncident(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string; notifications?: string[] }>('/api/hostel/discipline/log', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function resolveHostelDisciplineIncident(incidentId: string, resolutionNotes: string) {
  return api<{ success: boolean; message: string }>(`/api/hostel/discipline/${incidentId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolutionNotes, resolvedBy: 'Warden' }),
  });
}

export async function escalateHostelDisciplineIncident(incidentId: string) {
  return api<{ success: boolean; message: string; notifications?: string[] }>(`/api/hostel/discipline/${incidentId}/escalate`, {
    method: 'POST',
    body: JSON.stringify({ performedBy: 'Warden' }),
  });
}

export async function fetchHostelDisciplineDetail(incidentId: string) {
  return api<DisciplineManagement['incidents'][0] & { auditTrail: { action: string; fromStatus: string; toStatus: string; performedBy: string; details: string; at: string }[] }>(
    `/api/hostel/discipline/${incidentId}`,
  );
}

export async function exportHostelDiscipline(academicYear?: string, format = 'PDF', reportType?: string) {
  return api<{ success: boolean; message: string }>('/api/hostel/discipline/export', {
    method: 'POST',
    body: JSON.stringify({ academicYear, format, reportType }),
  });
}

export type HostelReportPreview = {
  reportTemplate: string;
  reportName: string;
  description: string;
  columns: string[];
  rows: Record<string, string | number>[];
  summary: Record<string, string | number>;
  rowCount: number;
  generatedAt: string;
  filters: Record<string, unknown>;
};

export type HostelReportsAnalytics = {
  academicYear: string;
  academicYears: string[];
  hostels: { id: string; code: string; name: string }[];
  selectedHostelId: string;
  reportTree: {
    statutory: {
      label: string;
      compliance: string[];
      reports: { id: string; name: string; description: string }[];
    };
  };
  exportFormats: string[];
  defaultFilters: {
    academicYear?: string;
    hostelId?: string;
    dateFrom?: string;
    dateTo?: string;
    monthLabel?: string;
  };
  settings: { monthlyMessBudget: number; complianceBodies: string[] };
  kpis: {
    occupancyPct: string;
    totalBeds: number;
    occupiedBeds: number;
    vacantBeds: number;
    feeDefaulters: number;
    totalOutstanding: string;
    messExpense: string;
    messBudget: string;
    movementRecords: number;
    assetReconciliationPct: string;
    reportsGenerated: number;
    activeSchedules: number;
  };
  reportPreviews: { id: string; name: string; description: string; summary: Record<string, string | number> }[];
  messBudgetChart: { name: string; value: number; color: string }[];
  occupancyChart: { name: string; value: number; color: string }[];
  schedules: {
    id: string;
    reportTemplate: string;
    reportName: string;
    frequency: string;
    channel: string;
    recipients: string;
    status: string;
    lastRunAt: string | null;
    nextRunAt: string | null;
    createdBy: string;
  }[];
  recentRuns: {
    id: string;
    reportName: string;
    reportTemplate: string;
    rowCount: number;
    exportFormat: string;
    performedBy: string;
    relativeTime: string;
    status: string;
  }[];
  roleMatrix: { role: string; permissions: string }[];
  automationRules: string[];
  complianceBodies: string[];
  erpIntegration: string;
};

export async function fetchHostelReportsAnalytics(seed?: boolean, academicYear?: string, hostelId?: string) {
  const params: Record<string, string | undefined> = { academicYear, hostelId };
  if (seed) params.seed = '1';
  return api<HostelReportsAnalytics>(`/api/hostel/reports${qs(params)}`);
}

export async function generateHostelReport(templateId: string, filters?: Record<string, unknown>) {
  return api<HostelReportPreview>('/api/hostel/reports/generate', {
    method: 'POST',
    body: JSON.stringify({ templateId, filters }),
  });
}

export async function exportHostelReport(templateId: string, format: string, filters?: Record<string, unknown>) {
  return api<{ success: boolean; message: string; preview: HostelReportPreview }>('/api/hostel/reports/export', {
    method: 'POST',
    body: JSON.stringify({ templateId, format, filters }),
  });
}

export async function scheduleHostelReport(body: Record<string, unknown>) {
  return api<{ success: boolean; message: string; data: HostelReportsAnalytics }>('/api/hostel/reports/schedule', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteHostelReportSchedule(scheduleId: string) {
  return api<{ success: boolean; data: HostelReportsAnalytics }>(`/api/hostel/reports/schedules/${scheduleId}`, {
    method: 'DELETE',
  });
}
