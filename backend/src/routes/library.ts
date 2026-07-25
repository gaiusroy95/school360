import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import {
  getLibraryDashboard,
  seedLibraryDashboard,
  sendBulkOverdueReminders,
} from '../lib/libraryDashboard.js';
import {
  getBookCatalogue,
  getBookCatalogueDetail,
  reserveBook,
  seedBookCatalogue,
} from '../lib/libraryCatalogue.js';
import {
  getBookIssueReturn,
  issueBook,
  lookupBook,
  lookupMember,
  returnBook,
  seedLibraryCirculation,
} from '../lib/libraryCirculation.js';
import {
  deleteLibraryMember,
  getLibraryMemberDetail,
  getLibraryMembers,
  issueLibraryCard,
  seedLibraryMembers,
  syncErpMembers,
  updateMemberCategory,
} from '../lib/libraryMembers.js';
import {
  addCopiesToBook,
  createBookWithCopies,
  deleteBookTitle,
  fetchIsbnMetadata,
  getBookManagement,
  markBarcodesPrinted,
  seedBookManagement,
} from '../lib/libraryBookManagement.js';
import {
  createCategory,
  createLibSubject,
  deleteCategory,
  deleteLibSubject,
  getCategoriesSubjects,
  reorderCategory,
  seedCategoriesSubjects,
  updateCategory,
} from '../lib/libraryCategories.js';
import {
  assignBooksToShelf,
  bulkAssignByCategory,
  createLocation,
  createRack,
  createShelf,
  deleteLocation,
  deleteRack,
  deleteShelf,
  getRackManagement,
  seedRackManagement,
  setCategoryDefaultRack,
  suggestRackForCategory,
  updateLocation,
  updateRack,
  updateShelf,
} from '../lib/libraryRacks.js';
import {
  closeAuditSession,
  createAuditSession,
  getStockVerification,
  reconcileAuditSession,
  resolveAuditDiscrepancy,
  scanAuditBook,
  seedStockVerification,
} from '../lib/libraryStockVerification.js';
import {
  accrueDailyFines,
  approveFineWaiver,
  collectFinePayment,
  getFineManagement,
  getPaymentReceipt,
  requestFineWaiver,
  seedFineManagement,
} from '../lib/libraryFines.js';
import {
  autoCloseGateSessions,
  gateScanEntry,
  gateScanExit,
  generateGateQrToken,
  getLibraryGateAttendance,
  manualGateOverride,
  seedLibraryGateAttendance,
} from '../lib/libraryGateAttendance.js';
import {
  bookReadingSeat,
  getLibraryReadingRoom,
  issueInHouseBook,
  occupyReadingSeat,
  returnInHouseBook,
  seedLibraryReadingRoom,
  vacateReadingSeat,
} from '../lib/libraryReadingRoom.js';
import {
  createEResource,
  deleteEResource,
  getEResourceStream,
  getLibraryEResources,
  openEResourceReader,
  recordEResourceAccess,
  seedLibraryEResources,
  updateEResourceAccess,
  updateEResourceUrl,
} from '../lib/libraryEResources.js';
import {
  deleteLibraryReportSchedule,
  exportLibraryReport,
  generateLibraryReport,
  getLibraryReportsAnalytics,
  scheduleLibraryReport,
  seedLibraryReportsAnalytics,
} from '../lib/libraryReportsAnalytics.js';

export const libraryRouter = Router();
libraryRouter.use(requireAuth);

libraryRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
    const data = await getLibraryDashboard(institutionId, academicYear, branchId);
    return res.json(data);
  }),
);

libraryRouter.post(
  '/dashboard/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedLibraryDashboard(institutionId);
    return res.json(data);
  }),
);

libraryRouter.post(
  '/dashboard/bulk-reminders',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.body?.academicYear ?? req.query.academicYear ?? '2025-26');
    const branchId = req.body?.branchId ?? req.query.branchId;
    const result = await sendBulkOverdueReminders(
      institutionId,
      academicYear,
      branchId ? String(branchId) : undefined,
    );
    return res.json(result);
  }),
);

// ─── Book Catalogue (OPAC) ─────────────────────────────────────────────

