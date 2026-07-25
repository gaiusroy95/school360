import { prisma } from './prisma.js';
import { seedLibraryGateAttendance } from './libraryGateAttendance.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(d: Date) {
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function minutesRemaining(endTime: Date, now = new Date()) {
  return Math.max(0, Math.round((endTime.getTime() - now.getTime()) / 60000));
}

function formatRemaining(mins: number) {
  if (mins <= 0) return 'Expired';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

async function logActivity(institutionId: string, action: string, details: string, entityId = '') {
  await prisma.libActivityLog.create({
    data: { institutionId, entityType: 'LibReadingRoom', entityId, action, details, performedBy: 'Librarian' },
  });
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.libSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.libSettings.create({ data: { institutionId } });
  }
  return row;
}

async function resolveMember(institutionId: string, memberCode: string) {
  const member = await prisma.libMember.findFirst({
    where: {
      institutionId,
      OR: [
        { memberCode: { equals: memberCode, mode: 'insensitive' } },
        { barcodeUid: { equals: memberCode, mode: 'insensitive' } },
        { id: memberCode },
      ],
    },
  });
  if (!member) throw new Error('Member not found');
  if (member.status !== 'ACTIVE') throw new Error('Member is not active');
  return member;
}

async function resolveReferenceBook(institutionId: string, bookCode: string) {
  const book = await prisma.libBook.findFirst({
    where: {
      institutionId,
      OR: [
        { bookCode: { equals: bookCode, mode: 'insensitive' } },
        { isbn: { equals: bookCode, mode: 'insensitive' } },
        { id: bookCode },
      ],
    },
    include: { category: true, copies: { where: { status: 'AVAILABLE' }, take: 1 } },
  });
  if (!book) throw new Error('Book not found');
  const isReference = book.inHouseOnly || book.category?.issuable === false;
  if (!isReference) {
    throw new Error('Only reference / non-circulating books can be issued for reading room use');
  }
  return book;
}

function mapBookingRow(
  booking: {
    id: string;
    startTime: Date;
    endTime: Date;
    occupiedAt: Date | null;
    vacatedAt: Date | null;
    gateDeadline: Date;
    status: string;
    reminderSent: boolean;
    seat: { seatCode: string; floorZone: string; seatType: string };
    member: { memberCode: string; memberName: string; className: string; sectionName: string };
  },
  now = new Date(),
) {
  const remaining = booking.status === 'OCCUPIED' || booking.status === 'BOOKED'
    ? minutesRemaining(booking.endTime, now)
    : 0;
  return {
    id: booking.id,
    seatCode: booking.seat.seatCode,
    floorZone: booking.seat.floorZone,
    seatType: booking.seat.seatType,
    memberCode: booking.member.memberCode,
    memberName: booking.member.memberName,
    className: `${booking.member.className}${booking.member.sectionName ? `-${booking.member.sectionName}` : ''}`,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    startFormatted: formatTime(booking.startTime),
    endFormatted: formatTime(booking.endTime),
    occupiedAt: booking.occupiedAt?.toISOString() ?? null,
    vacatedAt: booking.vacatedAt?.toISOString() ?? null,
    gateDeadline: booking.gateDeadline.toISOString(),
    status: booking.status,
    timeRemainingMins: remaining,
    timeRemainingFormatted: formatRemaining(remaining),
    reminderSent: booking.reminderSent,
  };
}

function mapInHouseTxn(txn: {
  id: string;
  txnNumber: string;
  issueTime: Date;
  returnTime: Date | null;
  status: string;
  rfidAlarmActive: boolean;
  issuedBy: string;
  member: { memberCode: string; memberName: string };
  book: { bookCode: string; title: string };
  seat: { seatCode: string } | null;
}) {
  return {
    id: txn.id,
    txnNumber: txn.txnNumber,
    memberCode: txn.member.memberCode,
    memberName: txn.member.memberName,
    bookCode: txn.book.bookCode,
    bookTitle: txn.book.title,
    seatCode: txn.seat?.seatCode ?? '—',
    issueTime: txn.issueTime.toISOString(),
    issueFormatted: formatDateTime(txn.issueTime),
    returnTime: txn.returnTime?.toISOString() ?? null,
    returnFormatted: txn.returnTime ? formatDateTime(txn.returnTime) : '—',
    status: txn.status,
    rfidAlarmActive: txn.rfidAlarmActive,
    issuedBy: txn.issuedBy,
  };
}

