import { prisma } from './prisma.js';
import { formatLocationLabel, seedRackManagement } from './libraryRacks.js';

const HIGH_LOSS_THRESHOLD = 5000;
const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];

async function logActivity(institutionId: string, action: string, details: string, entityId = '') {
  await prisma.libActivityLog.create({
    data: { institutionId, entityType: 'LibAuditSession', entityId, action, details, performedBy: 'Librarian' },
  });
}

function formatInr(amount: number) {
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

async function nextAuditCode(institutionId: string) {
  const count = await prisma.libAuditSession.count({ where: { institutionId } });
  const year = new Date().getFullYear();
  return `AUD-${year}-${String(count + 1).padStart(4, '0')}`;
}

async function getTargetLabel(
  institutionId: string,
  rackId?: string | null,
  shelfId?: string | null,
  branchId?: string | null,
) {
  if (shelfId) {
    const shelf = await prisma.libShelf.findFirst({
      where: { institutionId, id: shelfId },
      include: { rack: { include: { location: { include: { parent: true, branch: true } } } } },
    });
    if (shelf) {
      const aisle = shelf.rack.location;
      return formatLocationLabel({
        floorName: aisle.parent?.locationName,
        aisleName: aisle.locationName,
        rackNumber: shelf.rack.rackNumber,
        shelfNumber: shelf.shelfNumber,
      });
    }
  }
  if (rackId) {
    const rack = await prisma.libRack.findFirst({
      where: { institutionId, id: rackId },
      include: { location: { include: { parent: true, branch: true } } },
    });
    if (rack) {
      const aisle = rack.location;
      return formatLocationLabel({
        floorName: aisle.parent?.locationName,
        aisleName: aisle.locationName,
        rackNumber: rack.rackNumber,
      });
    }
  }
  if (branchId) {
    const branch = await prisma.libBranch.findFirst({ where: { institutionId, id: branchId } });
    return branch ? `${branch.branchName} (Full Branch)` : 'Full Library';
  }
  return 'Full Library';
}

async function getExpectedCopies(
  institutionId: string,
  session: { shelfId: string | null; rackId: string | null; branchId: string | null },
) {
  if (session.shelfId) {
    return prisma.libBookCopy.findMany({
      where: { institutionId, shelfId: session.shelfId, status: { not: 'LOST' } },
      include: {
        book: { select: { title: true } },
        shelf: { include: { rack: { include: { location: { include: { parent: true } } } } } },
      },
    });
  }
  if (session.rackId) {
    return prisma.libBookCopy.findMany({
      where: {
        institutionId,
        status: { not: 'LOST' },
        shelf: { rackId: session.rackId },
      },
      include: {
        book: { select: { title: true } },
        shelf: { include: { rack: { include: { location: { include: { parent: true } } } } } },
      },
    });
  }
  if (session.branchId) {
    return prisma.libBookCopy.findMany({
      where: {
        institutionId,
        status: { not: 'LOST' },
        book: { branchId: session.branchId },
      },
      include: {
        book: { select: { title: true } },
        shelf: { include: { rack: { include: { location: { include: { parent: true } } } } } },
      },
    });
  }
  return prisma.libBookCopy.findMany({
    where: { institutionId, status: { not: 'LOST' } },
    include: {
      book: { select: { title: true } },
      shelf: { include: { rack: { include: { location: { include: { parent: true } } } } } },
    },
    take: 500,
  });
}

function copyLocationLabel(copy: {
  rackLocation: string;
  shelf?: {
    shelfNumber: string;
    rack: { rackNumber: string; location: { locationName: string; parent?: { locationName: string } | null } };
  } | null;
}) {
  if (copy.shelf) {
    const aisle = copy.shelf.rack.location;
    return formatLocationLabel({
      floorName: aisle.parent?.locationName,
      aisleName: aisle.locationName,
      rackNumber: copy.shelf.rack.rackNumber,
      shelfNumber: copy.shelf.shelfNumber,
    });
  }
  return copy.rackLocation || 'Unassigned';
}

function mapScanRow(s: {
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
  scannedBy: string;
  resolvedBy: string;
  resolvedAt: Date | null;
  scannedAt: Date;
}) {
  return {
    id: s.id,
    accessionNo: s.accessionNo,
    copyId: s.copyId,
    bookTitle: s.bookTitle,
    scanMethod: s.scanMethod,
    discrepancyType: s.discrepancyType,
    resolution: s.resolution,
    resolutionNotes: s.resolutionNotes,
    expectedLocation: s.expectedLocation,
    scannedLocation: s.scannedLocation,
    issueStatus: s.issueStatus,
    purchasePrice: s.purchasePrice,
    purchasePriceFormatted: formatInr(s.purchasePrice),
    scannedBy: s.scannedBy,
    resolvedBy: s.resolvedBy,
    resolvedAt: s.resolvedAt?.toISOString() ?? null,
    scannedAt: s.scannedAt.toISOString(),
  };
}

async function refreshSessionStats(institutionId: string, sessionId: string) {
  const session = await prisma.libAuditSession.findFirst({ where: { institutionId, id: sessionId } });
  if (!session) return;

  const scans = await prisma.libAuditScan.findMany({ where: { sessionId } });
  const physicalScans = scans.filter((s) => s.discrepancyType !== 'MISSING');
  const missingCount = scans.filter((s) => s.discrepancyType === 'MISSING').length;
  const misplacedCount = scans.filter((s) => s.discrepancyType === 'MISPLACED').length;
  const extraCount = scans.filter((s) => s.discrepancyType === 'EXTRA').length;
  const damagedCount = scans.filter((s) => s.discrepancyType === 'DAMAGED').length;
  const returnedUnrecordedCount = scans.filter((s) => s.discrepancyType === 'RETURNED_UNRECORDED').length;
  const physicalCount = physicalScans.length;
  const variance = physicalCount - session.systemCount;
  const pendingDiscrepancies = scans.filter(
    (s) => s.discrepancyType !== 'NONE' && s.resolution === 'PENDING',
  ).length;

  await prisma.libAuditSession.update({
    where: { id: sessionId },
    data: {
      physicalCount,
      variance,
      missingCount,
      misplacedCount,
      extraCount,
      damagedCount,
      returnedUnrecordedCount,
    },
  });

  return { pendingDiscrepancies, physicalCount, variance };
}

async function reconcileMissing(institutionId: string, sessionId: string, scannedBy: string) {
  const session = await prisma.libAuditSession.findFirst({ where: { institutionId, id: sessionId } });
  if (!session || session.status !== 'ACTIVE') return;

  const expected = await getExpectedCopies(institutionId, session);
  const existingScans = await prisma.libAuditScan.findMany({ where: { sessionId } });
  const scannedCopyIds = new Set(existingScans.filter((s) => s.copyId).map((s) => s.copyId!));
  const scannedAccessions = new Set(existingScans.map((s) => s.accessionNo.toUpperCase()));

  for (const copy of expected) {
    if (scannedCopyIds.has(copy.id) || scannedAccessions.has(copy.copyCode.toUpperCase())) continue;
    const alreadyMissing = existingScans.some(
      (s) => s.discrepancyType === 'MISSING' && s.copyId === copy.id,
    );
    if (alreadyMissing) continue;

    await prisma.libAuditScan.create({
      data: {
        institutionId,
        sessionId,
        accessionNo: copy.copyCode,
        copyId: copy.id,
        bookTitle: copy.book.title,
        scanMethod: 'SYSTEM',
        discrepancyType: 'MISSING',
        resolution: 'PENDING',
        expectedLocation: copyLocationLabel(copy),
        scannedLocation: session.targetLabel,
        purchasePrice: copy.purchasePrice,
        scannedBy,
      },
    });
  }

  await refreshSessionStats(institutionId, sessionId);
}

function mapSessionRow(s: {
  id: string;
  auditCode: string;
  targetLabel: string;
  startDate: Date;
  endDate: Date | null;
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
  adminNotified: boolean;
  academicYear: string;
  rackId: string | null;
  shelfId: string | null;
  branchId: string | null;
}) {
  return {
    id: s.id,
    auditCode: s.auditCode,
    targetLabel: s.targetLabel,
    startDate: s.startDate.toISOString(),
    endDate: s.endDate?.toISOString() ?? null,
    scannedBy: s.scannedBy,
    closedBy: s.closedBy,
    status: s.status,
    systemCount: s.systemCount,
    physicalCount: s.physicalCount,
    variance: s.variance,
    missingCount: s.missingCount,
    misplacedCount: s.misplacedCount,
    extraCount: s.extraCount,
    damagedCount: s.damagedCount,
    returnedUnrecordedCount: s.returnedUnrecordedCount,
    financialLoss: s.financialLoss,
    financialLossFormatted: formatInr(s.financialLoss),
    adminNotified: s.adminNotified,
    academicYear: s.academicYear,
    rackId: s.rackId,
    shelfId: s.shelfId,
    branchId: s.branchId,
  };
}

export async function getStockVerification(institutionId: string, sessionId?: string) {
  const [sessions, activeSession, branches, racks, shelves, recentClosed] = await Promise.all([
    prisma.libAuditSession.findMany({
      where: { institutionId },
      orderBy: { startDate: 'desc' },
      take: 20,
    }),
    prisma.libAuditSession.findFirst({
      where: { institutionId, status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
    }),
    prisma.libBranch.findMany({ where: { institutionId, status: 'ACTIVE' }, orderBy: { branchName: 'asc' } }),
    prisma.libRack.findMany({
      where: { institutionId, status: 'ACTIVE' },
      include: { location: { include: { parent: true, branch: true } } },
      orderBy: { rackNumber: 'asc' },
    }),
    prisma.libShelf.findMany({
      where: { institutionId, status: 'ACTIVE' },
      include: { rack: { include: { location: { include: { parent: true } } } } },
      orderBy: [{ sortOrder: 'asc' }, { shelfNumber: 'asc' }],
    }),
    prisma.libAuditSession.findMany({
      where: { institutionId, status: 'CLOSED' },
      orderBy: { endDate: 'desc' },
      take: 5,
    }),
  ]);

  const focusSession = sessionId
    ? sessions.find((s) => s.id === sessionId) ?? activeSession
    : activeSession;

  let scans: ReturnType<typeof mapScanRow>[] = [];
  let discrepancyMatrix = {
    missing: [] as ReturnType<typeof mapScanRow>[],
    misplaced: [] as ReturnType<typeof mapScanRow>[],
    extra: [] as ReturnType<typeof mapScanRow>[],
    returnedUnrecorded: [] as ReturnType<typeof mapScanRow>[],
    damaged: [] as ReturnType<typeof mapScanRow>[],
    matched: [] as ReturnType<typeof mapScanRow>[],
  };
  let pendingCount = 0;

  if (focusSession) {
    const scanRows = await prisma.libAuditScan.findMany({
      where: { sessionId: focusSession.id },
      orderBy: { scannedAt: 'desc' },
    });
    scans = scanRows.map(mapScanRow);
    discrepancyMatrix = {
      missing: scans.filter((s) => s.discrepancyType === 'MISSING'),
      misplaced: scans.filter((s) => s.discrepancyType === 'MISPLACED'),
      extra: scans.filter((s) => s.discrepancyType === 'EXTRA'),
      returnedUnrecorded: scans.filter((s) => s.discrepancyType === 'RETURNED_UNRECORDED'),
      damaged: scans.filter((s) => s.discrepancyType === 'DAMAGED'),
      matched: scans.filter((s) => s.discrepancyType === 'NONE'),
    };
    pendingCount = scans.filter((s) => s.discrepancyType !== 'NONE' && s.resolution === 'PENDING').length;
  }

  const rackOptions = racks.map((r) => {
    const aisle = r.location;
    const floor = aisle.parent;
    return {
      id: r.id,
      rackNumber: r.rackNumber,
      label: formatLocationLabel({
        floorName: floor?.locationName,
        aisleName: aisle.locationName,
        rackNumber: r.rackNumber,
      }),
      branchId: aisle.branchId,
    };
  });

  const shelfOptions = shelves.map((s) => {
    const aisle = s.rack.location;
    const floor = aisle.parent;
    return {
      id: s.id,
      rackId: s.rackId,
      shelfNumber: s.shelfNumber,
      label: formatLocationLabel({
        floorName: floor?.locationName,
        aisleName: aisle.locationName,
        rackNumber: s.rack.rackNumber,
        shelfNumber: s.shelfNumber,
      }),
    };
  });

  return {
    academicYears: ACADEMIC_YEARS,
    branches: branches.map((b) => ({ id: b.id, code: b.branchCode, name: b.branchName })),
    rackOptions,
    shelfOptions,
    sessions: sessions.map(mapSessionRow),
    activeSession: activeSession ? mapSessionRow(activeSession) : null,
    focusSession: focusSession ? mapSessionRow(focusSession) : null,
    scanLog: scans,
    discrepancyMatrix,
    pendingDiscrepancies: pendingCount,
    canClose: focusSession?.status === 'ACTIVE' && pendingCount === 0,
    recentClosed: recentClosed.map(mapSessionRow),
    reports: ['Missing Book Report', 'Damaged Book Report', 'Audit Reconciliation Summary'],
    highLossThreshold: HIGH_LOSS_THRESHOLD,
    highLossThresholdFormatted: formatInr(HIGH_LOSS_THRESHOLD),
    mobileSync: ['Staff app barcode scanner for shelf verification'],
    financeIntegration: 'Automatic write-off journal entries for lost assets on audit close',
    roles: ['Librarian', 'Admin'],
    automationRules: [
      'Issued book scanned on shelf → flagged as returned without system entry',
      'Audit close blocked until all discrepancies are resolved',
      'Admin alert when financial loss exceeds threshold',
    ],
  };
}

export async function createAuditSession(
  institutionId: string,
  data: {
    scannedBy: string;
    rackId?: string;
    shelfId?: string;
    branchId?: string;
    academicYear?: string;
    notes?: string;
  },
) {
  if (!data.scannedBy?.trim()) throw new Error('Scanned by is required');

  const existing = await prisma.libAuditSession.findFirst({
    where: { institutionId, status: 'ACTIVE' },
  });
  if (existing) throw new Error('An active audit session already exists. Close it before starting a new one.');

  const targetLabel = await getTargetLabel(institutionId, data.rackId, data.shelfId, data.branchId);
  const expected = await getExpectedCopies(institutionId, {
    shelfId: data.shelfId ?? null,
    rackId: data.rackId ?? null,
    branchId: data.branchId ?? null,
  });

  const session = await prisma.libAuditSession.create({
    data: {
      institutionId,
      auditCode: await nextAuditCode(institutionId),
      branchId: data.branchId ?? null,
      rackId: data.rackId ?? null,
      shelfId: data.shelfId ?? null,
      targetLabel,
      scannedBy: data.scannedBy.trim(),
      systemCount: expected.length,
      academicYear: data.academicYear ?? '2025-26',
      notes: data.notes ?? '',
    },
  });

  await logActivity(
    institutionId,
    'START_AUDIT',
    `Audit ${session.auditCode} started for ${targetLabel} — ${expected.length} books expected`,
    session.id,
  );

  return getStockVerification(institutionId, session.id);
}

export async function scanAuditBook(
  institutionId: string,
  sessionId: string,
  accessionNo: string,
  scannedBy: string,
  scanMethod: 'BARCODE' | 'RFID' | 'MANUAL' = 'BARCODE',
  markDamaged = false,
) {
  const code = accessionNo.trim();
  if (!code) throw new Error('Accession number is required');

  const session = await prisma.libAuditSession.findFirst({
    where: { institutionId, id: sessionId, status: 'ACTIVE' },
  });
  if (!session) throw new Error('Active audit session not found');

  const existing = await prisma.libAuditScan.findFirst({
    where: { sessionId, accessionNo: { equals: code, mode: 'insensitive' } },
  });
  if (existing) {
    return {
      duplicate: true,
      scan: mapScanRow(existing),
      data: await getStockVerification(institutionId, sessionId),
    };
  }

  const copy = await prisma.libBookCopy.findFirst({
    where: {
      institutionId,
      OR: [
        { copyCode: { equals: code, mode: 'insensitive' } },
        { id: code },
      ],
    },
    include: {
      book: { select: { title: true } },
      shelf: { include: { rack: { include: { location: { include: { parent: true } } } } } },
    },
  });

  const activeIssue = copy
    ? await prisma.libIssue.findFirst({
        where: {
          institutionId,
          copyId: copy.id,
          status: { in: ['ISSUED', 'OVERDUE'] },
        },
      })
    : null;

  let discrepancyType = 'NONE';
  let resolution = 'PENDING';
  const expectedLocation = copy ? copyLocationLabel(copy) : '';
  const scannedLocation = session.targetLabel;

  if (!copy) {
    discrepancyType = 'EXTRA';
  } else if (markDamaged || copy.condition === 'DAMAGED') {
    discrepancyType = 'DAMAGED';
  } else if (activeIssue) {
    discrepancyType = 'RETURNED_UNRECORDED';
  } else if (session.shelfId && copy.shelfId !== session.shelfId) {
    discrepancyType = 'MISPLACED';
  } else if (session.rackId && copy.shelf?.rackId !== session.rackId) {
    discrepancyType = 'MISPLACED';
  } else {
    discrepancyType = 'NONE';
    resolution = 'ACCEPTED';
  }

  const scan = await prisma.libAuditScan.create({
    data: {
      institutionId,
      sessionId,
      accessionNo: copy?.copyCode ?? code.toUpperCase(),
      copyId: copy?.id ?? null,
      bookTitle: copy?.book.title ?? 'Unknown Title',
      scanMethod,
      discrepancyType,
      resolution,
      expectedLocation,
      scannedLocation,
      issueStatus: activeIssue?.status ?? '',
      purchasePrice: copy?.purchasePrice ?? 0,
      scannedBy: scannedBy.trim(),
    },
  });

  await refreshSessionStats(institutionId, sessionId);

  return {
    duplicate: false,
    scan: mapScanRow(scan),
    flagged: discrepancyType !== 'NONE',
    message:
      discrepancyType === 'RETURNED_UNRECORDED'
        ? 'Flagged: returned without system entry'
        : discrepancyType === 'MISPLACED'
          ? `Misplaced — expected at ${expectedLocation}`
          : discrepancyType === 'EXTRA'
            ? 'Extra book — not in database'
            : discrepancyType === 'DAMAGED'
              ? 'Damaged book recorded'
              : 'Book matched',
    data: await getStockVerification(institutionId, sessionId),
  };
}

export async function reconcileAuditSession(institutionId: string, sessionId: string, scannedBy: string) {
  const session = await prisma.libAuditSession.findFirst({
    where: { institutionId, id: sessionId, status: 'ACTIVE' },
  });
  if (!session) throw new Error('Active audit session not found');

  await reconcileMissing(institutionId, sessionId, scannedBy);
  await logActivity(institutionId, 'RECONCILE', `Audit ${session.auditCode} reconciled against database`, sessionId);
  return getStockVerification(institutionId, sessionId);
}

export async function resolveAuditDiscrepancy(
  institutionId: string,
  scanId: string,
  resolution: 'MARKED_LOST' | 'MARKED_FOUND' | 'CORRECTED' | 'ACCEPTED',
  resolvedBy: string,
  notes = '',
) {
  const scan = await prisma.libAuditScan.findFirst({
    where: { institutionId, id: scanId },
    include: { session: true },
  });
  if (!scan) throw new Error('Scan record not found');
  if (scan.session.status !== 'ACTIVE') throw new Error('Session is not active');

  await prisma.libAuditScan.update({
    where: { id: scanId },
    data: {
      resolution,
      resolutionNotes: notes,
      resolvedBy: resolvedBy.trim(),
      resolvedAt: new Date(),
    },
  });

  if (resolution === 'CORRECTED' && scan.discrepancyType === 'RETURNED_UNRECORDED' && scan.copyId) {
    const issue = await prisma.libIssue.findFirst({
      where: { institutionId, copyId: scan.copyId, status: { in: ['ISSUED', 'OVERDUE'] } },
    });
    if (issue) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await prisma.libIssue.update({
        where: { id: issue.id },
        data: { status: 'RETURNED', returnDate: today, returnedBy: resolvedBy },
      });
      await prisma.libBookCopy.update({
        where: { id: scan.copyId },
        data: { status: 'AVAILABLE' },
      });
      const book = await prisma.libBook.findUnique({ where: { id: issue.bookId } });
      if (book) {
        await prisma.libBook.update({
          where: { id: book.id },
          data: { availableCopies: { increment: 1 } },
        });
      }
    }
  }

  if (resolution === 'MARKED_FOUND' && scan.copyId && scan.discrepancyType === 'MISPLACED') {
    const session = scan.session;
    if (session.shelfId) {
      const shelf = await prisma.libShelf.findFirst({
        where: { id: session.shelfId },
        include: { rack: { include: { location: { include: { parent: true } } } } },
      });
      if (shelf) {
        const label = formatLocationLabel({
          floorName: shelf.rack.location.parent?.locationName,
          aisleName: shelf.rack.location.locationName,
          rackNumber: shelf.rack.rackNumber,
          shelfNumber: shelf.shelfNumber,
        });
        await prisma.libBookCopy.update({
          where: { id: scan.copyId },
          data: { shelfId: session.shelfId, rackLocation: label },
        });
      }
    }
  }

  await refreshSessionStats(institutionId, scan.sessionId);
  await logActivity(institutionId, 'RESOLVE', `${resolution} for ${scan.accessionNo}`, scanId);
  return getStockVerification(institutionId, scan.sessionId);
}

export async function closeAuditSession(institutionId: string, sessionId: string, closedBy: string) {
  const session = await prisma.libAuditSession.findFirst({
    where: { institutionId, id: sessionId, status: 'ACTIVE' },
  });
  if (!session) throw new Error('Active audit session not found');

  await reconcileMissing(institutionId, sessionId, closedBy);

  const scans = await prisma.libAuditScan.findMany({ where: { sessionId } });
  const pending = scans.filter((s) => s.discrepancyType !== 'NONE' && s.resolution === 'PENDING');
  if (pending.length > 0) {
    throw new Error(`Cannot close audit — ${pending.length} discrepanc${pending.length === 1 ? 'y' : 'ies'} still pending resolution`);
  }

  let financialLoss = 0;
  const writeOffs: { accessionNo: string; title: string; amount: number }[] = [];

  for (const scan of scans) {
    if (scan.resolution === 'MARKED_LOST' && scan.copyId) {
      financialLoss += scan.purchasePrice;
      writeOffs.push({ accessionNo: scan.accessionNo, title: scan.bookTitle, amount: scan.purchasePrice });

      const copy = await prisma.libBookCopy.findUnique({ where: { id: scan.copyId } });
      if (copy) {
        const wasAvailable = copy.status === 'AVAILABLE';
        await prisma.libBookCopy.update({
          where: { id: scan.copyId },
          data: { status: 'LOST' },
        });
        const book = await prisma.libBook.findUnique({ where: { id: copy.bookId } });
        if (book) {
          await prisma.libBook.update({
            where: { id: book.id },
            data: wasAvailable
              ? { totalCopies: { decrement: 1 }, availableCopies: { decrement: 1 } }
              : { totalCopies: { decrement: 1 } },
          });
        }
      }
    }
  }

  const adminNotified = financialLoss >= HIGH_LOSS_THRESHOLD;
  const endDate = new Date();

  await prisma.libAuditSession.update({
    where: { id: sessionId },
    data: {
      status: 'CLOSED',
      endDate,
      closedBy: closedBy.trim(),
      financialLoss,
      adminNotified,
    },
  });

  if (adminNotified) {
    await prisma.libNotice.create({
      data: {
        institutionId,
        title: `Stock audit ${session.auditCode} closed with high loss: ${formatInr(financialLoss)} — ${writeOffs.length} book(s) written off`,
        issuedBy: 'Library System',
        iconColor: 'red',
        academicYear: session.academicYear,
      },
    });
    await logActivity(
      institutionId,
      'ADMIN_ALERT',
      `High financial loss ${formatInr(financialLoss)} on audit ${session.auditCode}`,
      sessionId,
    );
  }

  await logActivity(
    institutionId,
    'CLOSE_AUDIT',
    `Audit ${session.auditCode} closed — variance ${session.variance}, loss ${formatInr(financialLoss)}`,
    sessionId,
  );

  return {
    success: true,
    auditCode: session.auditCode,
    financialLoss,
    financialLossFormatted: formatInr(financialLoss),
    writeOffs,
    adminNotified,
    writeOffJournalEntries: writeOffs.map((w) => ({
      description: `Library asset write-off: ${w.title} (${w.accessionNo})`,
      debitAccount: 'Loss on Library Assets',
      creditAccount: 'Library Inventory',
      amount: w.amount,
      amountFormatted: formatInr(w.amount),
    })),
    dashboardImpact: 'Total Books and Available Books updated from write-offs',
    data: await getStockVerification(institutionId),
  };
}

export async function seedStockVerification(institutionId: string) {
  await seedRackManagement(institutionId);

  const existing = await prisma.libAuditSession.findFirst({ where: { institutionId, status: 'ACTIVE' } });
  if (existing) return getStockVerification(institutionId, existing.id);

  const rack = await prisma.libRack.findFirst({ where: { institutionId } });
  if (!rack) return getStockVerification(institutionId);

  const data = await createAuditSession(institutionId, {
    scannedBy: 'Librarian',
    rackId: rack.id,
    academicYear: '2025-26',
    notes: 'Demo stock verification session',
  });

  const sessionId = data.focusSession?.id;
  if (!sessionId) return data;

  const copies = await prisma.libBookCopy.findMany({
    where: { institutionId, shelf: { rackId: rack.id }, status: 'AVAILABLE' },
    take: 8,
  });

  for (const copy of copies.slice(0, 5)) {
    await scanAuditBook(institutionId, sessionId, copy.copyCode, 'Librarian', 'BARCODE');
  }

  const issuedCopy = await prisma.libBookCopy.findFirst({
    where: { institutionId, status: 'ISSUED' },
  });
  if (issuedCopy) {
    await scanAuditBook(institutionId, sessionId, issuedCopy.copyCode, 'Librarian', 'RFID');
  }

  await scanAuditBook(institutionId, sessionId, 'UNKNOWN-EXTRA-001', 'Librarian', 'BARCODE');

  const damaged = copies[6];
  if (damaged) {
    await prisma.libBookCopy.update({ where: { id: damaged.id }, data: { condition: 'DAMAGED' } });
    await scanAuditBook(institutionId, sessionId, damaged.copyCode, 'Librarian', 'BARCODE', true);
  }

  await reconcileAuditSession(institutionId, sessionId, 'Librarian');
  await logActivity(institutionId, 'SEED', 'Stock verification demo session seeded');
  return getStockVerification(institutionId, sessionId);
}