libraryRouter.get(
  '/catalogue',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 12);
    const data = await getBookCatalogue(
      institutionId,
      {
        q: req.query.q ? String(req.query.q) : undefined,
        categoryId: req.query.categoryId ? String(req.query.categoryId) : undefined,
        branchId: req.query.branchId ? String(req.query.branchId) : undefined,
        availability: req.query.availability ? String(req.query.availability) : undefined,
        resourceType: req.query.resourceType ? String(req.query.resourceType) : undefined,
        author: req.query.author ? String(req.query.author) : undefined,
        publisher: req.query.publisher ? String(req.query.publisher) : undefined,
        tag: req.query.tag ? String(req.query.tag) : undefined,
        academicYear: req.query.academicYear ? String(req.query.academicYear) : undefined,
      },
      page,
      pageSize,
    );
    return res.json(data);
  }),
);

libraryRouter.get(
  '/catalogue/:bookId',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getBookCatalogueDetail(institutionId, String(req.params.bookId));
    return res.json(data);
  }),
);

libraryRouter.post(
  '/catalogue/:bookId/reserve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const memberId = String(req.body?.memberId ?? '');
    const academicYear = String(req.body?.academicYear ?? '2025-26');
    if (!memberId) return res.status(400).json({ error: 'memberId is required' });
    try {
      const result = await reserveBook(institutionId, String(req.params.bookId), memberId, academicYear);
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Reservation failed' });
    }
  }),
);

libraryRouter.post(
  '/catalogue/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedBookCatalogue(institutionId);
    return res.json(data);
  }),
);

// ─── Book Issue / Return (Circulation) ───────────────────────────────────

libraryRouter.get(
  '/circulation',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
    const data = await getBookIssueReturn(institutionId, academicYear, branchId);
    return res.json(data);
  }),
);

libraryRouter.get(
  '/circulation/member/:code',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const member = await lookupMember(institutionId, String(req.params.code));
    if (!member) return res.status(404).json({ error: 'Member not found' });
    return res.json(member);
  }),
);

libraryRouter.get(
  '/circulation/book/:barcode',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const book = await lookupBook(institutionId, String(req.params.barcode));
    if (!book) return res.status(404).json({ error: 'Book not found' });
    return res.json(book);
  }),
);

libraryRouter.post(
  '/circulation/issue',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const memberCode = String(req.body?.memberCode ?? '');
    const accessionNo = String(req.body?.accessionNo ?? '');
    const academicYear = String(req.body?.academicYear ?? '2025-26');
    const performedBy = String(req.body?.performedBy ?? 'Librarian');
    if (!memberCode || !accessionNo) {
      return res.status(400).json({ error: 'memberCode and accessionNo are required' });
    }
    try {
      const result = await issueBook(institutionId, memberCode, accessionNo, academicYear, performedBy);
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Issue failed' });
    }
  }),
);

libraryRouter.post(
  '/circulation/return',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const accessionNo = String(req.body?.accessionNo ?? '');
    const academicYear = String(req.body?.academicYear ?? '2025-26');
    const performedBy = String(req.body?.performedBy ?? 'Librarian');
    if (!accessionNo) return res.status(400).json({ error: 'accessionNo is required' });
    try {
      const result = await returnBook(institutionId, accessionNo, academicYear, performedBy);
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Return failed' });
    }
  }),
);

libraryRouter.post(
  '/circulation/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedLibraryCirculation(institutionId);
    return res.json(data);
  }),
);

// ─── Members ────────────────────────────────────────────────────────────

libraryRouter.get(
  '/members',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const data = await getLibraryMembers(institutionId, academicYear, {
      q: req.query.q ? String(req.query.q) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      memberType: req.query.memberType ? String(req.query.memberType) : undefined,
      categoryId: req.query.categoryId ? String(req.query.categoryId) : undefined,
      branchId: req.query.branchId ? String(req.query.branchId) : undefined,
    });
    return res.json(data);
  }),
);

libraryRouter.get(
  '/members/:memberId',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getLibraryMemberDetail(institutionId, String(req.params.memberId));
    return res.json(data);
  }),
);

