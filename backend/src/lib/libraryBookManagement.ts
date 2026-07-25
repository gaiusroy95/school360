import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedLibraryMembers } from './libraryMembers.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'DAMAGED'];

const ISBN_FALLBACK: Record<string, Record<string, string | number>> = {
  '9780062315007': {
    title: 'The Alchemist', author: 'Paulo Coelho', publisher: 'HarperOne',
    summary: 'A philosophical novel about following your dreams.', pageCount: 208, language: 'English',
    deweyDecimal: '869.3', coverImageUrl: '',
  },
  '9780735211292': {
    title: 'Atomic Habits', author: 'James Clear', publisher: 'Avery',
    summary: 'Build good habits and break bad ones with practical strategies.', pageCount: 320, language: 'English',
    deweyDecimal: '158.1', coverImageUrl: '',
  },
  '9788173711461': {
    title: 'Wings of Fire', author: 'A.P.J. Abdul Kalam', publisher: 'Universities Press',
    summary: 'Autobiography of Dr. A.P.J. Abdul Kalam.', pageCount: 180, language: 'English',
    deweyDecimal: '920', coverImageUrl: '',
  },
};

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatInr(n: number) {
  return `₹ ${Math.round(n).toLocaleString('en-IN')}`;
}

async function logActivity(institutionId: string, action: string, details: string, entityId = '') {
  await prisma.libActivityLog.create({
    data: { institutionId, entityType: 'LibBook', entityId, action, details, performedBy: 'Librarian' },
  });
}

