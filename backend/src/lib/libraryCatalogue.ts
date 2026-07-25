import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedLibraryDashboard } from './libraryDashboard.js';
import { formatLocationLabel } from './libraryRacks.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const HIGH_DEMAND_THRESHOLD = 3;

type CatalogueFilters = {
  q?: string;
  categoryId?: string;
  branchId?: string;
  availability?: string;
  resourceType?: string;
  author?: string;
  publisher?: string;
  tag?: string;
  academicYear?: string;
};

function parseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.map(String);
  return [];
}

function computeAvailabilityStatus(
  availableCopies: number,
  pendingReservations: number,
): 'AVAILABLE' | 'ISSUED' | 'RESERVED' {
  if (availableCopies > 0) return 'AVAILABLE';
  if (pendingReservations > 0) return 'RESERVED';
  return 'ISSUED';
}

async function logActivity(
  institutionId: string,
  entityType: string,
  action: string,
  details = '',
  entityId = '',
) {
  await prisma.libActivityLog.create({
    data: { institutionId, entityType, entityId, action, details, performedBy: 'OPAC' },
  });
}

async function recordSearch(
  institutionId: string,
  query: string,
  filters: CatalogueFilters,
  resultCount: number,
  searchedBy = 'OPAC User',
  searchedByRole = 'STUDENT',
) {
  await prisma.libSearchLog.create({
    data: {
      institutionId,
      query: query || '(browse)',
      filters: filters as Prisma.InputJsonValue,
      resultCount,
      searchedBy,
      searchedByRole,
    },
  });
  if (query.trim()) {
    const books = await prisma.libBook.findMany({
      where: {
        institutionId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { author: { contains: query, mode: 'insensitive' } },
          { isbn: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
    for (const book of books) {
      await prisma.libBook.update({
        where: { id: book.id },
        data: { searchCount: { increment: 1 } },
      });
    }
  }
}

function mapBookRow(
  book: {
    id: string;
    bookCode: string;
    title: string;
    author: string;
    isbn: string;
    publisher: string;
    edition: string;
    summary: string;
    coverImageUrl: string;
    coverColor: string;
    tags: unknown;
    resourceType: string;
    totalCopies: number;
    availableCopies: number;
    issueCount: number;
    searchCount: number;
    viewCount: number;
    isNewArrival: boolean;
    category: { categoryName: string; color: string } | null;
    branch: { branchName: string };
    authorRef: { authorName: string } | null;
    publisherRef: { publisherName: string } | null;
    _count?: { reservations: number };
  },
  pendingReservations: number,
) {
  const availabilityStatus = computeAvailabilityStatus(book.availableCopies, pendingReservations);
  const tags = parseTags(book.tags);
  return {
    id: book.id,
    bookCode: book.bookCode,
    title: book.title,
    author: book.authorRef?.authorName || book.author,
    publisher: book.publisherRef?.publisherName || book.publisher,
    category: book.category?.categoryName ?? 'General',
    categoryColor: book.category?.color ?? '#64748b',
    branch: book.branch.branchName,
    isbn: book.isbn,
    edition: book.edition,
    summary: book.summary,
    coverImageUrl: book.coverImageUrl,
    coverColor: book.coverColor,
    tags,
    resourceType: book.resourceType,
    totalCopies: book.totalCopies,
    availableCopies: book.availableCopies,
    availabilityStatus,
    canReserve: book.availableCopies <= 0 && availabilityStatus === 'ISSUED',
    issueCount: book.issueCount,
    searchCount: book.searchCount,
    viewCount: book.viewCount,
    popularityScore: book.issueCount + book.searchCount + book.viewCount,
    isNewArrival: book.isNewArrival,
    pendingReservations,
  };
}

export async function getBookCatalogue(
  institutionId: string,
  filters: CatalogueFilters = {},
  page = 1,
  pageSize = 12,
) {
  const academicYear = filters.academicYear ?? '2025-26';
  const where: Prisma.LibBookWhereInput = {
    institutionId,
    academicYear,
  };

  if (filters.branchId && filters.branchId !== 'ALL') {
    where.branchId = filters.branchId;
  }
  if (filters.categoryId && filters.categoryId !== 'ALL') {
    where.categoryId = filters.categoryId;
  }
  if (filters.resourceType && filters.resourceType !== 'ALL') {
    where.resourceType = filters.resourceType;
  }
  if (filters.author) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { author: { contains: filters.author, mode: 'insensitive' } },
          { authorRef: { authorName: { contains: filters.author, mode: 'insensitive' } } },
        ],
      },
    ];
  }
  if (filters.publisher) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { publisher: { contains: filters.publisher, mode: 'insensitive' } },
          { publisherRef: { publisherName: { contains: filters.publisher, mode: 'insensitive' } } },
        ],
      },
    ];
  }
  if (filters.tag) {
    // tags stored as JSON array — filter in application layer after fetch if needed
  }

  const q = (filters.q ?? '').trim();
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { author: { contains: q, mode: 'insensitive' } },
      { isbn: { contains: q, mode: 'insensitive' } },
      { bookCode: { contains: q, mode: 'insensitive' } },
      { publisher: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [books, total, categories, branches, members] = await Promise.all([
    prisma.libBook.findMany({
      where,
      include: {
        category: true,
        branch: true,
        authorRef: true,
        publisherRef: true,
        _count: { select: { reservations: { where: { status: 'PENDING' } } } },
      },
      orderBy: [{ searchCount: 'desc' }, { viewCount: 'desc' }, { title: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.libBook.count({ where }),
    prisma.libCategory.findMany({ where: { institutionId }, orderBy: { categoryName: 'asc' } }),
    prisma.libBranch.findMany({ where: { institutionId, status: 'ACTIVE' }, orderBy: { branchName: 'asc' } }),
    prisma.libMember.findMany({
      where: { institutionId, status: 'ACTIVE', academicYear },
      take: 20,
      orderBy: { memberName: 'asc' },
    }),
  ]);

  let rows = books.map((b) => mapBookRow(b, b._count.reservations));

  if (filters.tag) {
    const tagLower = filters.tag.toLowerCase();
    rows = rows.filter((r) => r.tags.some((t) => t.toLowerCase().includes(tagLower)));
  }
  if (filters.availability && filters.availability !== 'ALL') {
    rows = rows.filter((r) => r.availabilityStatus === filters.availability);
  }

  await recordSearch(institutionId, q, filters, rows.length);

  const [mostSearched, zeroResultQueries] = await Promise.all([
    prisma.libBook.findMany({
      where: { institutionId, academicYear },
      orderBy: { searchCount: 'desc' },
      take: 5,
      select: { title: true, searchCount: true, viewCount: true, issueCount: true },
    }),
    prisma.libSearchLog.findMany({
      where: { institutionId, resultCount: 0 },
      orderBy: { createdAt: 'desc' },
      take: 5,
      distinct: ['query'],
    }),
  ]);

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    branches: branches.map((b) => ({ id: b.id, name: b.branchName })),
    categories: categories.map((c) => ({ id: c.id, name: c.categoryName, color: c.color })),
    members: members.map((m) => ({ id: m.id, name: m.memberName, code: m.memberCode, type: m.memberType })),
    availabilityOptions: ['ALL', 'AVAILABLE', 'ISSUED', 'RESERVED'],
    resourceTypes: ['ALL', 'PHYSICAL', 'DIGITAL'],
    books: rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    reports: {
      mostSearched: mostSearched.map((b) => ({
        title: b.title,
        searchCount: b.searchCount,
        popularityScore: b.searchCount + b.viewCount + b.issueCount,
      })),
      zeroResultQueries: zeroResultQueries.map((s) => ({
        query: s.query,
        searchedAt: s.createdAt.toISOString(),
      })),
    },
    roleAccess: ['Student', 'Parent', 'Staff', 'Teacher', 'Admin', 'Librarian'],
    mobileSync: ['Full OPAC search', 'Reserve button', 'Availability badge', 'Barcode/ISBN scan'],
  };
}

export async function getBookCatalogueDetail(institutionId: string, bookId: string) {
  const book = await prisma.libBook.findFirst({
    where: { institutionId, id: bookId },
    include: {
      category: true,
      branch: true,
      authorRef: true,
      publisherRef: true,
      copies: { orderBy: { copyCode: 'asc' }, include: { shelf: { include: { rack: { include: { location: { include: { parent: true } } } } } } } },
      _count: { select: { reservations: { where: { status: 'PENDING' } } } },
    },
  });
  if (!book) throw new Error('Book not found');

  await prisma.libBook.update({
    where: { id: bookId },
    data: { viewCount: { increment: 1 } },
  });

  const pendingReservations = await prisma.libReservation.findMany({
    where: { institutionId, bookId, status: 'PENDING' },
    include: { member: true },
    orderBy: { reservedAt: 'asc' },
    take: 10,
  });

  return {
    ...mapBookRow(book, book._count.reservations),
    copies: book.copies.map((c) => {
      const shelf = c.shelf;
      const locationLabel = shelf
        ? formatLocationLabel({
            floorName: shelf.rack.location.parent?.locationName,
            aisleName: shelf.rack.location.locationName,
            rackNumber: shelf.rack.rackNumber,
            shelfNumber: shelf.shelfNumber,
          })
        : c.rackLocation;
      return {
        id: c.id,
        copyCode: c.copyCode,
        rackLocation: locationLabel,
        locationLabel,
        status: c.status,
      };
    }),
    reservationQueue: pendingReservations.map((r, i) => ({
      position: i + 1,
      memberName: r.member.memberName,
      reservedAt: r.reservedAt.toISOString(),
    })),
  };
}

export async function reserveBook(
  institutionId: string,
  bookId: string,
  memberId: string,
  academicYear = '2025-26',
) {
  const book = await prisma.libBook.findFirst({
    where: { institutionId, id: bookId },
    include: { _count: { select: { reservations: { where: { status: 'PENDING' } } } } },
  });
  if (!book) throw new Error('Book not found');

  if (book.availableCopies > 0) {
    throw new Error('Cannot reserve — copies are available on the shelf. Please issue the book directly.');
  }

  const member = await prisma.libMember.findFirst({
    where: { institutionId, id: memberId, status: 'ACTIVE' },
  });
  if (!member) throw new Error('Member not found');

  const existing = await prisma.libReservation.findFirst({
    where: { institutionId, bookId, memberId, status: 'PENDING' },
  });
  if (existing) throw new Error('You already have a pending reservation for this book.');

  const reservation = await prisma.libReservation.create({
    data: { institutionId, bookId, memberId, academicYear, status: 'PENDING' },
  });

  const pendingCount = book._count.reservations + 1;
  if (pendingCount >= HIGH_DEMAND_THRESHOLD) {
    await logActivity(
      institutionId,
      'LibBook',
      'HIGH_DEMAND_ALERT',
      `"${book.title}" has ${pendingCount} pending reservations — librarian notified`,
      bookId,
    );
  }

  if (book.availableCopies <= 0) {
    await prisma.libBook.update({
      where: { id: bookId },
      data: { status: 'RESERVED' },
    });
  }

  await logActivity(
    institutionId,
    'LibReservation',
    'RESERVE',
    `${member.memberName} reserved "${book.title}"`,
    reservation.id,
  );

  return {
    reservationId: reservation.id,
    message: `Reservation placed for "${book.title}". You are #${pendingCount} in queue.`,
    queuePosition: pendingCount,
  };
}

export async function seedBookCatalogue(institutionId: string) {
  const bookCount = await prisma.libBook.count({ where: { institutionId } });
  if (bookCount < 5) {
    await seedLibraryDashboard(institutionId);
  }

  const enriched = await prisma.libBook.count({
    where: { institutionId, isbn: { not: '' } },
  });
  if (enriched >= 10) {
    return getBookCatalogue(institutionId);
  }

  const catalogueMeta: Record<string, {
    isbn: string; edition: string; publisher: string; summary: string;
    tags: string[]; resourceType: string;
  }> = {
    'Wings of Fire': {
      isbn: '978-8173711461', edition: '1st', publisher: 'Universities Press',
      summary: 'Autobiography of Dr. A.P.J. Abdul Kalam, inspiring millions of young readers.',
      tags: ['biography', 'inspiration', 'science'], resourceType: 'PHYSICAL',
    },
    'The Alchemist': {
      isbn: '978-0062315007', edition: '25th Anniversary', publisher: 'HarperOne',
      summary: 'A philosophical novel about following your dreams and listening to your heart.',
      tags: ['fiction', 'philosophy', 'bestseller'], resourceType: 'PHYSICAL',
    },
    "Harry Potter & Philosopher's Stone": {
      isbn: '978-0747532699', edition: '1st', publisher: 'Bloomsbury',
      summary: 'The boy who lived begins his magical journey at Hogwarts School of Witchcraft and Wizardry.',
      tags: ['fiction', 'fantasy', 'children'], resourceType: 'PHYSICAL',
    },
    'Atomic Habits': {
      isbn: '978-0735211292', edition: '1st', publisher: 'Avery',
      summary: 'Practical strategies to build good habits and break bad ones.',
      tags: ['self-help', 'productivity'], resourceType: 'PHYSICAL',
    },
    'Think & Grow Rich': {
      isbn: '978-1585424337', edition: 'Revised', publisher: 'TarcherPerigee',
      summary: 'Classic guide to personal achievement and wealth creation principles.',
      tags: ['self-help', 'finance', 'classic'], resourceType: 'PHYSICAL',
    },
    'NCERT Physics Part - I': {
      isbn: '978-8174506318', edition: '2024-25', publisher: 'NCERT',
      summary: 'Official NCERT textbook for Class XI Physics — Part I.',
      tags: ['academic', 'physics', 'ncert'], resourceType: 'PHYSICAL',
    },
    'Science Explorer': {
      isbn: '978-9352534021', edition: '3rd', publisher: 'Pearson',
      summary: 'Comprehensive science reference for middle school students.',
      tags: ['science', 'reference', 'academic'], resourceType: 'PHYSICAL',
    },
    'Rich Dad Poor Dad': {
      isbn: '978-1612680194', edition: '20th Anniversary', publisher: 'Plata Publishing',
      summary: 'Personal finance lessons contrasting two father figures and their money philosophies.',
      tags: ['finance', 'self-help'], resourceType: 'PHYSICAL',
    },
    'Sapiens': {
      isbn: '978-0062316097', edition: '1st', publisher: 'Harper',
      summary: 'A brief history of humankind from the Stone Age to the modern age.',
      tags: ['history', 'anthropology', 'bestseller'], resourceType: 'PHYSICAL',
    },
    'The Power of Your Subconscious Mind': {
      isbn: '978-9381432128', edition: 'Reprint', publisher: 'Amazing Reads',
      summary: 'Harness the power of your subconscious to achieve success and happiness.',
      tags: ['self-help', 'psychology'], resourceType: 'PHYSICAL',
    },
    'Educated': {
      isbn: '978-0399590504', edition: '1st', publisher: 'Random House',
      summary: 'Memoir of a woman who grows up in a survivalist family and earns a PhD from Cambridge.',
      tags: ['biography', 'memoir'], resourceType: 'PHYSICAL',
    },
  };

  const books = await prisma.libBook.findMany({ where: { institutionId } });
  const authorCache = new Map<string, string>();
  const publisherCache = new Map<string, string>();

  for (const book of books) {
    const meta = catalogueMeta[book.title];
    if (!meta) continue;

    let authorId = authorCache.get(book.author);
    if (!authorId && book.author) {
      const a = await prisma.libAuthor.upsert({
        where: { institutionId_authorName: { institutionId, authorName: book.author } },
        create: { institutionId, authorName: book.author },
        update: {},
      });
      authorId = a.id;
      authorCache.set(book.author, authorId);
    }

    let publisherId = publisherCache.get(meta.publisher);
    if (!publisherId) {
      const p = await prisma.libPublisher.upsert({
        where: { institutionId_publisherName: { institutionId, publisherName: meta.publisher } },
        create: { institutionId, publisherName: meta.publisher },
        update: {},
      });
      publisherId = p.id;
      publisherCache.set(meta.publisher, publisherId);
    }

    await prisma.libBook.update({
      where: { id: book.id },
      data: {
        isbn: meta.isbn,
        edition: meta.edition,
        publisher: meta.publisher,
        summary: meta.summary,
        tags: meta.tags,
        resourceType: meta.resourceType,
        authorId,
        publisherId,
        searchCount: Math.floor(Math.random() * 40) + 5,
        viewCount: Math.floor(Math.random() * 60) + 10,
      },
    });

    const copyExists = await prisma.libBookCopy.count({ where: { bookId: book.id } });
    if (copyExists === 0) {
      const copyStatus = book.availableCopies > 0 ? 'AVAILABLE' : 'ISSUED';
      await prisma.libBookCopy.create({
        data: {
          institutionId,
          bookId: book.id,
          copyCode: `${book.bookCode}-C1`,
          rackLocation: `Rack ${String.fromCharCode(65 + (books.indexOf(book) % 8))}-${(books.indexOf(book) % 12) + 1}`,
          status: copyStatus,
        },
      });
    }
  }

  // Add a digital resource sample
  const mainBranch = await prisma.libBranch.findFirst({ where: { institutionId } });
  const fictionCat = await prisma.libCategory.findFirst({
    where: { institutionId, categoryCode: 'FIC' },
  });
  if (mainBranch && fictionCat) {
    const digitalExists = await prisma.libBook.findFirst({
      where: { institutionId, resourceType: 'DIGITAL', title: 'Digital Library — Classic Literature Collection' },
    });
    if (!digitalExists) {
      await prisma.libBook.create({
        data: {
          institutionId,
          branchId: mainBranch.id,
          categoryId: fictionCat.id,
          bookCode: 'LIB-DIG-001',
          title: 'Digital Library — Classic Literature Collection',
          author: 'Various Authors',
          isbn: '978-DIGITAL-001',
          edition: 'Online',
          publisher: '360SchoolERP Digital',
          summary: 'E-book collection of classic literature available for online reading.',
          tags: ['digital', 'ebook', 'classics'],
          resourceType: 'DIGITAL',
          academicYear: '2025-26',
          totalCopies: 999,
          availableCopies: 999,
          coverColor: 'bg-indigo-100 text-indigo-800',
          searchCount: 35,
          viewCount: 88,
        },
      });
    }
  }

  // Seed a few reservations on issued books
  const issuedBooks = await prisma.libBook.findMany({
    where: { institutionId, availableCopies: 0 },
    take: 2,
  });
  const members = await prisma.libMember.findMany({
    where: { institutionId, memberType: 'STUDENT' },
    take: 3,
  });
  for (const [i, book] of issuedBooks.entries()) {
    const member = members[i % members.length];
    if (!member) continue;
    const exists = await prisma.libReservation.findFirst({
      where: { institutionId, bookId: book.id, memberId: member.id, status: 'PENDING' },
    });
    if (!exists) {
      await prisma.libReservation.create({
        data: {
          institutionId,
          bookId: book.id,
          memberId: member.id,
          academicYear: '2025-26',
          status: 'PENDING',
        },
      });
    }
  }

  await logActivity(institutionId, 'LibCatalogue', 'SEED', 'Book catalogue OPAC data enriched');
  return getBookCatalogue(institutionId);
}