libraryRouter.post(
  '/members/sync-erp',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.body?.academicYear ?? req.query.academicYear ?? '2025-26');
    const result = await syncErpMembers(institutionId, academicYear);
    const data = await getLibraryMembers(institutionId, academicYear);
    return res.json({ ...result, ...data });
  }),
);

libraryRouter.patch(
  '/members/:memberId/category',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const categoryId = String(req.body?.categoryId ?? '');
    if (!categoryId) return res.status(400).json({ error: 'categoryId is required' });
    try {
      const data = await updateMemberCategory(institutionId, String(req.params.memberId), categoryId);
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Update failed' });
    }
  }),
);

libraryRouter.post(
  '/members/:memberId/issue-card',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const cardType = (req.body?.cardType === 'PHYSICAL' ? 'PHYSICAL' : 'VIRTUAL') as 'VIRTUAL' | 'PHYSICAL';
    const barcodeUid = req.body?.barcodeUid ? String(req.body.barcodeUid) : undefined;
    try {
      const data = await issueLibraryCard(institutionId, String(req.params.memberId), cardType, barcodeUid);
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Card issue failed' });
    }
  }),
);

libraryRouter.delete(
  '/members/:memberId',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await deleteLibraryMember(institutionId, String(req.params.memberId));
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Delete failed' });
    }
  }),
);

libraryRouter.post(
  '/members/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedLibraryMembers(institutionId);
    return res.json(data);
  }),
);

// ─── Add / Manage Books ─────────────────────────────────────────────────

libraryRouter.get(
  '/books',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const data = await getBookManagement(institutionId, academicYear, {
      q: req.query.q ? String(req.query.q) : undefined,
      categoryId: req.query.categoryId ? String(req.query.categoryId) : undefined,
      branchId: req.query.branchId ? String(req.query.branchId) : undefined,
    });
    return res.json(data);
  }),
);

libraryRouter.get(
  '/books/isbn/:isbn',
  asyncHandler(async (req, res) => {
    const data = await fetchIsbnMetadata(String(req.params.isbn));
    return res.json(data);
  }),
);

libraryRouter.post(
  '/books',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await createBookWithCopies(institutionId, req.body);
      const data = await getBookManagement(institutionId, String(req.body?.academicYear ?? '2025-26'));
      return res.json({ ...result, ...data });
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Create failed' });
    }
  }),
);

libraryRouter.post(
  '/books/:bookId/copies',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const copyCount = Number(req.body?.copyCount ?? 1);
    const rackLocation = req.body?.rackLocation ? String(req.body.rackLocation) : undefined;
    const condition = req.body?.condition ? String(req.body.condition) : undefined;
    try {
      const result = await addCopiesToBook(institutionId, String(req.params.bookId), copyCount, rackLocation, condition);
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Add copies failed' });
    }
  }),
);

libraryRouter.post(
  '/books/barcodes/print',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const copyIds = Array.isArray(req.body?.copyIds) ? req.body.copyIds.map(String) : [];
    if (!copyIds.length) return res.status(400).json({ error: 'copyIds required' });
    const result = await markBarcodesPrinted(institutionId, copyIds);
    return res.json(result);
  }),
);

libraryRouter.delete(
  '/books/:bookId',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await deleteBookTitle(institutionId, String(req.params.bookId));
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Delete failed' });
    }
  }),
);

libraryRouter.post(
  '/books/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedBookManagement(institutionId);
    return res.json(data);
  }),
);

// ─── Categories & Subjects ──────────────────────────────────────────────

libraryRouter.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const data = await getCategoriesSubjects(institutionId, academicYear);
    return res.json(data);
  }),
);

libraryRouter.post(
  '/categories',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      await createCategory(institutionId, req.body);
      const data = await getCategoriesSubjects(institutionId);
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Create failed' });
    }
  }),
);

libraryRouter.patch(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const data = await updateCategory(institutionId, String(req.params.id), req.body);
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Update failed' });
    }
  }),
);

libraryRouter.delete(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      await deleteCategory(institutionId, String(req.params.id));
      const data = await getCategoriesSubjects(institutionId);
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Delete failed' });
    }
  }),
);

