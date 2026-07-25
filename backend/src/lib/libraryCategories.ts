import { prisma } from './prisma.js';
import { seedBookManagement } from './libraryBookManagement.js';

type CategoryNode = {
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
  children: CategoryNode[];
  subjects: {
    id: string;
    subjectCode: string;
    subjectName: string;
    academicSubjectId: string | null;
    academicSubjectName: string | null;
    description: string;
  }[];
};

async function logActivity(institutionId: string, action: string, details: string, entityId = '') {
  await prisma.libActivityLog.create({
    data: { institutionId, entityType: 'LibCategory', entityId, action, details, performedBy: 'Librarian' },
  });
}

function buildTree(
  categories: Array<{
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
    _count: { books: number };
    subjects: Array<{
      id: string;
      subjectCode: string;
      subjectName: string;
      academicSubjectId: string | null;
      description: string;
    }>;
  }>,
  academicMap: Map<string, string>,
  parentId: string | null = null,
): CategoryNode[] {
  return categories
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.categoryName.localeCompare(b.categoryName))
    .map((c) => ({
      id: c.id,
      categoryCode: c.categoryCode,
      categoryName: c.categoryName,
      description: c.description,
      ddcRangeStart: c.ddcRangeStart,
      ddcRangeEnd: c.ddcRangeEnd,
      color: c.color,
      sortOrder: c.sortOrder,
      issuable: c.issuable,
      issueDaysOverride: c.issueDaysOverride,
      maxBooksOverride: c.maxBooksOverride,
      parentId: c.parentId,
      bookCount: c._count.books,
      subjects: c.subjects.map((s) => ({
        id: s.id,
        subjectCode: s.subjectCode,
        subjectName: s.subjectName,
        academicSubjectId: s.academicSubjectId,
        academicSubjectName: s.academicSubjectId ? academicMap.get(s.academicSubjectId) ?? null : null,
        description: s.description,
      })),
      children: buildTree(categories, academicMap, c.id),
    }));
}

export async function getCategoriesSubjects(institutionId: string, academicYear = '2025-26') {
  const [categories, academicSubjects, bookCounts] = await Promise.all([
    prisma.libCategory.findMany({
      where: { institutionId, status: 'ACTIVE' },
      include: {
        _count: { select: { books: true } },
        subjects: { where: { status: 'ACTIVE' }, orderBy: { subjectName: 'asc' } },
      },
      orderBy: [{ sortOrder: 'asc' }, { categoryName: 'asc' }],
    }),
    prisma.academicSubject.findMany({
      where: { institutionId, isActive: true },
      orderBy: { subjectName: 'asc' },
      take: 100,
    }),
    prisma.libBook.groupBy({
      by: ['categoryId'],
      where: { institutionId, academicYear, categoryId: { not: null } },
      _sum: { totalCopies: true },
    }),
  ]);

  const academicMap = new Map(academicSubjects.map((s) => [s.id, s.subjectName]));
  const tree = buildTree(categories, academicMap);

  const inventoryByCategory = bookCounts.map((b) => {
    const cat = categories.find((c) => c.id === b.categoryId);
    return {
      categoryId: b.categoryId,
      categoryName: cat?.categoryName ?? 'Unknown',
      categoryCode: cat?.categoryCode ?? '',
      color: cat?.color ?? '#64748b',
      bookCount: b._sum.totalCopies ?? 0,
    };
  }).sort((a, b) => b.bookCount - a.bookCount);

  const flatCategories = categories.map((c) => ({
    id: c.id,
    categoryCode: c.categoryCode,
    categoryName: c.categoryName,
    parentId: c.parentId,
    issuable: c.issuable,
    bookCount: c._count.books,
  }));

  return {
    academicYear,
    tree,
    flatCategories,
    inventoryByCategory,
    academicSubjects: academicSubjects.map((s) => ({
      id: s.id,
      code: s.subjectCode || s.recordId,
      name: s.subjectName,
      type: s.subjectType,
      group: s.subjectGroup,
    })),
    circulationRules: categories
      .filter((c) => !c.issuable || c.issueDaysOverride || c.maxBooksOverride)
      .map((c) => ({
        category: c.categoryName,
        issuable: c.issuable,
        issueDays: c.issueDaysOverride,
        maxBooks: c.maxBooksOverride,
      })),
    reports: ['Inventory count by Category'],
    mobileSync: ['OPAC category filters', 'Reading recommendations by syllabus subject'],
    erpIntegration: 'Maps library subjects to academic syllabus for targeted reading recommendations',
    roles: ['Librarian'],
  };
}