export async function fetchIsbnMetadata(isbn: string) {
  const clean = isbn.replace(/[-\s]/g, '');
  if (!clean) throw new Error('ISBN is required');

  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(clean)}&format=json&jscmd=data`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (res.ok) {
      const data = (await res.json()) as Record<string, {
        title?: string;
        authors?: { name: string }[];
        publishers?: { name: string }[];
        publish_date?: string;
        number_of_pages?: number;
        subjects?: { name: string }[];
        cover?: { medium?: string };
        identifiers?: { isbn_13?: string[] };
      }>;
      const key = `ISBN:${clean}`;
      const book = data[key];
      if (book?.title) {
        return {
          isbn: clean,
          title: book.title,
          author: book.authors?.map((a) => a.name).join(', ') ?? '',
          publisher: book.publishers?.map((p) => p.name).join(', ') ?? '',
          edition: book.publish_date ?? '',
          summary: book.subjects?.slice(0, 3).map((s) => s.name).join('; ') ?? '',
          pageCount: book.number_of_pages ?? 0,
          language: 'English',
          coverImageUrl: book.cover?.medium ?? '',
          marcData: { source: 'OpenLibrary', fetchedAt: new Date().toISOString() },
        };
      }
    }
  } catch {
    // fall through to local fallback
  }

  const fallback = ISBN_FALLBACK[clean];
  if (fallback) {
    return {
      isbn: clean,
      title: String(fallback.title),
      author: String(fallback.author),
      publisher: String(fallback.publisher),
      edition: '',
      summary: String(fallback.summary),
      pageCount: Number(fallback.pageCount),
      language: String(fallback.language),
      deweyDecimal: String(fallback.deweyDecimal),
      coverImageUrl: String(fallback.coverImageUrl ?? ''),
      marcData: { source: 'LocalCatalog', fetchedAt: new Date().toISOString() },
    };
  }

  return {
    isbn: clean,
    title: '',
    author: '',
    publisher: '',
    edition: '',
    summary: '',
    pageCount: 0,
    language: 'English',
    deweyDecimal: '',
    coverImageUrl: '',
    marcData: { source: 'Manual', note: 'No metadata found — enter details manually' },
  };
}

async function nextAccessionNumbers(institutionId: string, prefix: string, count: number) {
  const copies = await prisma.libBookCopy.findMany({
    where: { institutionId, copyCode: { startsWith: `${prefix}-` } },
    select: { copyCode: true },
  });
  let max = 0;
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  for (const c of copies) {
    const m = c.copyCode.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const numbers: string[] = [];
  for (let i = 1; i <= count; i++) {
    numbers.push(`${prefix}-${String(max + i).padStart(3, '0')}`);
  }
  return numbers;
}

async function notifyWaitlist(institutionId: string, bookId: string, title: string) {
  const pending = await prisma.libReservation.findMany({
    where: { institutionId, bookId, status: 'PENDING' },
    include: { member: true },
    take: 20,
  });
  for (const r of pending) {
    await logActivity(
      institutionId,
      'WAITLIST_NOTIFY',
      `Notified ${r.member.memberName} — "${title}" is now available (App/SMS)`,
      r.id,
    );
  }
  return pending.length;
}

export async function getBookManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: { q?: string; categoryId?: string; branchId?: string } = {},
) {
  const where: Prisma.LibBookWhereInput = { institutionId, academicYear };
  if (filters.categoryId && filters.categoryId !== 'ALL') where.categoryId = filters.categoryId;
  if (filters.branchId && filters.branchId !== 'ALL') where.branchId = filters.branchId;
  if (filters.q?.trim()) {
    where.OR = [
      { title: { contains: filters.q, mode: 'insensitive' } },
      { author: { contains: filters.q, mode: 'insensitive' } },
      { isbn: { contains: filters.q, mode: 'insensitive' } },
      { bookCode: { contains: filters.q, mode: 'insensitive' } },
    ];
  }

  const [books, categories, branches, vendors, acquisitions] = await Promise.all([
    prisma.libBook.findMany({
      where,
      include: {
        category: true,
        branch: true,
        vendor: true,
        copies: { orderBy: { copyCode: 'asc' } },
      },
      orderBy: { addedDate: 'desc' },
      take: 80,
    }),
    prisma.libCategory.findMany({ where: { institutionId }, orderBy: { categoryName: 'asc' } }),
    prisma.libBranch.findMany({ where: { institutionId, status: 'ACTIVE' } }),
    prisma.libVendor.findMany({ where: { institutionId, status: 'ACTIVE' }, orderBy: { vendorName: 'asc' } }),
    prisma.libAcquisition.findMany({
      where: { institutionId, academicYear },
      include: { vendor: true },
      orderBy: { acquisitionDate: 'desc' },
      take: 10,
    }),
  ]);

  const totalCopies = books.reduce((s, b) => s + b.totalCopies, 0);
  const totalValue = books.reduce((s, b) => s + b.purchasePrice, 0);

  const accessionRegister = books.flatMap((b) =>
    b.copies.map((c) => ({
      accessionNo: c.copyCode,
      title: b.title,
      author: b.author,
      category: b.category?.categoryName ?? '—',
      purchaseDate: b.purchaseDate ? formatDate(b.purchaseDate) : '—',
      vendor: b.vendor?.vendorName ?? '—',
      condition: c.condition,
      status: c.status,
      rackLocation: c.rackLocation,
      barcodePrinted: c.barcodePrinted,
    })),
  );

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    conditions: CONDITIONS,
    branches: branches.map((b) => ({ id: b.id, name: b.branchName })),
    categories: categories.map((c) => ({
      id: c.id,
      code: c.categoryCode,
      name: c.categoryName,
      color: c.color,
      accessionPrefix: c.categoryCode,
    })),
    vendors: vendors.map((v) => ({ id: v.id, name: v.vendorName })),
    books: books.map((b) => ({
      id: b.id,
      bookCode: b.bookCode,
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      category: b.category?.categoryName ?? '—',
      categoryId: b.categoryId,
      branch: b.branch.branchName,
      branchId: b.branchId,
      vendor: b.vendor?.vendorName ?? '—',
      vendorId: b.vendorId,
      edition: b.edition,
      deweyDecimal: b.deweyDecimal,
      purchaseDate: b.purchaseDate ? formatDate(b.purchaseDate) : null,
      purchasePrice: b.purchasePrice,
      purchasePriceFormatted: formatInr(b.purchasePrice),
      invoiceNo: b.invoiceNo,
      totalCopies: b.totalCopies,
      availableCopies: b.availableCopies,
      resourceType: b.resourceType,
      isNewArrival: b.isNewArrival,
      language: b.language,
      pageCount: b.pageCount,
      addedDate: formatDate(b.addedDate),
      copies: b.copies.map((c) => ({
        id: c.id,
        accessionNo: c.copyCode,
        rackLocation: c.rackLocation,
        condition: c.condition,
        status: c.status,
        barcodePrinted: c.barcodePrinted,
        purchasePrice: c.purchasePrice,
      })),
    })),
    accessionRegister,
    procurementSummary: {
      titlesAdded: books.length,
      totalCopies,
      totalCost: formatInr(totalValue),
      vendors: vendors.length,
    },
    vendorPerformance: acquisitions.map((a) => ({
      vendor: a.vendor?.vendorName ?? 'Direct',
      booksAdded: a.booksAdded,
      totalCost: formatInr(a.totalCost),
      date: formatDate(a.acquisitionDate),
    })),
    reports: ['Accession Register', 'Book Procurement Summary', 'Vendor Performance'],
    roles: ['Librarian', 'Data Entry Operator'],
    financeIntegration: 'Purchase orders and vendor payments link to Finance & Accounting module',
    mobileSync: ['New Arrivals feed', 'OPAC catalogue update'],
  };
}

export type CreateBookInput = {
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
  purchaseDate?: string;
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
  marcData?: Record<string, unknown>;
};

export async function createBookWithCopies(institutionId: string, input: CreateBookInput) {
  if (!input.title?.trim()) throw new Error('Title is required');
  if (!input.author?.trim()) throw new Error('Author is required');
  if (!input.categoryId) throw new Error('Category is required');
  if (!input.purchaseDate) throw new Error('Purchase date is required');

  const category = await prisma.libCategory.findFirst({
    where: { institutionId, id: input.categoryId },
  });
  if (!category) throw new Error('Category not found');

  const copyCount = Math.max(1, Math.min(input.copyCount ?? 1, 50));
  const prefix = category.categoryCode;
  const accessionNos = await nextAccessionNumbers(institutionId, prefix, copyCount);

  for (const acc of accessionNos) {
    const exists = await prisma.libBookCopy.findUnique({
      where: { institutionId_copyCode: { institutionId, copyCode: acc } },
    });
    if (exists) throw new Error(`Accession number ${acc} already exists`);
  }

  const purchaseDate = new Date(input.purchaseDate);
  const bookCode = `${prefix}-${accessionNos[0]}`;
  const totalPrice = (input.purchasePrice ?? 0) * copyCount;

  const book = await prisma.libBook.create({
    data: {
      institutionId,
      branchId: input.branchId,
      categoryId: input.categoryId,
      vendorId: input.vendorId || null,
      bookCode,
      title: input.title.trim(),
      author: input.author.trim(),
      isbn: input.isbn ?? '',
      publisher: input.publisher ?? '',
      edition: input.edition ?? '',
      summary: input.summary ?? '',
      coverImageUrl: input.coverImageUrl ?? '',
      tags: [],
      resourceType: input.resourceType ?? 'PHYSICAL',
      deweyDecimal: input.deweyDecimal ?? '',
      purchaseDate,
      purchasePrice: totalPrice,
      invoiceNo: input.invoiceNo ?? '',
      marcData: (input.marcData ?? { source: 'Manual entry' }) as Prisma.InputJsonValue,
      language: input.language ?? 'English',
      pageCount: input.pageCount ?? 0,
      academicYear: input.academicYear ?? '2025-26',
      totalCopies: copyCount,
      availableCopies: copyCount,
      status: 'AVAILABLE',
      isNewArrival: input.isNewArrival ?? true,
      addedDate: purchaseDate,
    },
  });

  const perCopyPrice = copyCount > 0 ? (input.purchasePrice ?? 0) : 0;
  for (const acc of accessionNos) {
    await prisma.libBookCopy.create({
      data: {
        institutionId,
        bookId: book.id,
        copyCode: acc,
        rackLocation: input.rackLocation ?? '',
        condition: input.condition ?? 'GOOD',
        purchasePrice: perCopyPrice,
        status: 'AVAILABLE',
      },
    });
  }

  if (input.vendorId) {
    await prisma.libAcquisition.create({
      data: {
        institutionId,
        vendorId: input.vendorId,
        academicYear: input.academicYear ?? '2025-26',
        booksAdded: copyCount,
        totalCost: totalPrice,
        acquisitionDate: purchaseDate,
      },
    });
  }

  const notified = await notifyWaitlist(institutionId, book.id, book.title);
  await logActivity(
    institutionId,
    'CREATE',
    `Added "${book.title}" with ${copyCount} cop${copyCount === 1 ? 'y' : 'ies'} — accessions: ${accessionNos.join(', ')}`,
    book.id,
  );

  return {
    bookId: book.id,
    title: book.title,
    accessionNumbers: accessionNos,
    copyCount,
    notifiedWaitlist: notified,
    message: `Book cataloged with ${copyCount} accession number(s). ${notified > 0 ? `${notified} waitlist user(s) notified.` : ''}`,
  };
}

export async function addCopiesToBook(
  institutionId: string,
  bookId: string,
  copyCount: number,
  rackLocation?: string,
  condition?: string,
) {
  const book = await prisma.libBook.findFirst({
    where: { institutionId, id: bookId },
    include: { category: true },
  });
  if (!book) throw new Error('Book not found');

  const prefix = book.category?.categoryCode ?? 'LIB';
  const count = Math.max(1, Math.min(copyCount, 20));
  const accessionNos = await nextAccessionNumbers(institutionId, prefix, count);

  for (const acc of accessionNos) {
    await prisma.libBookCopy.create({
      data: {
        institutionId,
        bookId: book.id,
        copyCode: acc,
        rackLocation: rackLocation ?? '',
        condition: condition ?? 'GOOD',
        status: 'AVAILABLE',
      },
    });
  }

  await prisma.libBook.update({
    where: { id: bookId },
    data: {
      totalCopies: { increment: count },
      availableCopies: { increment: count },
      status: 'AVAILABLE',
    },
  });

  const notified = await notifyWaitlist(institutionId, bookId, book.title);
  return { accessionNumbers: accessionNos, notifiedWaitlist: notified };
}

export async function markBarcodesPrinted(institutionId: string, copyIds: string[]) {
  await prisma.libBookCopy.updateMany({
    where: { institutionId, id: { in: copyIds } },
    data: { barcodePrinted: true },
  });
  return { printed: copyIds.length };
}

export async function deleteBookTitle(institutionId: string, bookId: string) {
  const activeIssues = await prisma.libIssue.count({
    where: { institutionId, bookId, status: { in: ['ISSUED', 'OVERDUE'] } },
  });
  if (activeIssues > 0) throw new Error('Cannot delete — book has active circulation');

  await prisma.libBookCopy.deleteMany({ where: { institutionId, bookId } });
  await prisma.libBook.delete({ where: { id: bookId } });
  await logActivity(institutionId, 'DELETE', 'Book title and copies removed', bookId);
  return { success: true };
}

export async function seedBookManagement(institutionId: string) {
  await seedLibraryMembers(institutionId);
  const books = await prisma.libBook.findMany({
    where: { institutionId },
    include: { category: true, copies: true },
    take: 30,
  });

  for (const b of books) {
    if (!b.purchaseDate) {
      await prisma.libBook.update({
        where: { id: b.id },
        data: {
          purchaseDate: b.addedDate,
          purchasePrice: b.purchasePrice || 450 * b.totalCopies,
          deweyDecimal: b.deweyDecimal || '000',
        },
      });
    }
    if (b.copies.length === 0) {
      const prefix = b.category?.categoryCode ?? 'LIB';
      const [acc] = await nextAccessionNumbers(institutionId, prefix, 1);
      await prisma.libBookCopy.create({
        data: {
          institutionId,
          bookId: b.id,
          copyCode: acc,
          rackLocation: `Rack ${prefix}-1`,
          condition: 'GOOD',
          status: b.availableCopies > 0 ? 'AVAILABLE' : 'ISSUED',
        },
      });
    }
  }

  return getBookManagement(institutionId);
}