libraryRouter.post(
  '/categories/reorder',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { categoryId, parentId, sortOrder } = req.body;
    const data = await reorderCategory(
      institutionId,
      String(categoryId),
      parentId ?? null,
      Number(sortOrder ?? 0),
    );
    return res.json(data);
  }),
);

libraryRouter.post(
  '/categories/subjects',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      await createLibSubject(institutionId, req.body);
      const data = await getCategoriesSubjects(institutionId);
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Create subject failed' });
    }
  }),
);

libraryRouter.delete(
  '/categories/subjects/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await deleteLibSubject(institutionId, String(req.params.id));
    const data = await getCategoriesSubjects(institutionId);
    return res.json(data);
  }),
);

// ─── Rack Management ──────────────────────────────────────────────────

libraryRouter.get(
  '/racks',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getRackManagement(institutionId);
    return res.json(data);
  }),
);

libraryRouter.post(
  '/racks/locations',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      await createLocation(institutionId, req.body);
      const data = await getRackManagement(institutionId);
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Create location failed' });
    }
  }),
);

libraryRouter.patch(
  '/racks/locations/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const data = await updateLocation(institutionId, String(req.params.id), req.body);
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Update location failed' });
    }
  }),
);

libraryRouter.delete(
  '/racks/locations/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      await deleteLocation(institutionId, String(req.params.id));
      const data = await getRackManagement(institutionId);
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Delete location failed' });
    }
  }),
);

libraryRouter.post(
  '/racks',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      await createRack(institutionId, req.body);
      const data = await getRackManagement(institutionId);
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Create rack failed' });
    }
  }),
);

libraryRouter.patch(
  '/racks/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const data = await updateRack(institutionId, String(req.params.id), req.body);
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Update rack failed' });
    }
  }),
);

libraryRouter.delete(
  '/racks/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      await deleteRack(institutionId, String(req.params.id));
      const data = await getRackManagement(institutionId);
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Delete rack failed' });
    }
  }),
);

libraryRouter.post(
  '/racks/shelves',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      await createShelf(institutionId, req.body);
      const data = await getRackManagement(institutionId);
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Create shelf failed' });
    }
  }),
);

libraryRouter.patch(
  '/racks/shelves/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const data = await updateShelf(institutionId, String(req.params.id), req.body);
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Update shelf failed' });
    }
  }),
);

libraryRouter.delete(
  '/racks/shelves/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      await deleteShelf(institutionId, String(req.params.id));
      const data = await getRackManagement(institutionId);
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Delete shelf failed' });
    }
  }),
);

libraryRouter.post(
  '/racks/assign',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { copyIds, shelfId, force } = req.body;
    try {
      const result = await assignBooksToShelf(
        institutionId,
        Array.isArray(copyIds) ? copyIds.map(String) : [],
        String(shelfId),
        Boolean(force),
      );
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Assign failed' });
    }
  }),
);

libraryRouter.post(
  '/racks/bulk-assign',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { categoryId, shelfId, force } = req.body;
    try {
      const result = await bulkAssignByCategory(
        institutionId,
        String(categoryId),
        shelfId ? String(shelfId) : '',
        Boolean(force),
      );
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Bulk assign failed' });
    }
  }),
);

libraryRouter.post(
  '/racks/category-default',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { categoryId, rackId } = req.body;
    const data = await setCategoryDefaultRack(institutionId, String(categoryId), rackId ?? null);
    const racks = await getRackManagement(institutionId);
    return res.json({ ...data, ...racks });
  }),
);

libraryRouter.get(
  '/racks/suggest/:categoryId',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const data = await suggestRackForCategory(institutionId, String(req.params.categoryId));
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Suggestion failed' });
    }
  }),
);

// ─── Stock Verification ───────────────────────────────────────────────

libraryRouter.get(
  '/stock-verification',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const sessionId = req.query.sessionId ? String(req.query.sessionId) : undefined;
    const data = await getStockVerification(institutionId, sessionId);
    return res.json(data);
  }),
);

libraryRouter.post(
  '/stock-verification/sessions',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const data = await createAuditSession(institutionId, req.body);
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Create session failed' });
    }
  }),
);