function seatDisplayStatus(
  seat: { status: string },
  activeBooking: { status: string } | null,
) {
  if (seat.status === 'MAINTENANCE') return 'MAINTENANCE';
  if (!activeBooking) return 'AVAILABLE';
  if (activeBooking.status === 'BOOKED') return 'BOOKED';
  if (activeBooking.status === 'OCCUPIED') return 'OCCUPIED';
  return 'AVAILABLE';
}

export async function processReadingRoomAutomation(institutionId: string) {
  const settings = await ensureSettings(institutionId);
  const now = new Date();
  let autoCancelled = 0;
  let remindersSent = 0;

  const overdueBookings = await prisma.libReadingSeatBooking.findMany({
    where: {
      institutionId,
      status: 'BOOKED',
      gateDeadline: { lt: now },
    },
    include: { member: true, seat: true },
  });

  for (const booking of overdueBookings) {
    const gateEntry = await prisma.libGateLog.findFirst({
      where: {
        institutionId,
        memberId: booking.memberId,
        entryTime: { gte: booking.startTime, lte: booking.gateDeadline },
      },
    });
    if (!gateEntry) {
      await prisma.libReadingSeatBooking.update({
        where: { id: booking.id },
        data: { status: 'AUTO_CANCELLED', vacatedAt: now },
      });
      autoCancelled += 1;
      await logActivity(
        institutionId,
        'AUTO_CANCEL',
        `Seat ${booking.seat.seatCode} booking auto-cancelled — ${booking.member.memberName} did not check in at gate within ${settings.readingRoomBookingGraceMins} min`,
        booking.id,
      );
    }
  }

  const reminderCutoff = new Date(now.getTime() + settings.readingRoomReminderMins * 60000);
  const expiringSoon = await prisma.libReadingSeatBooking.findMany({
    where: {
      institutionId,
      status: { in: ['BOOKED', 'OCCUPIED'] },
      endTime: { gt: now, lte: reminderCutoff },
      reminderSent: false,
    },
    include: { member: true, seat: true },
  });

  for (const booking of expiringSoon) {
    await prisma.libReadingSeatBooking.update({
      where: { id: booking.id },
      data: { reminderSent: true, reminderSentAt: now },
    });
    remindersSent += 1;
    await logActivity(
      institutionId,
      'REMINDER',
      `App reminder sent to ${booking.member.memberName} — seat ${booking.seat.seatCode} expires in ${settings.readingRoomReminderMins} min`,
      booking.id,
    );
  }

  return { autoCancelled, remindersSent };
}

