import { api } from './api';

export type LibraryDashboard = {
  academicYear: string;
  academicYears: string[];
  branches: { id: string; code: string; name: string }[];
  selectedBranchId: string;
  cacheRefreshMins: number;
  lastCacheRefresh: string | null;
  readOnlyRoles: string[];
  kpis: {
    totalBooks: { value: number; subtitle: string; trendUp?: boolean; target?: string };
    totalMembers: { value: number; subtitle: string; trendUp?: boolean; target?: string };
    booksIssued: { value: number; subtitle: string; target?: string };
    overdueBooks: { value: number; subtitle: string; subtitleColor?: string; target?: string };
    fineCollected: { value: string; subtitle: string; target?: string };
    availableBooks: { value: number; subtitle: string; target?: string };
  };
  issueReturnOverview: { name: string; value: number; color: string; percent: string }[];
  issueReturnTrend: { day: string; issued: number; returned: number; overdue: number }[];
  avgIssueDuration: number;
  totalIssuedCenter: number;
  bookCategories: { name: string; value: number; color: string; percent: string }[];
  totalBooksCenter: number;
  recentIssuedBooks: { title: string; author: string; issuedTo: string; dueDate: string; cover: string }[];
  overdueBooks: {
    id: string; title: string; issuedTo: string; class: string;
    issueDate: string; dueDate: string; daysOverdue: string; fine: string;
  }[];
  acquisitionSummary: { booksAdded: number; totalCost: string; donatedBooks: number; vendors: number };
  topVendors: { name: string; books: number; amount: string }[];
  popularBooks: { title: string; times: number }[];
  memberDistribution: { name: string; value: number; color: string; percent: string }[];
  totalMembersCenter: number;
  attendanceData: { time: string; visitors: number }[];
  attendanceSummary: { totalVisitors: number; peakTime: string };
  newArrivals: { title: string; author: string; category: string; date: string; cover: string }[];
  importantNotices: { title: string; issuedBy: string; date: string; iconColor: string; bg: string }[];
  quickActions: { label: string; target: string }[];
  navigationTargets: Record<string, string>;
  reportExports: string[];
  roleMatrix: unknown[];
};

export async function fetchLibraryDashboard(
  seed?: boolean,
  academicYear?: string,
  branchId?: string,
) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  if (academicYear) params.set('academicYear', academicYear);
  if (branchId) params.set('branchId', branchId);
  const qs = params.toString() ? `?${params}` : '';
  return api<LibraryDashboard>(`/api/library/dashboard${qs}`);
}

export async function sendLibraryBulkReminders(academicYear?: string, branchId?: string) {
  return api<{ sent: number; channels: string[]; message: string }>(
    '/api/library/dashboard/bulk-reminders',
    {
      method: 'POST',
      body: JSON.stringify({ academicYear, branchId }),
    },
  );
}

export type CatalogueBook = {
  id: string;
  bookCode: string;
  title: string;
  author: string;
  publisher: string;
  category: string;
  categoryColor: string;
  branch: string;
  isbn: string;
  edition: string;
  summary: string;
  coverImageUrl: string;
  coverColor: string;
  tags: string[];
  resourceType: string;
  totalCopies: number;
  availableCopies: number;
  availabilityStatus: 'AVAILABLE' | 'ISSUED' | 'RESERVED';
  canReserve: boolean;
  issueCount: number;
  searchCount: number;
  viewCount: number;
  popularityScore: number;
  isNewArrival: boolean;
  pendingReservations: number;
};