libraryRouter.post(
  '/stock-verification/sessions/:id/scan',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { accessionNo, scannedBy, scanMethod, markDamaged } = req.body;
    try {
      const result = await scanAuditBook(
        institutionId,
        String(req.params.id),
        String(accessionNo),
        String(scannedBy ?? 'Librarian'),
        scanMethod ?? 'BARCODE',
        Boolean(markDamaged),
      );
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Scan failed' });
    }
  }),
);

libraryRouter.post(
  '/stock-verification/sessions/:id/reconcile',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const scannedBy = String(req.body?.scannedBy ?? 'Librarian');
    try {
      const data = await reconcileAuditSession(institutionId, String(req.params.id), scannedBy);
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Reconcile failed' });
    }
  }),
);

libraryRouter.post(
  '/stock-verification/scans/:id/resolve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { resolution, resolvedBy, notes } = req.body;
    try {
      const data = await resolveAuditDiscrepancy(
        institutionId,
        String(req.params.id),
        resolution,
        String(resolvedBy ?? 'Librarian'),
        notes ?? '',
      );
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Resolve failed' });
    }
  }),
);

libraryRouter.post(
  '/stock-verification/sessions/:id/close',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await closeAuditSession(
        institutionId,
        String(req.params.id),
        String(req.body?.closedBy ?? 'Librarian'),
      );
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Close failed' });
    }
  }),
);

// ─── Fine Management ──────────────────────────────────────────────────

libraryRouter.get(
  '/fines',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const memberId = req.query.memberId ? String(req.query.memberId) : undefined;
    const data = await getFineManagement(institutionId, memberId);
    return res.json(data);
  }),
);

libraryRouter.post(
  '/fines/accrue',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await accrueDailyFines(institutionId);
    const data = await getFineManagement(institutionId);
    return res.json({ ...result, data });
  }),
);

libraryRouter.post(
  '/fines/payments',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await collectFinePayment(institutionId, req.body);
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Payment failed' });
    }
  }),
);

libraryRouter.get(
  '/fines/payments/:id/receipt',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const data = await getPaymentReceipt(institutionId, String(req.params.id));
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Receipt not found' });
    }
  }),
);

libraryRouter.post(
  '/fines/waivers',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await requestFineWaiver(institutionId, req.body);
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Waiver request failed' });
    }
  }),
);

libraryRouter.post(
  '/fines/waivers/:id/approve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { approvedBy, approve } = req.body;
    try {
      const result = await approveFineWaiver(
        institutionId,
        String(req.params.id),
        String(approvedBy ?? 'Principal'),
        approve !== false,
      );
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Approval failed' });
    }
  }),
);

// ─── Library Attendance (Gate) ────────────────────────────────────────

libraryRouter.get(
  '/attendance',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
    const data = await getLibraryGateAttendance(institutionId, academicYear, branchId);
    return res.json(data);
  }),
);

libraryRouter.post(
  '/attendance/scan-in',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { memberCode, terminalId, scanMethod, academicYear, performedBy } = req.body;
    try {
      const result = await gateScanEntry(
        institutionId,
        String(memberCode),
        terminalId ? String(terminalId) : 'GATE-01',
        scanMethod ?? 'BARCODE',
        academicYear ?? '2025-26',
        performedBy ? String(performedBy) : '',
      );
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Entry scan failed' });
    }
  }),
);

libraryRouter.post(
  '/attendance/scan-out',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { memberCode, terminalId, scanMethod, academicYear } = req.body;
    try {
      const result = await gateScanExit(
        institutionId,
        String(memberCode),
        terminalId ? String(terminalId) : 'GATE-01',
        scanMethod ?? 'BARCODE',
        academicYear ?? '2025-26',
      );
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Exit scan failed' });
    }
  }),
);

libraryRouter.post(
  '/attendance/manual',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await manualGateOverride(institutionId, req.body);
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Manual override failed' });
    }
  }),
);

libraryRouter.post(
  '/attendance/auto-close',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await autoCloseGateSessions(institutionId);
    const data = await getLibraryGateAttendance(institutionId);
    return res.json({ ...result, data });
  }),
);