export async function getLibraryReadingRoom(institutionId: string, academicYear = '2025-26', branchId?: string) {
  await processReadingRoomAutomation(institutionId);
  const settings = await ensureSettings(institutionId);
  const branchFilter = branchId ? { branchId } : {};
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [branches, seats, activeBookings, todayBookings, monthBookings, activeInHouse, referenceBooks] = await Promise.all([
    prisma.libBranch.findMany({ where: { institutionId, status: 'ACTIVE' }, orderBy: { branchName: 'asc' } }),
    prisma.libReadingSeat.findMany({
      where: { institutionId, status: { in: ['ACTIVE', 'MAINTENANCE'] }, ...branchFilter },
      orderBy: [{ rowIndex: 'asc' }, { colIndex: 'asc' }],
    }),
    prisma.libReadingSeatBooking.findMany({
      where: {
        institutionId,
        academicYear,
        status: { in: ['BOOKED', 'OCCUPIED'] },
        ...branchFilter,
      },
      include: { member: true, seat: true },
      orderBy: { startTime: 'asc' },
    }),
    prisma.libReadingSeatBooking.findMany({
      where: { institutionId, academicYear, startTime: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }, ...branchFilter },
      include: { member: true, seat: true },
      orderBy: { startTime: 'desc' },
      take: 100,
    }),
    prisma.libReadingSeatBooking.findMany({
      where: { institutionId, academicYear, startTime: { gte: monthStart }, ...branchFilter },
      select: { seatId: true, status: true, startTime: true, endTime: true, occupiedAt: true, vacatedAt: true },
    }),
    prisma.libInHouseTxn.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE', ...branchFilter },
      include: { member: true, book: true, seat: true },
      orderBy: { issueTime: 'desc' },
    }),
    prisma.libBook.findMany({
      where: {
        institutionId,
        OR: [{ inHouseOnly: true }, { category: { issuable: false } }],
        ...branchFilter,
      },
      select: { id: true, bookCode: true, title: true, author: true },
      take: 30,
      orderBy: { issueCount: 'desc' },
    }),
  ]);

  const bookingBySeat = new Map(activeBookings.map((b) => [b.seatId, b]));
  const floorPlan = seats.map((seat) => {
    const booking = bookingBySeat.get(seat.id) ?? null;
    const displayStatus = seatDisplayStatus(seat, booking);
    return {
      id: seat.id,
      seatCode: seat.seatCode,
      floorZone: seat.floorZone,
      rowIndex: seat.rowIndex,
      colIndex: seat.colIndex,
      seatType: seat.seatType,
      hasPower: seat.hasPower,
      hasLamp: seat.hasLamp,
      status: displayStatus,
      currentBooking: booking ? mapBookingRow(booking, now) : null,
    };
  });

  const occupiedCount = floorPlan.filter((s) => s.status === 'OCCUPIED').length;
  const bookedCount = floorPlan.filter((s) => s.status === 'BOOKED').length;
  const availableCount = floorPlan.filter((s) => s.status === 'AVAILABLE').length;

  const totalSeatMinutes = monthBookings.reduce((sum, b) => {
    if (b.status !== 'VACATED' && b.status !== 'OCCUPIED') return sum;
    const start = b.occupiedAt ?? b.startTime;
    const end = b.vacatedAt ?? b.endTime;
    return sum + Math.max(0, (end.getTime() - start.getTime()) / 60000);
  }, 0);
  const totalPossibleMinutes = seats.filter((s) => s.status === 'ACTIVE').length * 8 * 60 * Math.max(1, now.getDate());
  const seatUtilizationRate = totalPossibleMinutes > 0
    ? Math.round((totalSeatMinutes / totalPossibleMinutes) * 100)
    : 0;

  const bookConsultCounts = await prisma.libInHouseTxn.groupBy({
    by: ['bookId'],
    where: { institutionId, academicYear, ...branchFilter },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });
  const bookIds = bookConsultCounts.map((b) => b.bookId);
  const booksById = bookIds.length
    ? new Map(
      (await prisma.libBook.findMany({ where: { id: { in: bookIds } }, select: { id: true, title: true, bookCode: true } }))
        .map((b) => [b.id, b]),
    )
    : new Map<string, { id: string; title: string; bookCode: string }>();

  const mostConsultedBooks = bookConsultCounts.map((row) => {
    const book = booksById.get(row.bookId);
    return {
      bookCode: book?.bookCode ?? '—',
      title: book?.title ?? 'Unknown',
      consultations: row._count.id,
    };
  });

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    branches: branches.map((b) => ({ id: b.id, code: b.branchCode, name: b.branchName })),
    selectedBranchId: branchId ?? branches[0]?.id ?? '',
    settings: {
      bookingGraceMins: settings.readingRoomBookingGraceMins,
      reminderBeforeMins: settings.readingRoomReminderMins,
    },
    kpis: {
      totalSeats: seats.length,
      available: availableCount,
      booked: bookedCount,
      occupied: occupiedCount,
      activeInHouseIssues: activeInHouse.length,
      seatUtilizationRate,
    },
    floorPlan,
    currentOccupancy: activeBookings
      .filter((b) => b.status === 'OCCUPIED')
      .map((b) => mapBookingRow(b, now)),
    dailyBookings: todayBookings.map((b) => mapBookingRow(b, now)),
    activeInHouseTxns: activeInHouse.map(mapInHouseTxn),
    referenceBooks,
    reports: {
      seatUtilizationRate,
      mostConsultedBooks,
    },
    automationRules: [
      `Seat booking auto-cancels if member does not check in at gate within ${settings.readingRoomBookingGraceMins} minutes`,
      `App reminder ${settings.readingRoomReminderMins} minutes before seat booking expires`,
      'Reference books trigger RFID security gate alarm if taken outside premises',
    ],
    notifications: [
      `App reminder ${settings.readingRoomReminderMins} min before seat slot expires`,
    ],
    mobileSync: ['Student app: view available seats and book study slots in advance'],
    roles: ['Librarian'],
    validationRules: [
      'Reference / non-circulating books only for in-house issue',
      'RFID alarm active on in-house reference issues',
    ],
  };
}

