import { ParentCategoryStatus } from '@prisma/client';
import { prisma } from './prisma.js';

export const DEFAULT_PARENT_CATEGORIES = [
  { name: 'VIP Parent', categoryGroup: 'VIP', colorCode: '#f59e0b', description: 'High-priority parent contact' },
  { name: 'PTA Member', categoryGroup: 'PTA', colorCode: '#6366f1', description: 'Parent-Teacher Association member' },
  { name: 'General', categoryGroup: 'General', colorCode: '#64748b', description: 'Standard parent category' },
];

export function serializeCategory(row: {
  id: string;
  name: string;
  description: string;
  categoryGroup: string;
  colorCode: string;
  status: ParentCategoryStatus;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
  _count?: { assignments: number };
}) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    categoryGroup: row.categoryGroup,
    colorCode: row.colorCode,
    status: row.status,
    statusLabel: row.status === 'ACTIVE' ? 'Active' : 'Inactive',
    displayOrder: row.displayOrder,
    assignmentCount: row._count?.assignments ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function seedParentCategories(institutionId: string) {
  let created = 0;
  for (const [i, item] of DEFAULT_PARENT_CATEGORIES.entries()) {
    const exists = await prisma.parentCategory.findFirst({
      where: { institutionId, name: item.name },
    });
    if (!exists) {
      await prisma.parentCategory.create({
        data: { institutionId, ...item, displayOrder: i + 1 },
      });
      created += 1;
    }
  }
  return created;
}