libraryRouter.get(
  '/attendance/qr/:memberId',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const data = await generateGateQrToken(institutionId, String(req.params.memberId));
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'QR generation failed' });
    }
  }),
);

// ─── Reading Room ─────────────────────────────────────────────────────

libraryRouter.get(
  '/reading-room',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
    const data = await getLibraryReadingRoom(institutionId, academicYear, branchId);
    return res.json(data);
  }),
);

libraryRouter.post(
  '/reading-room/book',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await bookReadingSeat(institutionId, req.body);
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Seat booking failed' });
    }
  }),
);

libraryRouter.post(
  '/reading-room/occupy',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await occupyReadingSeat(institutionId, req.body);
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Occupy failed' });
    }
  }),
);

libraryRouter.post(
  '/reading-room/vacate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await vacateReadingSeat(institutionId, req.body);
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Vacate failed' });
    }
  }),
);

libraryRouter.post(
  '/reading-room/issue',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await issueInHouseBook(institutionId, req.body);
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'In-house issue failed' });
    }
  }),
);

libraryRouter.post(
  '/reading-room/return',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await returnInHouseBook(institutionId, req.body);
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'In-house return failed' });
    }
  }),
);

// ─── E-Resources ──────────────────────────────────────────────────────

libraryRouter.get(
  '/e-resources',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
    const opacOnly = req.query.opac === '1';
    const data = await getLibraryEResources(institutionId, academicYear, branchId, opacOnly);
    return res.json(data);
  }),
);

libraryRouter.post(
  '/e-resources',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await createEResource(institutionId, req.body);
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Create failed' });
    }
  }),
);

libraryRouter.patch(
  '/e-resources/:id/access',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await updateEResourceAccess(institutionId, String(req.params.id), req.body);
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Access update failed' });
    }
  }),
);

libraryRouter.patch(
  '/e-resources/:id/url',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await updateEResourceUrl(institutionId, String(req.params.id), req.body);
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'URL update failed' });
    }
  }),
);

libraryRouter.delete(
  '/e-resources/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await deleteEResource(institutionId, String(req.params.id));
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Delete failed' });
    }
  }),
);

libraryRouter.post(
  '/e-resources/:id/access-log',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await recordEResourceAccess(institutionId, { resourceId: String(req.params.id), ...req.body });
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Access log failed' });
    }
  }),
);

libraryRouter.get(
  '/e-resources/:id/reader',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const memberCode = req.query.memberCode ? String(req.query.memberCode) : undefined;
      const data = await openEResourceReader(institutionId, String(req.params.id), memberCode);
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Reader open failed' });
    }
  }),
);

libraryRouter.get(
  '/e-resources/:id/stream',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const { buffer, mimeType, fileName } = await getEResourceStream(institutionId, String(req.params.id));
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      res.setHeader('X-DRM-Protected', 'true');
      return res.send(buffer);
    } catch (e) {
      return res.status(404).json({ error: e instanceof Error ? e.message : 'Stream failed' });
    }
  }),
);

// ─── Reports & Analytics ──────────────────────────────────────────────

libraryRouter.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
    const userRole = String(req.query.role ?? 'Librarian');
    const data = await getLibraryReportsAnalytics(institutionId, academicYear, branchId, userRole);
    return res.json(data);
  }),
);

libraryRouter.post(
  '/reports/generate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const { templateId, filters, role } = req.body;
      const result = await generateLibraryReport(
        institutionId,
        String(templateId),
        filters ?? {},
        role ?? 'Librarian',
      );
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Report generation failed' });
    }
  }),
);

libraryRouter.post(
  '/reports/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const { templateId, format, filters, performedBy } = req.body;
      const result = await exportLibraryReport(
        institutionId,
        String(templateId),
        format ?? 'PDF',
        filters ?? {},
        performedBy ?? 'Librarian',
      );
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Export failed' });
    }
  }),
);

libraryRouter.post(
  '/reports/schedule',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await scheduleLibraryReport(institutionId, req.body);
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Schedule failed' });
    }
  }),
);

libraryRouter.delete(
  '/reports/schedule/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await deleteLibraryReportSchedule(institutionId, String(req.params.id));
    return res.json(result);
  }),
);