export type BookCatalogue = {
  academicYear: string;
  academicYears: string[];
  branches: { id: string; name: string }[];
  categories: { id: string; name: string; color: string }[];
  members: { id: string; name: string; code: string; type: string }[];
  availabilityOptions: string[];
  resourceTypes: string[];
  books: CatalogueBook[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  reports: {
    mostSearched: { title: string; searchCount: number; popularityScore: number }[];
    zeroResultQueries: { query: string; searchedAt: string }[];
  };
  roleAccess: string[];
  mobileSync: string[];
};

export type BookCatalogueDetail = CatalogueBook & {
  copies: { id: string; copyCode: string; rackLocation: string; status: string }[];
  reservationQueue: { position: number; memberName: string; reservedAt: string }[];
};

export type CatalogueParams = {
  q?: string;
  categoryId?: string;
  branchId?: string;
  availability?: string;
  resourceType?: string;
  author?: string;
  publisher?: string;
  tag?: string;
  academicYear?: string;
  page?: number;
  pageSize?: number;
};

export async function fetchBookCatalogue(seed?: boolean, params: CatalogueParams = {}) {
  const qs = new URLSearchParams();
  if (seed) qs.set('seed', '1');
  if (params.q) qs.set('q', params.q);
  if (params.categoryId) qs.set('categoryId', params.categoryId);
  if (params.branchId) qs.set('branchId', params.branchId);
  if (params.availability) qs.set('availability', params.availability);
  if (params.resourceType) qs.set('resourceType', params.resourceType);
  if (params.author) qs.set('author', params.author);
  if (params.publisher) qs.set('publisher', params.publisher);
  if (params.tag) qs.set('tag', params.tag);
  if (params.academicYear) qs.set('academicYear', params.academicYear);
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  const query = qs.toString() ? `?${qs}` : '';
  return api<BookCatalogue>(`/api/library/catalogue${query}`);
}

export async function fetchBookCatalogueDetail(bookId: string) {
  return api<BookCatalogueDetail>(`/api/library/catalogue/${bookId}`);
}

export async function reserveCatalogueBook(bookId: string, memberId: string, academicYear?: string) {
  return api<{ reservationId: string; message: string; queuePosition: number }>(
    `/api/library/catalogue/${bookId}/reserve`,
    { method: 'POST', body: JSON.stringify({ memberId, academicYear }) },
  );
}

export type CirculationMember = {
  id: string;
  memberCode: string;
  memberName: string;
  memberType: string;
  className: string;
  sectionName: string;
  mobile: string;
  email: string;
  activeIssues: number;
  maxBooks: number;
  issueDays: number;
  unpaidFines: number;
  unpaidFineThreshold: number;
  canIssue: boolean;
  blockReason: string | null;
};

export type CirculationBook = {
  bookId: string;
  copyId: string | null;
  accessionNo: string;
  title: string;
  author: string;
  category: string;
  branch: string;
  coverColor: string;
  copyStatus: string;
  rackLocation: string;
  available: boolean;
  activeIssue: {
    id: string;
    txnNumber: string;
    memberName: string;
    memberCode: string;
    issueDate: string;
    dueDate: string;
    status: string;
    daysOverdue: number;
  } | null;
};

export type BookIssueReturn = {
  academicYear: string;
  academicYears: string[];
  branches: { id: string; name: string }[];
  circulationRules: Record<string, { maxBooks: number; issueDays: number }>;
  finePerDay: number;
  unpaidFineThreshold: number;
  kpis: { activeIssues: number; overdueBooks: number; todayIssued: number; todayReturned: number };
  activeIssues: {
    id: string; txnNumber: string; accessionNo: string; bookTitle: string; author: string;
    memberName: string; memberCode: string; className: string;
    issueDate: string; dueDate: string; status: string; daysOverdue: number;
    fineAmount: number; branch: string;
  }[];
  dailyRegister: {
    id: string; txnNumber: string; txnType: string; accessionNo: string; bookTitle: string;
    memberName: string; memberCode: string; time: string; fineAmount: number; performedBy: string;
  }[];
  reports: string[];
  reminderSchedule: string[];
  mobileSync: string[];
  feeIntegration: string;
  roles: string[];
};

export type IssueResult = {
  success: boolean;
  txnNumber: string;
  issueId: string;
  memberName: string;
  bookTitle: string;
  accessionNo: string;
  issueDate: string;
  dueDate: string;
  message: string;
  notification: { channels: string[]; sent: boolean };
};

export type ReturnResult = {
  success: boolean;
  txnNumber: string;
  issueId: string;
  memberName: string;
  bookTitle: string;
  accessionNo: string;
  returnDate: string;
  daysOverdue: number;
  fineAmount: number;
  fineFormatted: string;
  fineRequired: boolean;
  message: string;
  notification: { channels: string[]; sent: boolean };
  feeIntegrationNote: string | null;
};

export async function fetchBookIssueReturn(seed?: boolean, academicYear?: string, branchId?: string) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  if (academicYear) params.set('academicYear', academicYear);
  if (branchId) params.set('branchId', branchId);
  const qs = params.toString() ? `?${params}` : '';
  return api<BookIssueReturn>(`/api/library/circulation${qs}`);
}

export async function lookupCirculationMember(memberCode: string) {
  return api<CirculationMember>(`/api/library/circulation/member/${encodeURIComponent(memberCode)}`);
}

export async function lookupCirculationBook(barcode: string) {
  return api<CirculationBook>(`/api/library/circulation/book/${encodeURIComponent(barcode)}`);
}

export async function issueCirculationBook(memberCode: string, accessionNo: string, academicYear?: string) {
  return api<IssueResult>('/api/library/circulation/issue', {
    method: 'POST',
    body: JSON.stringify({ memberCode, accessionNo, academicYear }),
  });
}

export async function returnCirculationBook(accessionNo: string, academicYear?: string) {
  return api<ReturnResult>('/api/library/circulation/return', {
    method: 'POST',
    body: JSON.stringify({ accessionNo, academicYear }),
  });
}

export type LibraryMemberRow = {
  id: string;
  erpUserId: string;
  erpSource: string;
  memberCode: string;
  memberName: string;
  memberType: string;
  category: string;
  categoryId: string | null;
  categoryColor: string;
  maxBooks: number;
  issueDays: number;
  className: string;
  sectionName: string;
  classLabel: string;
  mobile: string;
  email: string;
  barcodeUid: string;
  cardType: string;
  cardIssued: boolean;
  cardIssuedAt: string | null;
  branch: string;
  academicYear: string;
  status: string;
  suspendedReason: string;
  lastSyncedAt: string | null;
  activeIssues: number;
  pendingFines: number;
  isDefaulter: boolean;
};

export type LibraryMembers = {
  academicYear: string;
  academicYears: string[];
  branches: { id: string; name: string }[];
  categories: { id: string; code: string; name: string; memberType: string; maxBooks: number; issueDays: number; color: string }[];
  members: LibraryMemberRow[];
  kpis: { totalMembers: number; activeMembers: number; inactiveMembers: number; defaulters: number };
  memberTypeDistribution: { name: string; memberType: string; value: number; percent: string; color: string }[];
  defaulters: LibraryMemberRow[];
  reports: string[];
  mobileSync: string[];
  erpIntegration: string[];
  roles: string[];
};

export type LibraryMemberDetail = LibraryMemberRow & {
  demographics: { erpUserId: string; erpSource: string; gender: string; enrolledSince: string };
  borrowingHistory: {
    id: string; txnNumber: string; bookTitle: string; accessionNo: string;
    issueDate: string; dueDate: string; returnDate: string | null; status: string; fineAmount: number;
  }[];
  fineHistory: { id: string; amount: number; fineType: string; description: string; status: string; date: string }[];
  reservations: { id: string; bookTitle: string; status: string; reservedAt: string }[];
  activityLog: { id: string; txnType: string; txnNumber: string; bookTitle: string; date: string; fineAmount: number }[];
  digitalCard: { memberCode: string; barcodeUid: string; qrPayload: string; cardType: string };
  canDelete: boolean;
};

export type MemberFilters = {
  q?: string;
  status?: string;
  memberType?: string;
  categoryId?: string;
  branchId?: string;
  academicYear?: string;
};

export async function fetchLibraryMembers(seed?: boolean, filters: MemberFilters = {}) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  if (filters.q) params.set('q', filters.q);
  if (filters.status) params.set('status', filters.status);
  if (filters.memberType) params.set('memberType', filters.memberType);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.branchId) params.set('branchId', filters.branchId);
  if (filters.academicYear) params.set('academicYear', filters.academicYear);
  const qs = params.toString() ? `?${params}` : '';
  return api<LibraryMembers>(`/api/library/members${qs}`);
}