export async function bookReadingSeat(
  institutionId: string,
  data: {
    seatId: string;
    memberCode: string;
    startTime: string;
    endTime: string;
    academicYear?: string;
    performedBy?: string;
  },
) {
  const settings = await ensureSettings(institutionId);
  const member = await resolveMember(institutionId, data.memberCode);
  const seat = await prisma.libReadingSeat.findFirst({
    where: { institutionId, id: data.seatId, status: 'ACTIVE' },
  });
  if (!seat) throw new Error('Seat not found or under maintenance');

  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);
  if (endTime <= startTime) throw new Error('End time must be after start time');

  const conflict = await prisma.libReadingSeatBooking.findFirst({
    where: {
      institutionId,
      seatId: seat.id,
      status: { in: ['BOOKED', 'OCCUPIED'] },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });
  if (conflict) throw new Error(`Seat ${seat.seatCode} is not available for the selected slot`);

  const gateDeadline = new Date(startTime.getTime() + settings.readingRoomBookingGraceMins * 60000);

  const booking = await prisma.libReadingSeatBooking.create({
    data: {
      institutionId,
      branchId: seat.branchId,
      seatId: seat.id,
      memberId: member.id,
      startTime,
      endTime,
      gateDeadline,
      status: 'BOOKED',
      academicYear: data.academicYear ?? '2025-26',
      performedBy: data.performedBy ?? 'Librarian',
    },
    include: { member: true, seat: true },
  });

  await logActivity(
    institutionId,
    'BOOK_SEAT',
    `${member.memberName} booked seat ${seat.seatCode} (${formatTime(startTime)} – ${formatTime(endTime)})`,
    booking.id,
  );

  return {
    success: true,
    message: `Seat ${seat.seatCode} booked for ${member.memberName}. Check in at gate within ${settings.readingRoomBookingGraceMins} min of start.`,
    booking: mapBookingRow(booking),
    data: await getLibraryReadingRoom(institutionId, data.academicYear ?? '2025-26'),
  };
}

export async function occupyReadingSeat(
  institutionId: string,
  data: { bookingId?: string; seatId?: string; memberCode?: string; performedBy?: string },
) {
  const booking = data.bookingId
    ? await prisma.libReadingSeatBooking.findFirst({
      where: { institutionId, id: data.bookingId, status: 'BOOKED' },
      include: { member: true, seat: true },
    })
    : await prisma.libReadingSeatBooking.findFirst({
      where: {
        institutionId,
        seatId: data.seatId,
        status: 'BOOKED',
        ...(data.memberCode
          ? { member: { OR: [{ memberCode: data.memberCode }, { barcodeUid: data.memberCode }] } }
          : {}),
      },
      include: { member: true, seat: true },
      orderBy: { startTime: 'asc' },
    });

  if (!booking) throw new Error('No booked seat found to occupy');

  const now = new Date();
  if (now > booking.gateDeadline) {
    const gateEntry = await prisma.libGateLog.findFirst({
      where: {
        institutionId,
        memberId: booking.memberId,
        entryTime: { gte: booking.startTime, lte: booking.gateDeadline },
      },
    });
    if (!gateEntry) {
      await prisma.libReadingSeatBooking.update({
        where: { id: booking.id },
        data: { status: 'AUTO_CANCELLED', vacatedAt: now },
      });
      throw new Error('Booking auto-cancelled — member did not check in at gate within grace period');
    }
  }

  const updated = await prisma.libReadingSeatBooking.update({
    where: { id: booking.id },
    data: { status: 'OCCUPIED', occupiedAt: now },
    include: { member: true, seat: true },
  });

  await logActivity(
    institutionId,
    'OCCUPY_SEAT',
    `${updated.member.memberName} occupied seat ${updated.seat.seatCode}`,
    updated.id,
  );

  return {
    success: true,
    message: `Seat ${updated.seat.seatCode} occupied by ${updated.member.memberName}`,
    booking: mapBookingRow(updated),
    data: await getLibraryReadingRoom(institutionId, updated.academicYear),
  };
}

