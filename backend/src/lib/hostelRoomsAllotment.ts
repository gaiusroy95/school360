import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { ensureHostelFeeCategories } from './feeFinanceModules.js';
import { seedHostelDashboard } from './hostelDashboard.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const BED_STATUS = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'] as const;
const DEFAULT_HOSTEL_FEE = 6450;

type BedStatus = typeof BED_STATUS[number];

function todayDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatInr(amount: number) {
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

function nextInvoiceNumber() {
  return `HINV-${Date.now().toString(36).toUpperCase()}`;
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  filterSnapshot: Record<string, unknown> = {},
  performedBy = 'Hostel Admin',
) {
  await prisma.hostelActivityLog.create({
    data: {
      institutionId,
      action,
      details,
      filterSnapshot: filterSnapshot as Prisma.InputJsonValue,
      performedBy,
    },
  });
}

function genderAllowed(hostelType: string, studentGender: string) {
  const g = studentGender.toUpperCase();
  const t = hostelType.toUpperCase();
  if (t === 'MIXED' || t === 'PG') return true;
  if (t === 'BOYS') return g === 'MALE' || g === 'M';
  if (t === 'GIRLS') return g === 'FEMALE' || g === 'F';
  return true;
}

function normalizeGender(g: string) {
  const u = g.toUpperCase();
  if (u === 'M' || u === 'MALE') return 'MALE';
  if (u === 'F' || u === 'FEMALE') return 'FEMALE';
  return u;
}

function bedColor(status: string) {
  if (status === 'OCCUPIED') return 'red';
  if (status === 'MAINTENANCE') return 'yellow';
  return 'green';
}

async function syncHostelCounts(institutionId: string, hostelId: string) {
  const beds = await prisma.hostelBed.findMany({
    where: {
      institutionId,
      room: { floor: { block: { hostelId } } },
    },
  });
  const occupied = beds.filter((b) => b.bedStatus === 'OCCUPIED').length;
  const rooms = await prisma.hostelRoom.count({
    where: { institutionId, floor: { block: { hostelId } } },
  });
  await prisma.hostelMaster.update({
    where: { id: hostelId },
    data: { totalBeds: beds.length, occupiedBeds: occupied, totalRooms: rooms },
  });
}

type BedPath = {
  bedId: string;
  bedNumber: string;
  bedStatus: string;
  roomId: string;
  roomNumber: string;
  roomType: string;
  floorId: string;
  floorName: string;
  blockId: string;
  blockName: string;
  hostelId: string;
  hostelName: string;
  hostelType: string;
};

async function loadBedPaths(institutionId: string, hostelId?: string): Promise<Map<string, BedPath>> {
  const beds = await prisma.hostelBed.findMany({
    where: {
      institutionId,
      ...(hostelId ? { room: { floor: { block: { hostelId } } } } : {}),
    },
    include: {
      room: {
        include: {
          floor: {
            include: {
              block: { include: { hostel: true } },
            },
          },
        },
      },
    },
  });
  const map = new Map<string, BedPath>();
  for (const b of beds) {
    const block = b.room.floor.block;
    map.set(b.id, {
      bedId: b.id,
      bedNumber: b.bedNumber,
      bedStatus: b.bedStatus,
      roomId: b.roomId,
      roomNumber: b.room.roomNumber,
      roomType: b.room.roomType,
      floorId: b.room.floorId,
      floorName: b.room.floor.floorName,
      blockId: block.id,
      blockName: block.blockName,
      hostelId: block.hostelId,
      hostelName: block.hostel.hostelName,
      hostelType: block.hostel.hostelType,
    });
  }
  return map;
}

async function getActiveAllotmentForStudent(institutionId: string, studentId: string, academicYear: string) {
  if (!studentId) return null;
  return prisma.hostelAllotment.findFirst({
    where: {
      institutionId,
      studentId,
      academicYear,
      status: 'ACTIVE',
      allotmentStatus: { in: ['PENDING', 'CONFIRMED'] },
    },
    include: { bed: true, hostel: true },
  });
}

export async function getRoomsAllotment(
  institutionId: string,
  academicYear = '2025-26',
  filters: {
    hostelId?: string;
    blockId?: string;
    floorId?: string;
    roomType?: string;
    userRole?: string;
  } = {},
) {
  const userRole = filters.userRole ?? 'Admin';
  const hostels = await prisma.hostelMaster.findMany({
    where: { institutionId, academicYear, status: 'ACTIVE' },
    orderBy: { hostelName: 'asc' },
  });

  const assignedHostelIds = userRole === 'Warden' ? hostels.slice(0, 2).map((h) => h.id) : [];
  const selectedHostelId = filters.hostelId && filters.hostelId !== 'ALL' ? filters.hostelId : hostels[0]?.id;

  if (!selectedHostelId) {
    return {
      academicYear,
      academicYears: ACADEMIC_YEARS,
      hostels: [],
      blocks: [],
      floors: [],
      roomTypes: ['AC', 'NON_AC'],
      matrix: [],
      kpis: { totalRooms: 0, totalBeds: 0, available: 0, occupied: 0, maintenance: 0, occupancyPct: '0%' },
      pendingRequests: [],
      transferRequests: [],
      recentAllotments: [],
      permissions: rolePermissions(userRole),
      reports: ['Room Availability Report', 'Student Hostel Register', 'Occupancy Report'],
      automationRules: [
        'Auto bed assignment based on course/year preferences',
        'Smart vacancy detection on course completion or TC generation',
        'Hostel fee invoice auto-generated on confirmed allotment',
      ],
      erpIntegration: ['Fees & Finance — debit ledger on confirmed allotment', 'Student Management — demographic sync'],
    };
  }

  const blocks = await prisma.hostelBlock.findMany({
    where: { institutionId, hostelId: selectedHostelId, status: 'ACTIVE' },
    orderBy: { sortOrder: 'asc' },
  });

  const blockId = filters.blockId && filters.blockId !== 'ALL' ? filters.blockId : blocks[0]?.id;
  const floors = blockId
    ? await prisma.hostelFloor.findMany({
      where: { institutionId, blockId, status: 'ACTIVE' },
      orderBy: { sortOrder: 'asc' },
    })
    : [];

  const floorId = filters.floorId && filters.floorId !== 'ALL' ? filters.floorId : floors[0]?.id;

  const roomWhere: Prisma.HostelRoomWhereInput = {
    institutionId,
    status: 'ACTIVE',
    ...(floorId ? { floorId } : blockId ? { floor: { blockId } } : { floor: { block: { hostelId: selectedHostelId } } }),
    ...(filters.roomType && filters.roomType !== 'ALL' ? { roomType: filters.roomType } : {}),
  };

  const rooms = await prisma.hostelRoom.findMany({
    where: roomWhere,
    include: {
      beds: {
        orderBy: { sortOrder: 'asc' },
        include: {
          allotments: {
            where: { institutionId, academicYear, status: 'ACTIVE', allotmentStatus: { in: ['PENDING', 'CONFIRMED'] } },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      },
      floor: { include: { block: true } },
    },
    orderBy: { roomNumber: 'asc' },
  });

  const bedPaths = await loadBedPaths(institutionId, selectedHostelId);
  const allBeds = [...bedPaths.values()];

  const matrix = rooms.map((room) => {
    const beds = room.beds.map((bed) => {
      const allotment = bed.allotments[0];
      const effectiveStatus = bed.bedStatus === 'MAINTENANCE'
        ? 'MAINTENANCE'
        : allotment ? 'OCCUPIED' : bed.bedStatus;
      return {
        id: bed.id,
        bedNumber: bed.bedNumber,
        status: effectiveStatus,
        color: bedColor(effectiveStatus),
        student: allotment
          ? {
            id: allotment.studentId,
            name: allotment.studentName,
            admissionNumber: allotment.admissionNumber,
            className: allotment.className,
            gender: allotment.studentGender,
            paymentStatus: allotment.paymentStatus,
            feeAmount: allotment.feeAmount,
            invoiceNumber: allotment.invoiceNumber,
            allotmentId: allotment.id,
            allotmentStatus: allotment.allotmentStatus,
          }
          : null,
      };
    });
    const roomStatus = beds.every((b) => b.status === 'OCCUPIED')
      ? 'OCCUPIED'
      : beds.some((b) => b.status === 'MAINTENANCE')
        ? 'MAINTENANCE'
        : beds.some((b) => b.status === 'OCCUPIED')
          ? 'PARTIAL'
          : 'AVAILABLE';
    return {
      id: room.id,
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      floorName: room.floor.floorName,
      blockName: room.floor.block.blockName,
      capacity: room.capacity,
      roomStatus,
      beds,
    };
  });

  const totalBeds = allBeds.length;
  const available = allBeds.filter((b) => b.bedStatus === 'AVAILABLE').length;
  const occupied = allBeds.filter((b) => b.bedStatus === 'OCCUPIED').length;
  const maintenance = allBeds.filter((b) => b.bedStatus === 'MAINTENANCE').length;
  const totalRooms = await prisma.hostelRoom.count({
    where: { institutionId, floor: { block: { hostelId: selectedHostelId } } },
  });

  const [pendingRequests, transferRequests, recentAllotments] = await Promise.all([
    prisma.hostelAllotmentRequest.findMany({
      where: { institutionId, academicYear, status: { in: ['PENDING', 'APPROVED'] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.hostelTransferRequest.findMany({
      where: { institutionId, academicYear, status: { in: ['PENDING', 'WARDEN_APPROVED'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.hostelAllotment.findMany({
      where: { institutionId, hostelId: selectedHostelId, academicYear },
      include: { hostel: true },
      orderBy: { allotmentDate: 'desc' },
      take: 10,
    }),
  ]);

  await logActivity(
    institutionId,
    'VIEW_ROOMS_ALLOTMENT',
    'Rooms & Allotment page accessed',
    { academicYear, hostelId: selectedHostelId, blockId, floorId, roomType: filters.roomType },
    userRole,
  );

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    hostels: hostels.map((h) => ({
      id: h.id,
      code: h.hostelCode,
      name: h.hostelName,
      type: h.hostelType,
      accessible: userRole !== 'Warden' || assignedHostelIds.includes(h.id),
    })),
    selectedHostelId,
    blocks: blocks.map((b) => ({ id: b.id, code: b.blockCode, name: b.blockName })),
    selectedBlockId: blockId ?? 'ALL',
    floors: floors.map((f) => ({ id: f.id, number: f.floorNumber, name: f.floorName })),
    selectedFloorId: floorId ?? 'ALL',
    roomTypes: ['ALL', 'AC', 'NON_AC'],
    selectedRoomType: filters.roomType ?? 'ALL',
    matrix,
    kpis: {
      totalRooms,
      totalBeds,
      available,
      occupied,
      maintenance,
      occupancyPct: totalBeds > 0 ? `${Math.round((occupied / totalBeds) * 10000) / 100}%` : '0%',
    },
    pendingRequests: pendingRequests.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: r.studentName,
      gender: r.studentGender,
      className: r.className,
      course: r.course,
      yearLabel: r.yearLabel,
      outstandingFees: r.outstandingFees,
      eligible: r.eligible,
      status: r.status,
      createdAt: formatDate(r.createdAt),
    })),
    transferRequests: transferRequests.map((t) => ({
      id: t.id,
      studentName: t.studentName,
      fromBedId: t.fromBedId,
      toBedId: t.toBedId,
      status: t.status,
      requestedBy: t.requestedBy,
    })),
    recentAllotments: recentAllotments.map((a) => ({
      student: a.studentName,
      hostel: a.hostel.hostelName,
      room: a.roomNumber,
      bed: a.bedNumber,
      date: formatDate(a.allotmentDate),
      status: a.allotmentStatus,
      paymentStatus: a.paymentStatus,
    })),
    userRole,
    permissions: rolePermissions(userRole),
    defaultHostelFee: DEFAULT_HOSTEL_FEE,
    reports: ['Room Availability Report', 'Student Hostel Register', 'Occupancy Report'],
    exportFormats: ['PDF', 'Excel', 'CSV'],
    automationRules: [
      'Auto bed assignment based on course/year preferences',
      'Smart vacancy detection on course completion or TC generation',
      'Hostel fee invoice auto-generated on confirmed allotment',
    ],
    erpIntegration: ['Fees & Finance — debit ledger on confirmed allotment', 'Student Management — demographic sync'],
    wardenContact: await prisma.hostelStaff.findFirst({
      where: { institutionId, hostelId: selectedHostelId, role: 'WARDEN', status: 'ACTIVE' },
      select: { staffName: true, mobile: true },
    }),
  };
}

function rolePermissions(role: string) {
  if (role === 'Admin' || role === 'Hostel Administrator') {
    return { canAllocate: true, canDeallocate: true, canTransfer: true, canApprove: true, canEditBed: true, canExport: true };
  }
  if (role === 'Warden') {
    return { canAllocate: false, canDeallocate: false, canTransfer: true, canApprove: false, canEditBed: false, canExport: true };
  }
  return { canAllocate: false, canDeallocate: false, canTransfer: false, canApprove: false, canEditBed: false, canExport: false };
}

export async function allocateBed(
  institutionId: string,
  body: {
    bedId: string;
    studentId?: string;
    studentName: string;
    studentGender: string;
    admissionNumber?: string;
    className?: string;
    academicYear?: string;
    requestId?: string;
    approvedBy?: string;
    feeAmount?: number;
    markPaid?: boolean;
  },
) {
  const academicYear = body.academicYear ?? '2025-26';
  const gender = normalizeGender(body.studentGender);
  const paths = await loadBedPaths(institutionId);
  const path = paths.get(body.bedId);
  if (!path) throw new Error('Bed not found');

  const bed = await prisma.hostelBed.findUnique({ where: { id: body.bedId } });
  if (!bed || bed.bedStatus === 'MAINTENANCE') throw new Error('Bed is not available for allotment');
  if (bed.bedStatus === 'OCCUPIED') throw new Error('Bed is already occupied');

  const existingBedAllotment = await prisma.hostelAllotment.findFirst({
    where: {
      institutionId,
      bedId: body.bedId,
      status: 'ACTIVE',
      allotmentStatus: { in: ['PENDING', 'CONFIRMED'] },
    },
  });
  if (existingBedAllotment) throw new Error('Bed already has a pending or active allotment');

  if (!genderAllowed(path.hostelType, gender)) {
    throw new Error(`Gender validation failed: ${gender} student cannot be assigned to ${path.hostelType} hostel`);
  }

  const studentId = body.studentId ?? `STU-${Date.now()}`;
  const existing = await getActiveAllotmentForStudent(institutionId, studentId, academicYear);
  if (existing) throw new Error('Student already has an active bed allotment');

  const feeAmount = body.feeAmount ?? DEFAULT_HOSTEL_FEE;
  const invoiceNumber = nextInvoiceNumber();
  const paymentStatus = body.markPaid ? 'PAID' : 'PENDING';
  const allotmentStatus = body.markPaid ? 'CONFIRMED' : 'PENDING';

  const allotment = await prisma.$transaction(async (tx) => {
    const row = await tx.hostelAllotment.create({
      data: {
        institutionId,
        hostelId: path.hostelId,
        bedId: body.bedId,
        studentId,
        studentName: body.studentName,
        admissionNumber: body.admissionNumber ?? '',
        className: body.className ?? '',
        studentGender: gender,
        roomNumber: path.roomNumber,
        bedNumber: path.bedNumber,
        allotmentDate: todayDate(),
        status: 'ACTIVE',
        allotmentStatus,
        feeAmount,
        invoiceNumber,
        paymentStatus,
        approvedBy: body.approvedBy ?? 'Hostel Admin',
        academicYear,
      },
    });

    await tx.hostelBed.update({
      where: { id: body.bedId },
      data: { bedStatus: allotmentStatus === 'CONFIRMED' ? 'OCCUPIED' : 'AVAILABLE' },
    });

    await tx.hostelPendingPayment.create({
      data: {
        institutionId,
        hostelId: path.hostelId,
        studentName: body.studentName,
        amount: feeAmount,
        dueDate: new Date(Date.now() + 7 * 86400000),
        academicYear,
        status: paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
      },
    });

    if (body.requestId) {
      await tx.hostelAllotmentRequest.update({
        where: { id: body.requestId },
        data: { status: 'ALLOTTED', allottedBedId: body.bedId, approvedBy: body.approvedBy ?? 'Hostel Admin' },
      });
    }

    return row;
  });

  if (allotmentStatus === 'CONFIRMED') {
    await syncHostelCounts(institutionId, path.hostelId);
  }

  await logActivity(
    institutionId,
    'ALLOT_BED',
    `Bed ${path.roomNumber}/${path.bedNumber} allotted to ${body.studentName}`,
    { bedId: body.bedId, studentId, invoiceNumber },
    body.approvedBy ?? 'Hostel Admin',
  );

  return {
    success: true,
    allotment,
    notification: `Push/Email sent: Room ${path.roomNumber} allotted in ${path.hostelName}`,
    invoiceNumber,
    feeAmount: formatInr(feeAmount),
    message: allotmentStatus === 'CONFIRMED'
      ? 'Allotment confirmed — status Occupied'
      : 'Allotment pending — awaiting fee payment',
  };
}

export async function confirmAllotmentPayment(institutionId: string, allotmentId: string, collectedBy = 'Hostel Admin') {
  const allotment = await prisma.hostelAllotment.findFirst({
    where: { id: allotmentId, institutionId },
  });
  if (!allotment) throw new Error('Allotment not found');
  if (!allotment.bedId) throw new Error('Bed reference missing');

  await prisma.$transaction(async (tx) => {
    await tx.hostelAllotment.update({
      where: { id: allotmentId },
      data: { paymentStatus: 'PAID', allotmentStatus: 'CONFIRMED', notificationSent: true },
    });
    await tx.hostelBed.update({ where: { id: allotment.bedId! }, data: { bedStatus: 'OCCUPIED' } });
    await tx.hostelPendingPayment.updateMany({
      where: { institutionId, studentName: allotment.studentName, status: 'PENDING' },
      data: { status: 'PAID' },
    });

    const categories = await ensureHostelFeeCategories(institutionId);
    const rentCat = categories.find((c) => c.code === 'RENT') ?? categories[0];
    await tx.hostelFeeCollection.create({
      data: {
        institutionId,
        categoryId: rentCat?.id,
        receiptNumber: `HRC-${Date.now()}`,
        academicYear: allotment.academicYear,
        periodLabel: 'Allotment',
        studentId: allotment.studentId,
        studentName: allotment.studentName,
        admissionNumber: allotment.admissionNumber,
        className: allotment.className,
        roomNumber: allotment.roomNumber,
        amount: allotment.feeAmount,
        paymentMode: 'ONLINE',
        collectedBy,
        remarks: `Hostel allotment fee — ${allotment.invoiceNumber}`,
      },
    });
  });

  await syncHostelCounts(institutionId, allotment.hostelId);
  await logActivity(institutionId, 'PAYMENT_CONFIRMED', `Payment confirmed for ${allotment.studentName}`, { allotmentId }, collectedBy);

  return {
    success: true,
    message: 'Payment confirmed — allotment status changed to Occupied',
    notification: `Room ${allotment.roomNumber} allotment confirmed in hostel`,
  };
}

export async function deallocateBed(
  institutionId: string,
  body: { allotmentId?: string; bedId?: string; reason?: string; performedBy?: string },
) {
  const allotment = body.allotmentId
    ? await prisma.hostelAllotment.findFirst({ where: { id: body.allotmentId, institutionId } })
    : await prisma.hostelAllotment.findFirst({
      where: { institutionId, bedId: body.bedId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  if (!allotment) throw new Error('Active allotment not found');

  await prisma.$transaction(async (tx) => {
    await tx.hostelAllotment.update({
      where: { id: allotment.id },
      data: { status: 'INACTIVE', allotmentStatus: 'VACATED', remarks: body.reason ?? 'De-allocated' },
    });
    if (allotment.bedId) {
      await tx.hostelBed.update({ where: { id: allotment.bedId }, data: { bedStatus: 'AVAILABLE' } });
    }
  });

  await syncHostelCounts(institutionId, allotment.hostelId);
  await logActivity(
    institutionId,
    'DEALLOCATE_BED',
    `Bed de-allocated for ${allotment.studentName}`,
    { allotmentId: allotment.id, reason: body.reason },
    body.performedBy ?? 'Hostel Admin',
  );

  return { success: true, message: 'Bed de-allocated — smart vacancy detection applied' };
}

export async function requestTransfer(
  institutionId: string,
  body: { fromBedId: string; toBedId: string; studentId?: string; studentName: string; requestedBy?: string; academicYear?: string },
) {
  const paths = await loadBedPaths(institutionId);
  const from = paths.get(body.fromBedId);
  const to = paths.get(body.toBedId);
  if (!from || !to) throw new Error('Invalid bed selection');
  if (to.bedStatus !== 'AVAILABLE') throw new Error('Target bed is not available');

  const row = await prisma.hostelTransferRequest.create({
    data: {
      institutionId,
      studentId: body.studentId ?? '',
      studentName: body.studentName,
      fromBedId: body.fromBedId,
      toBedId: body.toBedId,
      academicYear: body.academicYear ?? '2025-26',
      requestedBy: body.requestedBy ?? 'Warden',
      status: 'PENDING',
    },
  });

  await logActivity(institutionId, 'TRANSFER_REQUEST', `Transfer requested for ${body.studentName}`, { transferId: row.id });
  return { success: true, transfer: row, message: 'Transfer request submitted — awaiting multi-level approval' };
}

export async function approveTransfer(
  institutionId: string,
  transferId: string,
  approverRole: 'Warden' | 'Admin',
  approverName = 'Hostel Admin',
) {
  const transfer = await prisma.hostelTransferRequest.findFirst({ where: { id: transferId, institutionId } });
  if (!transfer) throw new Error('Transfer request not found');

  if (approverRole === 'Warden' && transfer.status === 'PENDING') {
    await prisma.hostelTransferRequest.update({
      where: { id: transferId },
      data: { status: 'WARDEN_APPROVED', wardenApprovedBy: approverName },
    });
    return { success: true, message: 'Warden approval recorded — awaiting admin approval' };
  }

  if (approverRole === 'Admin' && (transfer.status === 'WARDEN_APPROVED' || transfer.status === 'PENDING')) {
    const allotment = await prisma.hostelAllotment.findFirst({
      where: { institutionId, bedId: transfer.fromBedId, status: 'ACTIVE' },
    });
    if (!allotment) throw new Error('Source allotment not found');

    const paths = await loadBedPaths(institutionId);
    const toPath = paths.get(transfer.toBedId);
    if (!toPath) throw new Error('Target bed not found');

    await prisma.$transaction(async (tx) => {
      await tx.hostelAllotment.update({
        where: { id: allotment.id },
        data: {
          bedId: transfer.toBedId,
          roomNumber: toPath.roomNumber,
          bedNumber: toPath.bedNumber,
          hostelId: toPath.hostelId,
          allotmentStatus: 'TRANSFERRED',
          transferFromBedId: transfer.fromBedId,
        },
      });
      await tx.hostelBed.update({ where: { id: transfer.fromBedId }, data: { bedStatus: 'AVAILABLE' } });
      await tx.hostelBed.update({ where: { id: transfer.toBedId }, data: { bedStatus: 'OCCUPIED' } });
      await tx.hostelTransferRequest.update({
        where: { id: transferId },
        data: { status: 'APPROVED', adminApprovedBy: approverName },
      });
    });

    await syncHostelCounts(institutionId, allotment.hostelId);
    if (toPath.hostelId !== allotment.hostelId) await syncHostelCounts(institutionId, toPath.hostelId);
    await logActivity(institutionId, 'TRANSFER_APPROVED', `Room transfer approved for ${transfer.studentName}`, { transferId }, approverName);
    return { success: true, message: `Transferred to Room ${toPath.roomNumber} Bed ${toPath.bedNumber}` };
  }

  throw new Error('Invalid approval state');
}

export async function createAllotmentRequest(
  institutionId: string,
  body: {
    studentName: string;
    studentGender: string;
    admissionNumber?: string;
    className?: string;
    course?: string;
    yearLabel?: string;
    preferredHostelId?: string;
    academicYear?: string;
    outstandingFees?: number;
  },
) {
  const outstandingFees = body.outstandingFees ?? 0;
  const eligible = outstandingFees <= 0;

  const row = await prisma.hostelAllotmentRequest.create({
    data: {
      institutionId,
      studentId: `STU-REQ-${Date.now()}`,
      studentName: body.studentName,
      studentGender: normalizeGender(body.studentGender),
      admissionNumber: body.admissionNumber ?? '',
      className: body.className ?? '',
      course: body.course ?? '',
      yearLabel: body.yearLabel ?? '',
      preferredHostelId: body.preferredHostelId ?? '',
      academicYear: body.academicYear ?? '2025-26',
      outstandingFees,
      eligible,
      status: eligible ? 'PENDING' : 'REJECTED',
      rejectionReason: eligible ? '' : 'Outstanding fees must be cleared before allotment',
      requestedBy: 'Student',
    },
  });

  return {
    success: true,
    request: row,
    message: eligible ? 'Allotment request submitted' : 'Request rejected — outstanding fees',
  };
}

export async function updateBedStatus(
  institutionId: string,
  bedId: string,
  bedStatus: BedStatus,
  performedBy = 'Hostel Admin',
) {
  if (!BED_STATUS.includes(bedStatus)) throw new Error('Invalid bed status');
  const bed = await prisma.hostelBed.findFirst({ where: { id: bedId, institutionId } });
  if (!bed) throw new Error('Bed not found');
  if (bedStatus === 'AVAILABLE' && bed.bedStatus === 'OCCUPIED') {
    const active = await prisma.hostelAllotment.count({ where: { institutionId, bedId, status: 'ACTIVE' } });
    if (active > 0) throw new Error('Cannot set Available — bed has active allotment');
  }

  await prisma.hostelBed.update({ where: { id: bedId }, data: { bedStatus } });
  const path = (await loadBedPaths(institutionId)).get(bedId);
  if (path) await syncHostelCounts(institutionId, path.hostelId);
  await logActivity(institutionId, 'BED_STATUS', `Bed status changed to ${bedStatus}`, { bedId }, performedBy);
  return { success: true, message: `Bed status updated to ${bedStatus}` };
}

export async function autoAssignBed(
  institutionId: string,
  body: { requestId: string; approvedBy?: string },
) {
  const request = await prisma.hostelAllotmentRequest.findFirst({
    where: { id: body.requestId, institutionId },
  });
  if (!request || !request.eligible) throw new Error('Request not eligible for auto-assignment');

  const hostelFilter = request.preferredHostelId
    ? { hostelId: request.preferredHostelId }
    : {};

  const beds = await prisma.hostelBed.findMany({
    where: {
      institutionId,
      bedStatus: 'AVAILABLE',
      room: {
        floor: { block: { ...hostelFilter, hostel: { status: 'ACTIVE' } } },
      },
    },
    include: { room: { include: { floor: { include: { block: { include: { hostel: true } } } } } } },
    take: 50,
  });

  const match = beds.find((b) => genderAllowed(b.room.floor.block.hostel.hostelType, request.studentGender));
  if (!match) throw new Error('No suitable vacant bed found for auto-assignment');

  return allocateBed(institutionId, {
    bedId: match.id,
    studentId: request.studentId,
    studentName: request.studentName,
    studentGender: request.studentGender,
    admissionNumber: request.admissionNumber,
    className: request.className,
    academicYear: request.academicYear,
    requestId: request.id,
    approvedBy: body.approvedBy ?? 'System Auto-Assign',
  });
}

export async function exportRoomsAllotmentReport(
  institutionId: string,
  academicYear: string,
  format: 'PDF' | 'Excel' | 'CSV',
  hostelId?: string,
) {
  const data = await getRoomsAllotment(institutionId, academicYear, { hostelId });
  const fileName = `hostel_rooms_${academicYear}_${Date.now()}.${format.toLowerCase()}`;
  await logActivity(institutionId, 'EXPORT_ROOMS', `Rooms report exported as ${format}`, { academicYear, hostelId, format });
  return {
    success: true,
    format,
    fileName,
    message: `${format} report generated`,
    downloadUrl: `/api/hostel/rooms-allotment/export/${fileName}`,
    snapshot: data,
  };
}

export async function seedRoomsAllotment(institutionId: string) {
  await seedHostelDashboard(institutionId);

  const existing = await prisma.hostelBlock.count({ where: { institutionId } });
  if (existing > 0) return getRoomsAllotment(institutionId);

  const hostels = await prisma.hostelMaster.findMany({
    where: { institutionId, status: 'ACTIVE' },
    orderBy: { hostelName: 'asc' },
  });
  const boysA = hostels.find((h) => h.hostelCode === 'BHA');
  const girlsA = hostels.find((h) => h.hostelCode === 'GHA');
  if (!boysA || !girlsA) return getRoomsAllotment(institutionId);

  const academicYear = '2025-26';

  async function buildHostelMatrix(hostelId: string, prefix: string, gender: string) {
    const block = await prisma.hostelBlock.create({
      data: { institutionId, hostelId, blockCode: `${prefix}-A`, blockName: `Block A`, sortOrder: 1 },
    });
    const blockB = await prisma.hostelBlock.create({
      data: { institutionId, hostelId, blockCode: `${prefix}-B`, blockName: `Block B`, sortOrder: 2 },
    });

    for (const blk of [block, blockB]) {
      const blockSuffix = blk.blockCode.endsWith('A') ? '1' : '2';
      for (let fi = 1; fi <= 2; fi += 1) {
        const floor = await prisma.hostelFloor.create({
          data: {
            institutionId,
            blockId: blk.id,
            floorNumber: fi,
            floorName: `Floor ${fi}`,
            sortOrder: fi,
          },
        });

        for (let ri = 1; ri <= 4; ri += 1) {
          const roomNum = `${prefix}${blockSuffix}-${fi}${String(ri).padStart(2, '0')}`;
          const roomType = ri % 2 === 0 ? 'AC' : 'NON_AC';
          const room = await prisma.hostelRoom.create({
            data: {
              institutionId,
              floorId: floor.id,
              roomNumber: roomNum,
              roomType,
              capacity: 4,
            },
          });

          const bedStatuses: BedStatus[] = ['AVAILABLE', 'AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];
          for (let bi2 = 1; bi2 <= 4; bi2 += 1) {
            const status = bedStatuses[bi2 - 1];
            const bed = await prisma.hostelBed.create({
              data: {
                institutionId,
                roomId: room.id,
                bedNumber: String(bi2),
                bedStatus: status,
                sortOrder: bi2,
              },
            });

            if (status === 'OCCUPIED') {
              const studentName = `${gender === 'MALE' ? 'Rahul' : 'Priya'} ${roomNum}-${bi2}`;
              await prisma.hostelAllotment.create({
                data: {
                  institutionId,
                  hostelId,
                  bedId: bed.id,
                  studentId: `STU-${prefix}-${roomNum}-${bi2}`,
                  studentName,
                  studentGender: gender,
                  admissionNumber: `ADM-${prefix}${fi}${ri}${bi2}`,
                  className: 'XII-A',
                  roomNumber: roomNum,
                  bedNumber: String(bi2),
                  allotmentDate: todayDate(),
                  status: 'ACTIVE',
                  allotmentStatus: 'CONFIRMED',
                  paymentStatus: 'PAID',
                  feeAmount: DEFAULT_HOSTEL_FEE,
                  invoiceNumber: nextInvoiceNumber(),
                  approvedBy: 'Hostel Admin',
                  notificationSent: true,
                  academicYear,
                },
              });
            }
          }
        }
      }
    }
    await syncHostelCounts(institutionId, hostelId);
  }

  await buildHostelMatrix(boysA.id, 'BHA', 'MALE');
  await buildHostelMatrix(girlsA.id, 'GHA', 'FEMALE');

  const requests = [
    ['Vikram Singh', 'MALE', 'B.Tech', 'Year 2', boysA.id, 0],
    ['Sneha Reddy', 'FEMALE', 'B.Sc', 'Year 1', girlsA.id, 2500],
    ['Arjun Nair', 'MALE', 'MBA', 'Year 1', boysA.id, 0],
  ] as const;

  for (const [name, gender, course, year, hostelId, fees] of requests) {
    await createAllotmentRequest(institutionId, {
      studentName: name,
      studentGender: gender,
      course,
      yearLabel: year,
      preferredHostelId: hostelId,
      academicYear,
      outstandingFees: fees,
      className: 'XII-A',
      admissionNumber: `ADM-REQ-${name.split(' ')[0]}`,
    });
  }

  await logActivity(institutionId, 'SEED_ROOMS', 'Rooms & Allotment demo data seeded');
  return getRoomsAllotment(institutionId);
}

export async function getStudentRoom(
  institutionId: string,
  studentId: string,
  academicYear = '2025-26',
) {
  const allotment = await getActiveAllotmentForStudent(institutionId, studentId, academicYear);
  if (!allotment?.bedId) return { allotted: false };

  const paths = await loadBedPaths(institutionId);
  const path = paths.get(allotment.bedId);
  const roommates = await prisma.hostelAllotment.findMany({
    where: {
      institutionId,
      academicYear,
      status: 'ACTIVE',
      roomNumber: allotment.roomNumber,
      hostelId: allotment.hostelId,
      NOT: { studentId },
    },
    select: { studentName: true, bedNumber: true },
  });

  const warden = await prisma.hostelStaff.findFirst({
    where: { institutionId, hostelId: allotment.hostelId, role: 'WARDEN' },
    select: { staffName: true, mobile: true },
  });

  return {
    allotted: true,
    student: { name: allotment.studentName, className: allotment.className },
    room: {
      block: path?.blockName,
      floor: path?.floorName,
      roomNumber: allotment.roomNumber,
      bedNumber: allotment.bedNumber,
      hostelName: path?.hostelName,
    },
    roommates,
    warden,
    paymentStatus: allotment.paymentStatus,
    feeAmount: formatInr(allotment.feeAmount),
  };
}
