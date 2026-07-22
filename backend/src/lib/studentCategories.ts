import {
  CategoryAssignmentStatus,
  CategoryType,
  StudentCategory,
  StudentCategoryAssignment,
  StudentCategoryGroup,
  StudentCategoryStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { formatClassSection } from './students.js';

export const CATEGORY_GROUP_UI: Record<StudentCategoryGroup, string> = {
  ADMISSION: 'Admission Categories',
  TALENT: 'Talent Category',
  ATTENDANCE: 'Attendance Category',
  GOVERNMENT_RESERVATION: 'Government Reservation Category',
};

export const CATEGORY_GROUP_DB: Record<string, StudentCategoryGroup> = {
  admission: StudentCategoryGroup.ADMISSION,
  talent: StudentCategoryGroup.TALENT,
  attendance: StudentCategoryGroup.ATTENDANCE,
  government_reservation: StudentCategoryGroup.GOVERNMENT_RESERVATION,
  'government reservation': StudentCategoryGroup.GOVERNMENT_RESERVATION,
};

export const ASSIGNMENT_STATUS_UI: Record<CategoryAssignmentStatus, string> = {
  ACTIVE: 'Active',
  PENDING: 'Pending',
  DRAFT: 'Draft',
  DUE: 'Due',
  OPEN: 'Open',
  COMPLETED: 'Completed',
  APPROVED: 'Approved',
  PAID: 'Paid',
};

type SeedItem = {
  name: string;
  shortCode: string;
  categoryType: CategoryType;
  colorCode: string;
  icon: string;
  displayOrder: number;
};

export const DEFAULT_CATEGORY_SEEDS: Record<StudentCategoryGroup, SeedItem[]> = {
  [StudentCategoryGroup.ADMISSION]: [
    { name: 'Regular Student', shortCode: 'REG', categoryType: CategoryType.INTERNAL, colorCode: '#22c55e', icon: '🎓', displayOrder: 1 },
    { name: 'New Admission', shortCode: 'NEW', categoryType: CategoryType.INTERNAL, colorCode: '#3b82f6', icon: '✨', displayOrder: 2 },
    { name: 'Transfer Student', shortCode: 'TRF', categoryType: CategoryType.INTERNAL, colorCode: '#8b5cf6', icon: '🔄', displayOrder: 3 },
    { name: 'Re-admission', shortCode: 'REA', categoryType: CategoryType.INTERNAL, colorCode: '#06b6d4', icon: '🔁', displayOrder: 4 },
    { name: 'Alumni Child', shortCode: 'ALM', categoryType: CategoryType.INTERNAL, colorCode: '#f59e0b', icon: '🏛️', displayOrder: 5 },
    { name: 'Staff Child', shortCode: 'STC', categoryType: CategoryType.INTERNAL, colorCode: '#6366f1', icon: '👨‍🏫', displayOrder: 6 },
    { name: 'Management Quota', shortCode: 'MGQ', categoryType: CategoryType.INTERNAL, colorCode: '#ec4899', icon: '📋', displayOrder: 7 },
    { name: 'RTE Admission', shortCode: 'RTE', categoryType: CategoryType.GOVERNMENT, colorCode: '#ef4444', icon: '⚖️', displayOrder: 8 },
    { name: 'Scholarship Student', shortCode: 'SCH', categoryType: CategoryType.INTERNAL, colorCode: '#14b8a6', icon: '🏆', displayOrder: 9 },
    { name: 'International Student', shortCode: 'INT', categoryType: CategoryType.INTERNAL, colorCode: '#0ea5e9', icon: '🌍', displayOrder: 10 },
    { name: 'NRI Student', shortCode: 'NRI', categoryType: CategoryType.INTERNAL, colorCode: '#a855f7', icon: '✈️', displayOrder: 11 },
    { name: 'Foreign National', shortCode: 'FRN', categoryType: CategoryType.INTERNAL, colorCode: '#64748b', icon: '🛂', displayOrder: 12 },
  ],
  [StudentCategoryGroup.TALENT]: [
    { name: 'Sports', shortCode: 'SPT', categoryType: CategoryType.INTERNAL, colorCode: '#22c55e', icon: '⚽', displayOrder: 1 },
    { name: 'Music', shortCode: 'MUS', categoryType: CategoryType.INTERNAL, colorCode: '#a855f7', icon: '🎵', displayOrder: 2 },
    { name: 'Dance', shortCode: 'DNC', categoryType: CategoryType.INTERNAL, colorCode: '#ec4899', icon: '💃', displayOrder: 3 },
    { name: 'Coding', shortCode: 'COD', categoryType: CategoryType.INTERNAL, colorCode: '#3b82f6', icon: '💻', displayOrder: 4 },
    { name: 'Art', shortCode: 'ART', categoryType: CategoryType.INTERNAL, colorCode: '#f59e0b', icon: '🎨', displayOrder: 5 },
    { name: 'Robotics', shortCode: 'ROB', categoryType: CategoryType.INTERNAL, colorCode: '#6366f1', icon: '🤖', displayOrder: 6 },
    { name: 'Chess', shortCode: 'CHS', categoryType: CategoryType.INTERNAL, colorCode: '#475569', icon: '♟️', displayOrder: 7 },
    { name: 'Debate', shortCode: 'DBT', categoryType: CategoryType.INTERNAL, colorCode: '#0ea5e9', icon: '🎤', displayOrder: 8 },
    { name: 'Drama', shortCode: 'DRM', categoryType: CategoryType.INTERNAL, colorCode: '#8b5cf6', icon: '🎭', displayOrder: 9 },
    { name: 'Olympiad', shortCode: 'OLY', categoryType: CategoryType.INTERNAL, colorCode: '#14b8a6', icon: '🧠', displayOrder: 10 },
    { name: 'NCC', shortCode: 'NCC', categoryType: CategoryType.GOVERNMENT, colorCode: '#b45309', icon: '🎖️', displayOrder: 11 },
    { name: 'Scout & Guide', shortCode: 'SCG', categoryType: CategoryType.INTERNAL, colorCode: '#15803d', icon: '⛺', displayOrder: 12 },
  ],
  [StudentCategoryGroup.ATTENDANCE]: [
    { name: 'Regular', shortCode: 'REG', categoryType: CategoryType.INTERNAL, colorCode: '#22c55e', icon: '✅', displayOrder: 1 },
    { name: 'Irregular', shortCode: 'IRR', categoryType: CategoryType.INTERNAL, colorCode: '#f59e0b', icon: '⚠️', displayOrder: 2 },
    { name: 'Medical Leave', shortCode: 'MED', categoryType: CategoryType.INTERNAL, colorCode: '#3b82f6', icon: '🏥', displayOrder: 3 },
    { name: 'Long Leave', shortCode: 'LLV', categoryType: CategoryType.INTERNAL, colorCode: '#8b5cf6', icon: '📅', displayOrder: 4 },
    { name: 'Inactive', shortCode: 'INA', categoryType: CategoryType.INTERNAL, colorCode: '#94a3b8', icon: '⏸️', displayOrder: 5 },
    { name: 'Transferred', shortCode: 'TRF', categoryType: CategoryType.INTERNAL, colorCode: '#06b6d4', icon: '🔄', displayOrder: 6 },
    { name: 'Dropout', shortCode: 'DRP', categoryType: CategoryType.INTERNAL, colorCode: '#ef4444', icon: '🚪', displayOrder: 7 },
  ],
  [StudentCategoryGroup.GOVERNMENT_RESERVATION]: [
    { name: 'General', shortCode: 'GEN', categoryType: CategoryType.GOVERNMENT, colorCode: '#64748b', icon: '🏷️', displayOrder: 1 },
    { name: 'OBC', shortCode: 'OBC', categoryType: CategoryType.GOVERNMENT, colorCode: '#3b82f6', icon: '🏷️', displayOrder: 2 },
    { name: 'OBC-NCL', shortCode: 'ONC', categoryType: CategoryType.GOVERNMENT, colorCode: '#6366f1', icon: '🏷️', displayOrder: 3 },
    { name: 'SC', shortCode: 'SC', categoryType: CategoryType.GOVERNMENT, colorCode: '#8b5cf6', icon: '🏷️', displayOrder: 4 },
    { name: 'ST', shortCode: 'ST', categoryType: CategoryType.GOVERNMENT, colorCode: '#a855f7', icon: '🏷️', displayOrder: 5 },
    { name: 'EWS', shortCode: 'EWS', categoryType: CategoryType.GOVERNMENT, colorCode: '#14b8a6', icon: '🏷️', displayOrder: 6 },
  ],
};

export function parseCategoryGroup(input?: string): StudentCategoryGroup | undefined {
  if (!input) return undefined;
  const key = input.toLowerCase().replace(/\s+/g, '_');
  if (CATEGORY_GROUP_DB[key]) return CATEGORY_GROUP_DB[key];
  const upper = input.toUpperCase().replace(/\s+/g, '_') as StudentCategoryGroup;
  if (Object.values(StudentCategoryGroup).includes(upper)) return upper;
  return undefined;
}

export function parseCategoryStatus(input?: string): StudentCategoryStatus | undefined {
  if (!input) return undefined;
  const upper = input.toUpperCase() as StudentCategoryStatus;
  if (Object.values(StudentCategoryStatus).includes(upper)) return upper;
  return undefined;
}

export function parseAssignmentStatus(input?: string): CategoryAssignmentStatus | undefined {
  if (!input) return undefined;
  const upper = input.toUpperCase().replace(/\s+/g, '_') as CategoryAssignmentStatus;
  if (Object.values(CategoryAssignmentStatus).includes(upper)) return upper;
  return undefined;
}

export function parseCategoryType(input?: string): CategoryType | undefined {
  if (!input) return undefined;
  const upper = input.toUpperCase() as CategoryType;
  if (Object.values(CategoryType).includes(upper)) return upper;
  return undefined;
}

export function serializeCategory(row: StudentCategory) {
  return {
    id: row.id,
    categoryId: row.id,
    categoryGroup: row.categoryGroup,
    categoryGroupLabel: CATEGORY_GROUP_UI[row.categoryGroup],
    name: row.name,
    shortCode: row.shortCode,
    categoryType: row.categoryType,
    categoryTypeLabel: row.categoryType === CategoryType.GOVERNMENT ? 'Government' : 'Internal',
    description: row.description,
    status: row.status,
    statusLabel: row.status === StudentCategoryStatus.ACTIVE ? 'Active' : 'Inactive',
    displayOrder: row.displayOrder,
    colorCode: row.colorCode,
    icon: row.icon,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeAssignment(
  row: StudentCategoryAssignment & {
    student: { firstName: string; lastName: string; className: string; sectionName: string; admissionNumber: string };
    category: StudentCategory;
  },
) {
  const studentName = [row.student.firstName, row.student.lastName].filter(Boolean).join(' ');
  return {
    id: row.id,
    recordId: row.recordId,
    studentId: row.studentId,
    categoryId: row.categoryId,
    name: studentName,
    classGroup: formatClassSection(row.student.className, row.student.sectionName),
    details: row.details || `${CATEGORY_GROUP_UI[row.category.categoryGroup]} — ${row.category.name}`,
    categoryName: row.category.name,
    categoryGroup: row.category.categoryGroup,
    categoryGroupLabel: CATEGORY_GROUP_UI[row.category.categoryGroup],
    categoryColor: row.category.colorCode,
    categoryIcon: row.category.icon,
    status: row.status,
    statusLabel: ASSIGNMENT_STATUS_UI[row.status],
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function generateAssignmentRecordId(institutionId: string): Promise<string> {
  const count = await prisma.studentCategoryAssignment.count({ where: { institutionId } });
  for (let i = 0; i < 50; i++) {
    const candidate = `STU-${String(count + i + 1).padStart(4, '0')}`;
    const taken = await prisma.studentCategoryAssignment.findFirst({
      where: { institutionId, recordId: candidate },
    });
    if (!taken) return candidate;
  }
  return `STU-${Date.now().toString().slice(-6)}`;
}

export async function seedDefaultCategories(institutionId: string) {
  let created = 0;
  for (const [group, items] of Object.entries(DEFAULT_CATEGORY_SEEDS) as [StudentCategoryGroup, SeedItem[]][]) {
    for (const item of items) {
      const exists = await prisma.studentCategory.findFirst({
        where: { institutionId, categoryGroup: group, shortCode: item.shortCode },
      });
      if (exists) continue;
      await prisma.studentCategory.create({
        data: {
          institutionId,
          categoryGroup: group,
          name: item.name,
          shortCode: item.shortCode,
          categoryType: item.categoryType,
          description: `${CATEGORY_GROUP_UI[group]} — ${item.name}`,
          status: StudentCategoryStatus.ACTIVE,
          displayOrder: item.displayOrder,
          colorCode: item.colorCode,
          icon: item.icon,
        },
      });
      created += 1;
    }
  }
  return created;
}

export async function getCategoryDashboard(institutionId: string) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totalCategories, activeCategories, pendingAssignments, thisMonthAssignments] = await Promise.all([
    prisma.studentCategory.count({ where: { institutionId } }),
    prisma.studentCategory.count({ where: { institutionId, status: StudentCategoryStatus.ACTIVE } }),
    prisma.studentCategoryAssignment.count({
      where: { institutionId, status: CategoryAssignmentStatus.PENDING },
    }),
    prisma.studentCategoryAssignment.count({
      where: { institutionId, createdAt: { gte: startOfMonth } },
    }),
  ]);

  const openAssignments = await prisma.studentCategoryAssignment.count({
    where: {
      institutionId,
      status: { in: [CategoryAssignmentStatus.OPEN, CategoryAssignmentStatus.ACTIVE] },
    },
  });

  return {
    totalCategories,
    activeOpen: activeCategories + openAssignments,
    pending: pendingAssignments,
    thisMonth: thisMonthAssignments,
  };
}