export async function vacateReadingSeat(
  institutionId: string,
  data: { bookingId?: string; seatId?: string; memberCode?: string },
) {
  const booking = data.bookingId
    ? await prisma.libReadingSeatBooking.findFirst({
      where: { institutionId, id: data.bookingId, status: { in: ['BOOKED', 'OCCUPIED'] } },
      include: { member: true, seat: true },
    })
    : await prisma.libReadingSeatBooking.findFirst({
      where: {
        institutionId,
        seatId: data.seatId,
        status: { in: ['BOOKED', 'OCCUPIED'] },
        ...(data.memberCode
          ? { member: { OR: [{ memberCode: data.memberCode }, { barcodeUid: data.memberCode }] } }
          : {}),
      },
      include: { member: true, seat: true },
      orderBy: { startTime: 'desc' },
    });

  if (!booking) throw new Error('No active seat booking found');

  const now = new Date();
  const updated = await prisma.libReadingSeatBooking.update({
    where: { id: booking.id },
    data: { status: 'VACATED', vacatedAt: now },
    include: { member: true, seat: true },
  });

  await logActivity(
    institutionId,
    'VACATE_SEAT',
    `${updated.member.memberName} vacated seat ${updated.seat.seatCode}`,
    updated.id,
  );

  return {
    success: true,
    message: `Seat ${updated.seat.seatCode} vacated`,
    booking: mapBookingRow(updated),
    data: await getLibraryReadingRoom(institutionId, updated.academicYear),
  };
}

export async function issueInHouseBook(
  institutionId: string,
  data: {
    memberCode: string;
    bookCode: string;
    seatId?: string;
    academicYear?: string;
    issuedBy?: string;
  },
) {
  const member = await resolveMember(institutionId, data.memberCode);
  const book = await resolveReferenceBook(institutionId, data.bookCode);
  const copy = book.copies[0] ?? null;

  const existing = await prisma.libInHouseTxn.findFirst({
    where: { institutionId, memberId: member.id, bookId: book.id, status: 'ACTIVE' },
  });
  if (existing) throw new Error(`${member.memberName} already has this reference book issued in-house`);

  const txnCount = await prisma.libInHouseTxn.count({ where: { institutionId } });
  const txnNumber = `IH-${String(txnCount + 1).padStart(5, '0')}`;

  const txn = await prisma.libInHouseTxn.create({
    data: {
      institutionId,
      branchId: book.branchId,
      memberId: member.id,
      bookId: book.id,
      copyId: copy?.id,
      seatId: data.seatId || undefined,
      txnNumber,
      rfidAlarmActive: true,
      academicYear: data.academicYear ?? '2025-26',
      issuedBy: data.issuedBy ?? 'Librarian',
    },
    include: { member: true, book: true, seat: true },
  });

  if (copy) {
    await prisma.libBookCopy.update({ where: { id: copy.id }, data: { status: 'IN_HOUSE_USE' } });
  }
  await prisma.libBook.update({ where: { id: book.id }, data: { issueCount: { increment: 1 } } });

  await logActivity(
    institutionId,
    'IN_HOUSE_ISSUE',
    `Reference book "${book.title}" issued to ${member.memberName} (RFID alarm ON)`,
    txn.id,
  );

  return {
    success: true,
    message: `Reference book "${book.title}" issued to ${member.memberName}. RFID gate alarm active — must return before leaving.`,
    txn: mapInHouseTxn(txn),
    rfidAlarm: { active: true, message: 'Security gate will alarm if book taken outside library' },
    data: await getLibraryReadingRoom(institutionId, data.academicYear ?? '2025-26'),
  };
}

export async function returnInHouseBook(
  institutionId: string,
  data: { txnId?: string; memberCode?: string; bookCode?: string; returnedBy?: string },
) {
  const txn = data.txnId
    ? await prisma.libInHouseTxn.findFirst({
      where: { institutionId, id: data.txnId, status: 'ACTIVE' },
      include: { member: true, book: true, seat: true, copy: true },
    })
    : await prisma.libInHouseTxn.findFirst({
      where: {
        institutionId,
        status: 'ACTIVE',
        ...(data.memberCode
          ? { member: { OR: [{ memberCode: data.memberCode }, { barcodeUid: data.memberCode }] } }
          : {}),
        ...(data.bookCode ? { book: { bookCode: data.bookCode } } : {}),
      },
      include: { member: true, book: true, seat: true, copy: true },
      orderBy: { issueTime: 'desc' },
    });

  if (!txn) throw new Error('No active in-house issue found');

  const updated = await prisma.libInHouseTxn.update({
    where: { id: txn.id },
    data: { status: 'RETURNED', returnTime: new Date(), returnedBy: data.returnedBy ?? 'Librarian' },
    include: { member: true, book: true, seat: true },
  });

  if (txn.copyId) {
    await prisma.libBookCopy.update({ where: { id: txn.copyId }, data: { status: 'AVAILABLE' } });
  }

  await logActivity(
    institutionId,
    'IN_HOUSE_RETURN',
    `Reference book "${txn.book.title}" returned by ${txn.member.memberName}`,
    txn.id,
  );

  return {
    success: true,
    message: `Reference book "${txn.book.title}" returned. RFID alarm deactivated.`,
    txn: mapInHouseTxn(updated),
    data: await getLibraryReadingRoom(institutionId, updated.academicYear),
  };
}