export async function createCategory(
  institutionId: string,
  data: {
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
  },
) {
  if (!data.categoryCode?.trim() || !data.categoryName?.trim()) {
    throw new Error('Category code and name are required');
  }

  const maxOrder = await prisma.libCategory.aggregate({
    where: { institutionId, parentId: data.parentId ?? null },
    _max: { sortOrder: true },
  });

  const cat = await prisma.libCategory.create({
    data: {
      institutionId,
      categoryCode: data.categoryCode.trim().toUpperCase(),
      categoryName: data.categoryName.trim(),
      parentId: data.parentId || null,
      description: data.description ?? '',
      ddcRangeStart: data.ddcRangeStart ?? '',
      ddcRangeEnd: data.ddcRangeEnd ?? '',
      color: data.color ?? '#3b82f6',
      issuable: data.issuable ?? true,
      issueDaysOverride: data.issueDaysOverride ?? null,
      maxBooksOverride: data.maxBooksOverride ?? null,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });

  await logActivity(institutionId, 'CREATE', `Category "${cat.categoryName}" created`, cat.id);
  return cat;
}

export async function updateCategory(
  institutionId: string,
  categoryId: string,
  data: Partial<{
    categoryName: string;
    parentId: string | null;
    description: string;
    ddcRangeStart: string;
    ddcRangeEnd: string;
    color: string;
    issuable: boolean;
    issueDaysOverride: number | null;
    maxBooksOverride: number | null;
    sortOrder: number;
  }>,
) {
  const existing = await prisma.libCategory.findFirst({ where: { institutionId, id: categoryId } });
  if (!existing) throw new Error('Category not found');

  if (data.parentId === categoryId) throw new Error('Category cannot be its own parent');

  await prisma.libCategory.update({
    where: { id: categoryId },
    data: {
      ...(data.categoryName != null && { categoryName: data.categoryName }),
      ...(data.parentId !== undefined && { parentId: data.parentId }),
      ...(data.description != null && { description: data.description }),
      ...(data.ddcRangeStart != null && { ddcRangeStart: data.ddcRangeStart }),
      ...(data.ddcRangeEnd != null && { ddcRangeEnd: data.ddcRangeEnd }),
      ...(data.color != null && { color: data.color }),
      ...(data.issuable != null && { issuable: data.issuable }),
      ...(data.issueDaysOverride !== undefined && { issueDaysOverride: data.issueDaysOverride }),
      ...(data.maxBooksOverride !== undefined && { maxBooksOverride: data.maxBooksOverride }),
      ...(data.sortOrder != null && { sortOrder: data.sortOrder }),
    },
  });

  await logActivity(institutionId, 'UPDATE', `Category "${existing.categoryName}" updated`, categoryId);
  return getCategoriesSubjects(institutionId);
}

export async function deleteCategory(institutionId: string, categoryId: string) {
  const cat = await prisma.libCategory.findFirst({
    where: { institutionId, id: categoryId },
    include: { _count: { select: { books: true, children: true } } },
  });
  if (!cat) throw new Error('Category not found');
  if (cat._count.books > 0) throw new Error('Cannot delete — books are assigned to this category');
  if (cat._count.children > 0) throw new Error('Cannot delete — category has sub-categories');

  await prisma.libSubject.deleteMany({ where: { categoryId } });
  await prisma.libCategory.delete({ where: { id: categoryId } });
  await logActivity(institutionId, 'DELETE', `Category "${cat.categoryName}" deleted`, categoryId);
  return { success: true };
}

export async function reorderCategory(
  institutionId: string,
  categoryId: string,
  parentId: string | null,
  sortOrder: number,
) {
  await prisma.libCategory.updateMany({
    where: { institutionId, id: categoryId },
    data: { parentId, sortOrder },
  });
  return getCategoriesSubjects(institutionId);
}

export async function createLibSubject(
  institutionId: string,
  data: {
    categoryId: string;
    subjectCode: string;
    subjectName: string;
    academicSubjectId?: string;
    description?: string;
    academicYear?: string;
  },
) {
  if (!data.subjectCode?.trim() || !data.subjectName?.trim()) {
    throw new Error('Subject code and name are required');
  }

  const sub = await prisma.libSubject.create({
    data: {
      institutionId,
      categoryId: data.categoryId,
      subjectCode: data.subjectCode.trim().toUpperCase(),
      subjectName: data.subjectName.trim(),
      academicSubjectId: data.academicSubjectId || null,
      description: data.description ?? '',
      academicYear: data.academicYear ?? '2025-26',
    },
  });

  await logActivity(institutionId, 'CREATE_SUBJECT', `Subject "${sub.subjectName}" mapped to category`, sub.id);
  return sub;
}

export async function deleteLibSubject(institutionId: string, subjectId: string) {
  const sub = await prisma.libSubject.findFirst({ where: { institutionId, id: subjectId } });
  if (!sub) throw new Error('Subject mapping not found');
  await prisma.libSubject.delete({ where: { id: subjectId } });
  return { success: true };
}

export async function seedCategoriesSubjects(institutionId: string) {
  await seedBookManagement(institutionId);

  const hierarchy = [
    { code: 'SCI', name: 'Science', ddc: '500', ddcEnd: '599', color: '#10b981', children: [
      { code: 'SCI-PHY', name: 'Physics', ddc: '530', ddcEnd: '539' },
      { code: 'SCI-CHE', name: 'Chemistry', ddc: '540', ddcEnd: '549' },
      { code: 'SCI-BIO', name: 'Biology', ddc: '570', ddcEnd: '579' },
    ]},
    { code: 'FIC', name: 'Fiction', ddc: '800', ddcEnd: '899', color: '#3b82f6', children: [] },
    { code: 'REF', name: 'Reference', ddc: '000', ddcEnd: '099', color: '#ef4444', issuable: false, children: [] },
    { code: 'ACA', name: 'Academic', ddc: '370', ddcEnd: '379', color: '#f59e0b', children: [
      { code: 'ACA-MAT', name: 'Mathematics', ddc: '510', ddcEnd: '519' },
    ]},
    { code: 'OTH', name: 'Others', ddc: '000', ddcEnd: '999', color: '#6366f1', children: [] },
  ];

  for (const [pi, parent] of hierarchy.entries()) {
    let parentRow = await prisma.libCategory.findUnique({
      where: { institutionId_categoryCode: { institutionId, categoryCode: parent.code } },
    });
    if (parentRow) {
      parentRow = await prisma.libCategory.update({
        where: { id: parentRow.id },
        data: {
          categoryName: parent.name,
          ddcRangeStart: parent.ddc,
          ddcRangeEnd: parent.ddcEnd,
          color: parent.color,
          issuable: parent.issuable ?? true,
          sortOrder: pi,
          description: `DDC ${parent.ddc}-${parent.ddcEnd}`,
        },
      });
    } else {
      parentRow = await prisma.libCategory.create({
        data: {
          institutionId,
          categoryCode: parent.code,
          categoryName: parent.name,
          ddcRangeStart: parent.ddc,
          ddcRangeEnd: parent.ddcEnd,
          color: parent.color,
          issuable: parent.issuable ?? true,
          sortOrder: pi,
          description: `DDC ${parent.ddc}-${parent.ddcEnd}`,
        },
      });
    }

    for (const [ci, child] of parent.children.entries()) {
      const existing = await prisma.libCategory.findUnique({
        where: { institutionId_categoryCode: { institutionId, categoryCode: child.code } },
      });
      if (existing) {
        await prisma.libCategory.update({
          where: { id: existing.id },
          data: {
            parentId: parentRow.id,
            categoryName: child.name,
            ddcRangeStart: child.ddc,
            ddcRangeEnd: child.ddcEnd,
            sortOrder: ci,
            description: `Sub-category under ${parent.name}`,
          },
        });
      } else {
        await prisma.libCategory.create({
          data: {
            institutionId,
            parentId: parentRow.id,
            categoryCode: child.code,
            categoryName: child.name,
            ddcRangeStart: child.ddc,
            ddcRangeEnd: child.ddcEnd,
            color: parent.color,
            sortOrder: ci,
            description: `Sub-category under ${parent.name}`,
          },
        });
      }
    }
  }

  const academicSubjects = await prisma.academicSubject.findMany({
    where: { institutionId, isActive: true },
    take: 20,
  });
  const phyCat = await prisma.libCategory.findFirst({
    where: { institutionId, categoryCode: 'SCI-PHY' },
  });
  for (const ac of academicSubjects.slice(0, 5)) {
    const code = `LIB-${ac.subjectCode || ac.recordId}`.slice(0, 20);
    const exists = await prisma.libSubject.findUnique({
      where: { institutionId_subjectCode: { institutionId, subjectCode: code } },
    });
    if (!exists && phyCat && ac.subjectName.toLowerCase().includes('phys')) {
      await prisma.libSubject.create({
        data: {
          institutionId,
          categoryId: phyCat.id,
          subjectCode: code,
          subjectName: ac.subjectName,
          academicSubjectId: ac.id,
          description: `Mapped to academic syllabus: ${ac.subjectName}`,
        },
      });
    }
  }

  await logActivity(institutionId, 'SEED', 'Categories & subjects hierarchy seeded');
  return getCategoriesSubjects(institutionId);
}