export async function fetchLibraryMemberDetail(memberId: string) {
  return api<LibraryMemberDetail>(`/api/library/members/${memberId}`);
}

export async function syncLibraryMembersErp(academicYear?: string) {
  return api<LibraryMembers & { created: number; updated: number; suspended: number; message: string }>(
    '/api/library/members/sync-erp',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

export async function updateLibraryMemberCategory(memberId: string, categoryId: string) {
  return api<LibraryMemberDetail>(`/api/library/members/${memberId}/category`, {
    method: 'PATCH',
    body: JSON.stringify({ categoryId }),
  });
}

export async function issueLibraryMemberCard(memberId: string, cardType: 'VIRTUAL' | 'PHYSICAL', barcodeUid?: string) {
  return api<LibraryMemberDetail>(`/api/library/members/${memberId}/issue-card`, {
    method: 'POST',
    body: JSON.stringify({ cardType, barcodeUid }),
  });
}

export async function deleteLibraryMember(memberId: string) {
  return api<{ success: boolean; message: string }>(`/api/library/members/${memberId}`, { method: 'DELETE' });
}

export type IsbnMetadata = {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  edition: string;
  summary: string;
  pageCount: number;
  language: string;
  deweyDecimal?: string;
  coverImageUrl: string;
  marcData?: Record<string, unknown>;
};

export type BookManagementCopy = {
  id: string;
  accessionNo: string;
  rackLocation: string;
  condition: string;
  status: string;
  barcodePrinted: boolean;
  purchasePrice: number;
};

export type BookManagementTitle = {
  id: string;
  bookCode: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  categoryId: string | null;
  branch: string;
  branchId: string;
  vendor: string;
  vendorId: string | null;
  edition: string;
  deweyDecimal: string;
  purchaseDate: string | null;
  purchasePrice: number;
  purchasePriceFormatted: string;
  invoiceNo: string;
  totalCopies: number;
  availableCopies: number;
  resourceType: string;
  isNewArrival: boolean;
  language: string;
  pageCount: number;
  addedDate: string;
  copies: BookManagementCopy[];
};

export type BookManagement = {
  academicYear: string;
  academicYears: string[];
  conditions: string[];
  branches: { id: string; name: string }[];
  categories: { id: string; code: string; name: string; color: string; accessionPrefix: string }[];
  vendors: { id: string; name: string }[];
  books: BookManagementTitle[];
  accessionRegister: {
    accessionNo: string; title: string; author: string; category: string;
    purchaseDate: string; vendor: string; condition: string; status: string;
    rackLocation: string; barcodePrinted: boolean;
  }[];
  procurementSummary: { titlesAdded: number; totalCopies: number; totalCost: string; vendors: number };
  vendorPerformance: { vendor: string; booksAdded: number; totalCost: string; date: string }[];
  reports: string[];
  roles: string[];
  financeIntegration: string;
  mobileSync: string[];
};

export type CreateBookPayload = {
  title: string;
  author: string;
  categoryId: string;
  branchId: string;
  academicYear?: string;
  isbn?: string;
  publisher?: string;
  edition?: string;
  summary?: string;
  deweyDecimal?: string;
  purchaseDate: string;
  purchasePrice?: number;
  invoiceNo?: string;
  vendorId?: string;
  rackLocation?: string;
  copyCount?: number;
  condition?: string;
  resourceType?: string;
  isNewArrival?: boolean;
  language?: string;
  pageCount?: number;
  coverImageUrl?: string;
};

export async function fetchBookManagement(seed?: boolean, academicYear?: string, q?: string) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  if (academicYear) params.set('academicYear', academicYear);
  if (q) params.set('q', q);
  const qs = params.toString() ? `?${params}` : '';
  return api<BookManagement>(`/api/library/books${qs}`);
}

export async function fetchIsbnMetadata(isbn: string) {
  return api<IsbnMetadata>(`/api/library/books/isbn/${encodeURIComponent(isbn)}`);
}

export async function createLibraryBook(payload: CreateBookPayload) {
  return api<{ bookId: string; accessionNumbers: string[]; message: string } & BookManagement>(
    '/api/library/books',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function addLibraryBookCopies(bookId: string, copyCount: number, rackLocation?: string, condition?: string) {
  return api<{ accessionNumbers: string[]; notifiedWaitlist: number }>(
    `/api/library/books/${bookId}/copies`,
    { method: 'POST', body: JSON.stringify({ copyCount, rackLocation, condition }) },
  );
}

export async function printLibraryBarcodes(copyIds: string[]) {
  return api<{ printed: number }>('/api/library/books/barcodes/print', {
    method: 'POST',
    body: JSON.stringify({ copyIds }),
  });
}

export async function deleteLibraryBook(bookId: string) {
  return api<{ success: boolean }>(`/api/library/books/${bookId}`, { method: 'DELETE' });
}

// ─── Categories & Subjects ────────────────────────────────────────────

export type LibCategoryNode = {
  id: string;
  categoryCode: string;
  categoryName: string;
  description: string;
  ddcRangeStart: string;
  ddcRangeEnd: string;
  color: string;
  sortOrder: number;
  issuable: boolean;
  issueDaysOverride: number | null;
  maxBooksOverride: number | null;
  parentId: string | null;
  bookCount: number;
  children: LibCategoryNode[];
  subjects: {
    id: string;
    subjectCode: string;
    subjectName: string;
    academicSubjectId: string | null;
    academicSubjectName: string | null;
    description: string;
  }[];
};

export type CategoriesSubjects = {
  academicYear: string;
  tree: LibCategoryNode[];
  flatCategories: { id: string; categoryCode: string; categoryName: string; parentId: string | null; issuable: boolean; bookCount: number }[];
  inventoryByCategory: { categoryId: string | null; categoryName: string; categoryCode: string; color: string; bookCount: number }[];
  academicSubjects: { id: string; code: string; name: string; type: string; group: string }[];
  circulationRules: { category: string; issuable: boolean; issueDays: number | null; maxBooks: number | null }[];
  reports: string[];
  mobileSync: string[];
  erpIntegration: string;
  roles: string[];
};

export type CreateCategoryPayload = {
  categoryCode: string;
  categoryName: string;
  parentId?: string;
  description?: string;
  ddcRangeStart?: string;
  ddcRangeEnd?: string;
  color?: string;
  issuable?: boolean;
  issueDaysOverride?: number;
  maxBooksOverride?: number;
};

export type CreateLibSubjectPayload = {
  categoryId: string;
  subjectCode: string;
  subjectName: string;
  academicSubjectId?: string;
  description?: string;
  academicYear?: string;
};

export async function fetchCategoriesSubjects(seed?: boolean, academicYear?: string) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  if (academicYear) params.set('academicYear', academicYear);
  const qs = params.toString() ? `?${params}` : '';
  return api<CategoriesSubjects>(`/api/library/categories${qs}`);
}

export async function createLibraryCategory(payload: CreateCategoryPayload) {
  return api<CategoriesSubjects>('/api/library/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateLibraryCategory(
  categoryId: string,
  payload: Partial<CreateCategoryPayload & { sortOrder: number; parentId: string | null }>,
) {
  return api<CategoriesSubjects>(`/api/library/categories/${categoryId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteLibraryCategory(categoryId: string) {
  return api<CategoriesSubjects>(`/api/library/categories/${categoryId}`, { method: 'DELETE' });
}

export async function reorderLibraryCategory(categoryId: string, parentId: string | null, sortOrder: number) {
  return api<CategoriesSubjects>('/api/library/categories/reorder', {
    method: 'POST',
    body: JSON.stringify({ categoryId, parentId, sortOrder }),
  });
}

export async function createLibrarySubject(payload: CreateLibSubjectPayload) {
  return api<CategoriesSubjects>('/api/library/categories/subjects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteLibrarySubject(subjectId: string) {
  return api<CategoriesSubjects>(`/api/library/categories/subjects/${subjectId}`, { method: 'DELETE' });
}

// ─── Rack Management ──────────────────────────────────────────────────

export type RackShelf = {
  id: string;
  shelfNumber: string;
  capacity: number;
  currentOccupancy: number;
  availableSpace: number;
  locationLabel: string;
};

export type RackNode = {
  id: string;
  rackNumber: string;
  capacity: number;
  currentOccupancy: number;
  availableSpace: number;
  assetTag: string;
  description: string;
  defaultCategoryIds: string[];
  shelves: RackShelf[];
};

export type LocationAisle = {
  id: string;
  locationName: string;
  locationCode: string;
  locationType: string;
  racks: RackNode[];
};

export type LocationFloor = {
  id: string;
  locationName: string;
  locationCode: string;
  locationType: string;
  aisles: LocationAisle[];
};

export type RackBranchTree = {
  id: string;
  code: string;
  name: string;
  floors: LocationFloor[];
};

export type RackManagement = {
  tree: RackBranchTree[];
  branches: { id: string; code: string; name: string }[];
  categories: { id: string; code: string; name: string; defaultRackId: string | null }[];
  summary: {
    totalRacks: number;
    totalShelves: number;
    totalCapacity: number;
    totalOccupancy: number;
    availableSpace: number;
    spaceUtilizationPct: number;
  };
  spaceUtilizationReport: {
    rackId: string;
    rackNumber: string;
    floor: string;
    aisle: string;
    capacity: number;
    currentOccupancy: number;
    availableSpace: number;
    utilizationPct: string;
  }[];
  misplacedBooks: {
    copyId: string;
    accessionNo: string;
    title: string;
    category: string;
    recordedLocation: string;
    expectedLocation: string;
    status: string;
  }[];
  unassignedCopies: {
    copyId: string;
    accessionNo: string;
    title: string;
    categoryId: string | null;
    category: string;
    rackLocation: string;
  }[];
  reports: string[];
  mobileSync: string[];
  assetIntegration: string;
  roles: string[];
};

export type RackSuggestion = {
  suggested: boolean;
  message?: string;
  rackId?: string;
  rackNumber?: string;
  shelfId?: string | null;
  shelfNumber?: string | null;
  locationLabel?: string;
  branchName?: string;
  capacityWarning?: boolean;
};

export async function fetchRackManagement(seed?: boolean) {
  const qs = seed ? '?seed=1' : '';
  return api<RackManagement>(`/api/library/racks${qs}`);
}

export async function createLibraryLocation(payload: {
  branchId: string;
  locationType: 'FLOOR' | 'AISLE';
  locationName: string;
  locationCode?: string;
  parentId?: string;
  description?: string;
}) {
  return api<RackManagement>('/api/library/racks/locations', { method: 'POST', body: JSON.stringify(payload) });
}

export async function createLibraryRack(payload: {
  locationId: string;
  rackNumber: string;
  capacity: number;
  assetTag?: string;
  description?: string;
}) {
  return api<RackManagement>('/api/library/racks', { method: 'POST', body: JSON.stringify(payload) });
}

export async function createLibraryShelf(payload: { rackId: string; shelfNumber: string; capacity?: number }) {
  return api<RackManagement>('/api/library/racks/shelves', { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteLibraryLocation(locationId: string) {
  return api<RackManagement>(`/api/library/racks/locations/${locationId}`, { method: 'DELETE' });
}

export async function deleteLibraryRack(rackId: string) {
  return api<RackManagement>(`/api/library/racks/${rackId}`, { method: 'DELETE' });
}

export async function deleteLibraryShelf(shelfId: string) {
  return api<RackManagement>(`/api/library/racks/shelves/${shelfId}`, { method: 'DELETE' });
}

export async function assignBooksToLibraryShelf(copyIds: string[], shelfId: string, force?: boolean) {
  return api<{ success: boolean; warning?: boolean; message: string; data?: RackManagement }>(
    '/api/library/racks/assign',
    { method: 'POST', body: JSON.stringify({ copyIds, shelfId, force }) },
  );
}

export async function bulkAssignLibraryByCategory(categoryId: string, shelfId?: string, force?: boolean) {
  return api<{ success: boolean; warning?: boolean; message: string; data?: RackManagement }>(
    '/api/library/racks/bulk-assign',
    { method: 'POST', body: JSON.stringify({ categoryId, shelfId, force }) },
  );
}

export async function setLibraryCategoryDefaultRack(categoryId: string, rackId: string | null) {
  return api<RackManagement & RackSuggestion>('/api/library/racks/category-default', {
    method: 'POST',
    body: JSON.stringify({ categoryId, rackId }),
  });
}

export async function suggestLibraryRackForCategory(categoryId: string) {
  return api<RackSuggestion>(`/api/library/racks/suggest/${categoryId}`);
}

// ─── Stock Verification ───────────────────────────────────────────────

export type AuditScan = {
  id: string;
  accessionNo: string;
  copyId: string | null;
  bookTitle: string;
  scanMethod: string;
  discrepancyType: string;
  resolution: string;
  resolutionNotes: string;
  expectedLocation: string;
  scannedLocation: string;
  issueStatus: string;
  purchasePrice: number;
  purchasePriceFormatted: string;
  scannedBy: string;
  resolvedBy: string;
  resolvedAt: string | null;
  scannedAt: string;
};

export type AuditSession = {
  id: string;
  auditCode: string;
  targetLabel: string;
  startDate: string;
  endDate: string | null;
  scannedBy: string;
  closedBy: string;
  status: string;
  systemCount: number;
  physicalCount: number;
  variance: number;
  missingCount: number;
  misplacedCount: number;
  extraCount: number;
  damagedCount: number;
  returnedUnrecordedCount: number;
  financialLoss: number;
  financialLossFormatted: string;
  adminNotified: boolean;
  academicYear: string;
  rackId: string | null;
  shelfId: string | null;
  branchId: string | null;
};

export type StockVerification = {
  academicYears: string[];
  branches: { id: string; code: string; name: string }[];
  rackOptions: { id: string; rackNumber: string; label: string; branchId: string }[];
  shelfOptions: { id: string; rackId: string; shelfNumber: string; label: string }[];
  sessions: AuditSession[];
  activeSession: AuditSession | null;
  focusSession: AuditSession | null;
  scanLog: AuditScan[];
  discrepancyMatrix: {
    missing: AuditScan[];
    misplaced: AuditScan[];
    extra: AuditScan[];
    returnedUnrecorded: AuditScan[];
    damaged: AuditScan[];
    matched: AuditScan[];
  };
  pendingDiscrepancies: number;
  canClose: boolean;
  recentClosed: AuditSession[];
  reports: string[];
  highLossThreshold: number;
  highLossThresholdFormatted: string;
  mobileSync: string[];
  financeIntegration: string;
  roles: string[];
  automationRules: string[];
};

export async function fetchStockVerification(seed?: boolean, sessionId?: string) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  if (sessionId) params.set('sessionId', sessionId);
  const qs = params.toString() ? `?${params}` : '';
  return api<StockVerification>(`/api/library/stock-verification${qs}`);
}

export async function createAuditSession(payload: {
  scannedBy: string;
  rackId?: string;
  shelfId?: string;
  branchId?: string;
  academicYear?: string;
  notes?: string;
}) {
  return api<StockVerification>('/api/library/stock-verification/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function scanAuditBook(
  sessionId: string,
  accessionNo: string,
  scannedBy: string,
  scanMethod?: 'BARCODE' | 'RFID' | 'MANUAL',
  markDamaged?: boolean,
) {
  return api<{ duplicate: boolean; scan: AuditScan; flagged?: boolean; message: string; data: StockVerification }>(
    `/api/library/stock-verification/sessions/${sessionId}/scan`,
    { method: 'POST', body: JSON.stringify({ accessionNo, scannedBy, scanMethod, markDamaged }) },
  );
}

export async function reconcileAuditSession(sessionId: string, scannedBy: string) {
  return api<StockVerification>(`/api/library/stock-verification/sessions/${sessionId}/reconcile`, {
    method: 'POST',
    body: JSON.stringify({ scannedBy }),
  });
}

export async function resolveAuditDiscrepancy(
  scanId: string,
  resolution: 'MARKED_LOST' | 'MARKED_FOUND' | 'CORRECTED' | 'ACCEPTED',
  resolvedBy: string,
  notes?: string,
) {
  return api<StockVerification>(`/api/library/stock-verification/scans/${scanId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolution, resolvedBy, notes }),
  });
}

export async function closeAuditSession(sessionId: string, closedBy: string) {
  return api<{
    success: boolean;
    auditCode: string;
    financialLoss: number;
    financialLossFormatted: string;
    adminNotified: boolean;
    writeOffJournalEntries: { description: string; debitAccount: string; creditAccount: string; amount: number; amountFormatted: string }[];
    data: StockVerification;
  }>(`/api/library/stock-verification/sessions/${sessionId}/close`, {
    method: 'POST',
    body: JSON.stringify({ closedBy }),
  });
}

// ─── Fine Management ──────────────────────────────────────────────────

export type FineRecord = {
  id: string;
  transactionRef: string;
  fineType: string;
  amount: number;
  paidAmount: number;
  waivedAmount: number;
  balance: number;
  amountFormatted: string;
  balanceFormatted: string;
  fineDate: string;
  status: string;
  description: string;
  memberCode: string;
  memberName: string;
  memberClass: string;
  bookTitle: string;
  accessionNo: string;
};

export type FineManagement = {
  academicYears: string[];
  settings: { finePerDay: number; unpaidFineThreshold: number; librarianWaiverThreshold: number };
  kpis: {
    collectedThisMonth: number;
    collectedThisMonthFormatted: string;
    pendingTotal: number;
    pendingTotalFormatted: string;
    pendingFinesCount: number;
    defaultersCount: number;
    waivedThisMonth: number;
    waivedThisMonthFormatted: string;
    todayCollection: number;
    todayCollectionFormatted: string;
  };
  members: { id: string; code: string; name: string; className: string }[];
  fines: FineRecord[];
  memberLedger: {
    member: { id: string; code: string; name: string; className: string; mobile: string; email: string };
    outstanding: number;
    outstandingFormatted: string;
    canIssue: boolean;
    noDuesBlocked: boolean;
    fines: FineRecord[];
    payments: { id: string; transactionRef: string; receiptNo: string; amount: number; amountFormatted: string; paymentMethod: string; paidAt: string; collectedBy: string }[];
  } | null;
  dailyCollectionRegister: { id: string; receiptNo: string; transactionRef: string; memberName: string; memberCode: string; amount: number; amountFormatted: string; paymentMethod: string; time: string; collectedBy: string }[];
  defaultersList: { memberId: string; memberCode: string; memberName: string; className: string; outstanding: number; outstandingFormatted: string; mobile: string }[];
  waivedFinesReport: { id: string; memberName: string; memberCode: string; fineType: string; waiverAmount: number; waiverAmountFormatted: string; reason: string; approvedBy: string; approvedAt: string }[];
  pendingWaivers: { id: string; memberName: string; fineType: string; waiverAmount: number; waiverAmountFormatted: string; reason: string; requestedBy: string; requiresPrincipal: boolean }[];
  recentPayments: { id: string; receiptNo: string; memberName: string; amount: number; amountFormatted: string; paymentMethod: string; paidAt: string }[];
  paymentMethods: string[];
  reports: string[];
  notifications: string[];
  mobileSync: string[];
  feeIntegration: string;
  financeIntegration: string;
  roles: string[];
  automationRules: string[];
};

export async function fetchFineManagement(seed?: boolean, memberId?: string) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  if (memberId) params.set('memberId', memberId);
  const qs = params.toString() ? `?${params}` : '';
  return api<FineManagement>(`/api/library/fines${qs}`);
}