export async function seedLibraryReadingRoom(institutionId: string) {
  await seedLibraryGateAttendance(institutionId);

  const existing = await prisma.libReadingSeat.count({ where: { institutionId } });
  if (existing >= 12) return getLibraryReadingRoom(institutionId);

  const branch = await prisma.libBranch.findFirst({ where: { institutionId, status: 'ACTIVE' } });
  if (!branch) return getLibraryReadingRoom(institutionId);

  const members = await prisma.libMember.findMany({ where: { institutionId, status: 'ACTIVE' }, take: 8 });
  const settings = await ensureSettings(institutionId);

  const zones = ['Ground Floor - Zone A', 'Ground Floor - Zone B', 'First Floor - Carrels'];
  const seatTypes = ['CARREL', 'TABLE', 'DESK'];
  const seats: { id: string; seatCode: string }[] = [];

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const idx = row * 4 + col;
      const seat = await prisma.libReadingSeat.create({
        data: {
          institutionId,
          branchId: branch.id,
          seatCode: `RR-${String.fromCharCode(65 + row)}${col + 1}`,
          floorZone: zones[row] ?? 'Ground Floor',
          rowIndex: row,
          colIndex: col,
          seatType: seatTypes[row] ?? 'CARREL',
          hasPower: col % 2 === 0,
          hasLamp: true,
          status: idx === 11 ? 'MAINTENANCE' : 'ACTIVE',
        },
      });
      seats.push({ id: seat.id, seatCode: seat.seatCode });
    }
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);

  for (let i = 0; i < 5; i += 1) {
    const member = members[i % members.length];
    const seat = seats[i];
    if (!member || !seat) break;

    const startTime = new Date(todayStart.getTime() + i * 90 * 60000);
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60000);
    const gateDeadline = new Date(startTime.getTime() + settings.readingRoomBookingGraceMins * 60000);
    const status = i < 2 ? 'OCCUPIED' : i < 4 ? 'BOOKED' : 'VACATED';

    await prisma.libReadingSeatBooking.create({
      data: {
        institutionId,
        branchId: branch.id,
        seatId: seat.id,
        memberId: member.id,
        startTime,
        endTime,
        gateDeadline,
        occupiedAt: status === 'OCCUPIED' || status === 'VACATED' ? startTime : null,
        vacatedAt: status === 'VACATED' ? endTime : null,
        status,
        academicYear: '2025-26',
      },
    });
  }

  const refBooks = await prisma.libBook.findMany({ where: { institutionId }, take: 5 });
  for (let i = 0; i < refBooks.length; i += 1) {
    await prisma.libBook.update({
      where: { id: refBooks[i].id },
      data: { inHouseOnly: i < 3 },
    });
  }

  const refMember = members[0];
  const refBook = refBooks.find((b) => b) ?? refBooks[0];
  if (refMember && refBook) {
    const copy = await prisma.libBookCopy.findFirst({ where: { bookId: refBook.id } });
    await prisma.libInHouseTxn.create({
      data: {
        institutionId,
        branchId: branch.id,
        memberId: refMember.id,
        bookId: refBook.id,
        copyId: copy?.id,
        seatId: seats[0]?.id,
        txnNumber: 'IH-00001',
        status: 'ACTIVE',
        rfidAlarmActive: true,
        academicYear: '2025-26',
      },
    });
    if (copy) {
      await prisma.libBookCopy.update({ where: { id: copy.id }, data: { status: 'IN_HOUSE_USE', rfidTagId: `RFID-${copy.copyCode}` } });
    }
  }

  for (let i = 1; i < 4; i += 1) {
    const m = members[i];
    const b = refBooks[i];
    if (!m || !b) break;
    await prisma.libInHouseTxn.create({
      data: {
        institutionId,
        branchId: branch.id,
        memberId: m.id,
        bookId: b.id,
        txnNumber: `IH-0000${i + 1}`,
        status: 'RETURNED',
        returnTime: new Date(now.getTime() - i * 3600000),
        rfidAlarmActive: true,
        academicYear: '2025-26',
      },
    });
  }

  await logActivity(institutionId, 'SEED', 'Reading room demo data seeded');
  return getLibraryReadingRoom(institutionId);
}