export async function accrueLibraryFines() {
  return api<{ accrued: number; message: string; data: FineManagement }>('/api/library/fines/accrue', { method: 'POST' });
}

export async function collectLibraryFinePayment(payload: {
  memberId: string;
  amount: number;
  paymentMethod: string;
  transactionRef?: string;
  collectedBy: string;
  fineIds?: string[];
}) {
  return api<{
    success: boolean;
    receiptNo: string;
    transactionRef: string;
    amountFormatted: string;
    receipt: Record<string, unknown>;
    data: FineManagement;
  }>('/api/library/fines/payments', { method: 'POST', body: JSON.stringify(payload) });
}

export async function requestLibraryFineWaiver(payload: {
  fineId: string;
  waiverAmount: number;
  reason?: string;
  requestedBy: string;
}) {
  return api<{ waiverId: string; requiresPrincipal: boolean; message: string; data: FineManagement }>(
    '/api/library/fines/waivers',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function approveLibraryFineWaiver(waiverId: string, approvedBy: string, approve = true) {
  return api<{ success: boolean; message: string; data: FineManagement }>(
    `/api/library/fines/waivers/${waiverId}/approve`,
    { method: 'POST', body: JSON.stringify({ approvedBy, approve }) },
  );
}

export async function fetchFinePaymentReceipt(paymentId: string) {
  return api<Record<string, unknown>>(`/api/library/fines/payments/${paymentId}/receipt`);
}

// ─── Library Attendance (Gate) ────────────────────────────────────────

export type GateLogRow = {
  id: string;
  memberCode: string;
  memberName: string;
  memberType: string;
  className: string;
  entryTime: string;
  entryTimeFormatted: string;
  exitTime: string | null;
  exitTimeFormatted: string;
  durationMinutes: number | null;
  durationFormatted: string;
  terminalId: string;
  scanMethod: string;
  status: string;
  manualOverride: boolean;
};

export type LibraryGateAttendance = {
  academicYear: string;
  academicYears: string[];
  branches: { id: string; code: string; name: string }[];
  selectedBranchId: string;
  settings: { libraryClosingTime: string; parentGateNotifications: boolean; gateTerminals: string[] };
  liveGate: { currentlyInside: number; recentEntries: GateLogRow[] };
  kpis: {
    todayVisitors: number;
    uniqueVisitorsToday: number;
    monthlyFootfall: number;
    uniqueVisitorsMonth: number;
    currentlyInside: number;
    peakHour: string;
    peakCount: number;
  };
  dailyVisitorLog: GateLogRow[];
  peakHoursAnalysis: { hour: string; count: number }[];
  monthlyFootfallTrend: { date: string; count: number }[];
  nonVisitorsReport: { memberCode: string; memberName: string; className: string }[];
  attendanceChart: { time: string; visitors: number }[];
  attendanceSummary: { totalVisitors: number; peakTime: string };
  scanMethods: string[];
  reports: string[];
  notifications: string[];
  mobileSync: string[];
  erpIntegration: string;
  roles: string[];
  automationRules: string[];
};

export async function fetchLibraryGateAttendance(seed?: boolean, academicYear?: string, branchId?: string) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  if (academicYear) params.set('academicYear', academicYear);
  if (branchId) params.set('branchId', branchId);
  const qs = params.toString() ? `?${params}` : '';
  return api<LibraryGateAttendance>(`/api/library/attendance${qs}`);
}

export async function gateScanIn(payload: {
  memberCode: string;
  terminalId?: string;
  scanMethod?: string;
  academicYear?: string;
  performedBy?: string;
}) {
  return api<{ success: boolean; message: string; data: LibraryGateAttendance }>(
    '/api/library/attendance/scan-in',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function gateScanOut(payload: {
  memberCode: string;
  terminalId?: string;
  scanMethod?: string;
  academicYear?: string;
}) {
  return api<{ success: boolean; message: string; durationFormatted?: string; data: LibraryGateAttendance }>(
    '/api/library/attendance/scan-out',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function manualGateEntry(payload: {
  memberCode: string;
  event: 'IN' | 'OUT';
  terminalId?: string;
  reason?: string;
  performedBy: string;
  academicYear?: string;
}) {
  return api<{ success: boolean; message: string; data: LibraryGateAttendance }>(
    '/api/library/attendance/manual',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function autoCloseGateSessions() {
  return api<{ closed: number; message: string; data: LibraryGateAttendance }>(
    '/api/library/attendance/auto-close',
    { method: 'POST' },
  );
}

// ─── Reading Room ───────────────────────────────────────────────────

export type SeatBookingRow = {
  id: string;
  seatCode: string;
  floorZone: string;
  seatType: string;
  memberCode: string;
  memberName: string;
  className: string;
  startTime: string;
  endTime: string;
  startFormatted: string;
  endFormatted: string;
  occupiedAt: string | null;
  vacatedAt: string | null;
  gateDeadline: string;
  status: string;
  timeRemainingMins: number;
  timeRemainingFormatted: string;
  reminderSent: boolean;
};

export type FloorPlanSeat = {
  id: string;
  seatCode: string;
  floorZone: string;
  rowIndex: number;
  colIndex: number;
  seatType: string;
  hasPower: boolean;
  hasLamp: boolean;
  status: string;
  currentBooking: SeatBookingRow | null;
};

export type InHouseTxnRow = {
  id: string;
  txnNumber: string;
  memberCode: string;
  memberName: string;
  bookCode: string;
  bookTitle: string;
  seatCode: string;
  issueTime: string;
  issueFormatted: string;
  returnTime: string | null;
  returnFormatted: string;
  status: string;
  rfidAlarmActive: boolean;
  issuedBy: string;
};

export type LibraryReadingRoom = {
  academicYear: string;
  academicYears: string[];
  branches: { id: string; code: string; name: string }[];
  selectedBranchId: string;
  settings: { bookingGraceMins: number; reminderBeforeMins: number };
  kpis: {
    totalSeats: number;
    available: number;
    booked: number;
    occupied: number;
    activeInHouseIssues: number;
    seatUtilizationRate: number;
  };
  floorPlan: FloorPlanSeat[];
  currentOccupancy: SeatBookingRow[];
  dailyBookings: SeatBookingRow[];
  activeInHouseTxns: InHouseTxnRow[];
  referenceBooks: { id: string; bookCode: string; title: string; author: string }[];
  reports: {
    seatUtilizationRate: number;
    mostConsultedBooks: { bookCode: string; title: string; consultations: number }[];
  };
  automationRules: string[];
  notifications: string[];
  mobileSync: string[];
  roles: string[];
  validationRules: string[];
};

export async function fetchLibraryReadingRoom(seed?: boolean, academicYear?: string, branchId?: string) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  if (academicYear) params.set('academicYear', academicYear);
  if (branchId) params.set('branchId', branchId);
  const qs = params.toString() ? `?${params}` : '';
  return api<LibraryReadingRoom>(`/api/library/reading-room${qs}`);
}

export async function bookReadingSeat(payload: {
  seatId: string;
  memberCode: string;
  startTime: string;
  endTime: string;
  academicYear?: string;
  performedBy?: string;
}) {
  return api<{ success: boolean; message: string; data: LibraryReadingRoom }>(
    '/api/library/reading-room/book',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function occupyReadingSeat(payload: {
  bookingId?: string;
  seatId?: string;
  memberCode?: string;
  performedBy?: string;
}) {
  return api<{ success: boolean; message: string; data: LibraryReadingRoom }>(
    '/api/library/reading-room/occupy',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function vacateReadingSeat(payload: {
  bookingId?: string;
  seatId?: string;
  memberCode?: string;
}) {
  return api<{ success: boolean; message: string; data: LibraryReadingRoom }>(
    '/api/library/reading-room/vacate',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function issueInHouseBook(payload: {
  memberCode: string;
  bookCode: string;
  seatId?: string;
  academicYear?: string;
  issuedBy?: string;
}) {
  return api<{ success: boolean; message: string; data: LibraryReadingRoom }>(
    '/api/library/reading-room/issue',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function returnInHouseBook(payload: {
  txnId?: string;
  memberCode?: string;
  bookCode?: string;
  returnedBy?: string;
}) {
  return api<{ success: boolean; message: string; data: LibraryReadingRoom }>(
    '/api/library/reading-room/return',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

// ─── E-Resources ────────────────────────────────────────────────────

export type EResourceRow = {
  id: string;
  resourceCode: string;
  title: string;
  description: string;
  author: string;
  format: string;
  accessLevel: string;
  source: string;
  resourceType: string;
  externalUrl: string;
  fileName: string;
  fileSizeFormatted: string;
  fileSizeBytes: number;
  mimeType: string;
  storageProvider: string;
  drmEnabled: boolean;
  expiryDate: string | null;
  status: string;
  visibleInOpac: boolean;
  viewCount: number;
  downloadCount: number;
  bandwidthFormatted: string;
  syllabusLinked: boolean;
  lessonPlanId: string | null;
  accessClasses: string[];
  accessRoles: string[];
  subjectTags: string[];
  academicYear: string;
  uploadedBy: string;
  uploadedAt: string;
};

export type LibraryEResources = {
  academicYear: string;
  academicYears: string[];
  branches: { id: string; code: string; name: string }[];
  selectedBranchId: string;
  settings: { maxUploadMb: number; allowedFormats: string[]; drmDefault: boolean };
  kpis: {
    totalResources: number;
    activeInOpac: number;
    expired: number;
    totalViews: number;
    totalDownloads: number;
    monthlyBandwidth: string;
  };
  resources: EResourceRow[];
  opacCatalog: EResourceRow[];
  accessMatrix: { className: string; resources: string[] }[];
  accessLevels: string[];
  sources: string[];
  resourceTypes: string[];
  recentAccessLogs: {
    id: string;
    resourceTitle: string;
    resourceCode: string;
    memberName: string;
    className: string;
    accessType: string;
    deviceType: string;
    bytesFormatted: string;
    accessedAt: string;
  }[];
  reports: {
    mostViewed: { title: string; resourceCode: string; views: number; downloads: number }[];
    bandwidthUsage: { totalBytes: number; totalFormatted: string; views: number; downloads: number };
    subscriptionRoi: { activeSubscriptions: number; totalSubscriptions: number; totalViews: number; estimatedValue: string };
  };
  automationRules: string[];
  validationRules: string[];
  notifications: string[];
  mobileSync: string[];
  erpIntegration: { dms: string; academic: string };
  roles: string[];
};

export type EResourceReader = {
  resource: EResourceRow;
  viewer: {
    url: string;
    format: string;
    drmEnabled: boolean;
    allowDownload: boolean;
    preventScreenCapture: boolean;
    watermark: string | null;
    message: string;
  };
};

export async function fetchLibraryEResources(seed?: boolean, academicYear?: string, branchId?: string, opacOnly?: boolean) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  if (academicYear) params.set('academicYear', academicYear);
  if (branchId) params.set('branchId', branchId);
  if (opacOnly) params.set('opac', '1');
  const qs = params.toString() ? `?${params}` : '';
  return api<LibraryEResources>(`/api/library/e-resources${qs}`);
}

export async function createEResource(payload: Record<string, unknown>) {
  return api<{ success: boolean; message: string; data: LibraryEResources }>(
    '/api/library/e-resources',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function updateEResourceAccess(resourceId: string, payload: {
  accessLevel?: string;
  accessClasses?: string[];
  accessRoles?: string[];
}) {
  return api<{ success: boolean; message: string; data: LibraryEResources }>(
    `/api/library/e-resources/${resourceId}/access`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  );
}

export async function updateEResourceUrl(resourceId: string, payload: {
  externalUrl: string;
  expiryDate?: string;
  source?: string;
}) {
  return api<{ success: boolean; message: string; data: LibraryEResources }>(
    `/api/library/e-resources/${resourceId}/url`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  );
}

export async function deleteEResource(resourceId: string) {
  return api<{ success: boolean; message: string; data: LibraryEResources }>(
    `/api/library/e-resources/${resourceId}`,
    { method: 'DELETE' },
  );
}

export async function openEResourceReader(resourceId: string, memberCode?: string) {
  const qs = memberCode ? `?memberCode=${encodeURIComponent(memberCode)}` : '';
  return api<EResourceReader>(`/api/library/e-resources/${resourceId}/reader${qs}`);
}

export async function recordEResourceAccess(resourceId: string, payload: {
  accessType: 'VIEW' | 'DOWNLOAD' | 'STREAM';
  memberCode?: string;
  memberName?: string;
  className?: string;
  deviceType?: string;
}) {
  return api<{ success: boolean; message: string; data: LibraryEResources }>(
    `/api/library/e-resources/${resourceId}/access-log`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

// ─── Reports & Analytics ────────────────────────────────────────────

export type ReportPreview = {
  templateId: string;
  reportName: string;
  description: string;
  columns: string[];
  rows: Record<string, string | number>[];
  summary: Record<string, string | number>;
  filters: Record<string, string | undefined>;
  generatedAt: string;
  rowCount: number;
};

export type LibraryReportsAnalytics = {
  academicYear: string;
  academicYears: string[];
  branches: { id: string; code: string; name: string }[];
  selectedBranchId: string;
  categories: { id: string; name: string; code: string }[];
  memberTypes: string[];
  reportTree: {
    operational: { label: string; compliance: string[]; reports: { id: string; name: string; description: string }[] };
    analytical: { label: string; reports: { id: string; name: string; description: string }[] };
    exception: { label: string; reports: { id: string; name: string; description: string }[] };
  };
  exportFormats: string[];
  defaultFilters: Record<string, string | undefined>;
  dashboardChartSource: Record<string, string | number>[];
  schedules: {
    id: string;
    reportTemplate: string;
    reportName: string;
    frequency: string;
    channel: string;
    recipients: string;
    cronExpr: string;
    branchId: string;
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
  validationRules: string[];
  notifications: string[];
  mobileSync: string[];
  erpIntegration: string;
  complianceBodies: string[];
  dragDropBuilder: { enabled: boolean; availableFields: string[]; message: string };
  kpis: {
    reportsGenerated: number;
    activeSchedules: number;
    complianceRegisters: number;
    analyticalReports: number;
  };
};

export async function fetchLibraryReportsAnalytics(seed?: boolean, academicYear?: string, branchId?: string) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  if (academicYear) params.set('academicYear', academicYear);
  if (branchId) params.set('branchId', branchId);
  const qs = params.toString() ? `?${params}` : '';
  return api<LibraryReportsAnalytics>(`/api/library/reports${qs}`);
}

export async function generateLibraryReport(templateId: string, filters: Record<string, unknown>) {
  return api<ReportPreview>('/api/library/reports/generate', {
    method: 'POST',
    body: JSON.stringify({ templateId, filters }),
  });
}

export async function exportLibraryReport(templateId: string, format: string, filters: Record<string, unknown>) {
  return api<{ success: boolean; message: string; fileName: string; format: string; rowCount: number; preview: ReportPreview }>(
    '/api/library/reports/export',
    { method: 'POST', body: JSON.stringify({ templateId, format, filters }) },
  );
}

export async function scheduleLibraryReport(payload: {
  reportTemplate: string;
  reportName: string;
  frequency?: string;
  channel?: string;
  recipients: string;
  branchId?: string;
  filters?: Record<string, unknown>;
}) {
  return api<{ success: boolean; message: string; data: LibraryReportsAnalytics }>(
    '/api/library/reports/schedule',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function deleteLibraryReportSchedule(scheduleId: string) {
  return api<{ success: boolean; data: LibraryReportsAnalytics }>(
    `/api/library/reports/schedule/${scheduleId}`,
    { method: 'DELETE' },
  );
}
