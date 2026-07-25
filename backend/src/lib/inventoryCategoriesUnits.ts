import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedInventoryDashboard } from './inventoryDashboard.js';
import { seedItemsManagement } from './inventoryItems.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const MANAGER_ROLES = new Set(['Super Admin', 'Inventory Manager', 'Admin']);

const UNIT_SEED = [
  { code: 'PCS', name: 'Pcs', isBase: true },
  { code: 'REAM', name: 'Ream', isBase: false },
  { code: 'KG', name: 'Kg', isBase: true },
  { code: 'LTR', name: 'Ltr', isBase: true },
  { code: 'SET', name: 'Set', isBase: false },
  { code: 'KIT', name: 'Kits', isBase: false },
  { code: 'BOX', name: 'Boxes', isBase: false },
];

const CONVERSION_SEED: [string, string, number][] = [
  ['BOX', 'PCS', 50],
  ['REAM', 'PCS', 500],
  ['KIT', 'PCS', 1],
  ['SET', 'PCS', 1],
];

function slugCode(name: string, max = 4) {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.slice(0, max).toUpperCase())
    .join('-');
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
) {
  await prisma.invActivityLog.create({
    data: { institutionId, action, details, filterSnapshot: snapshot as Prisma.InputJsonValue, performedBy: 'Inventory Manager' },
  });
}

type FlatCategory = {
  id: string;
  parentId: string | null;
  categoryCode: string;
  categoryName: string;
  skuPrefix: string;
  baseUnit: string;
  ledgerCode: string;
  description: string;
  color: string;
  sortOrder: number;
  itemCount: number;
  childCount: number;
};

type CategoryNode = FlatCategory & { children: CategoryNode[] };

function buildTree(flat: FlatCategory[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  for (const c of flat) map.set(c.id, { ...c, children: [] });
  const roots: CategoryNode[] = [];
  for (const c of flat) {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortNodes = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.categoryName.localeCompare(b.categoryName));
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

function isDescendant(flat: FlatCategory[], ancestorId: string, nodeId: string): boolean {
  let current = flat.find((c) => c.id === nodeId);
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = flat.find((c) => c.id === current!.parentId);
  }
  return false;
}

export function suggestCategoryCode(
  parentCode: string | null,
  categoryName: string,
  existingCodes: string[],
) {
  const part = slugCode(categoryName, 3) || 'CAT';
  let code = parentCode ? `${parentCode}-${part}` : part;
  if (!existingCodes.includes(code)) return code;
  let i = 2;
  while (existingCodes.includes(`${code}${i}`)) i += 1;
  return `${code}${i}`;
}

export async function suggestInvCategoryCode(
  institutionId: string,
  categoryName: string,
  parentId?: string | null,
) {
  let parentCode: string | null = null;
  if (parentId) {
    const parent = await prisma.invCategory.findFirst({ where: { id: parentId, institutionId } });
    parentCode = parent?.categoryCode ?? null;
  }
  const existing = await prisma.invCategory.findMany({
    where: { institutionId },
    select: { categoryCode: true },
  });
  const code = suggestCategoryCode(parentCode, categoryName, existing.map((c) => c.categoryCode));
  const skuPrefix = code.replace(/-/g, '').slice(0, 8);
  return { categoryCode: code, skuPrefix };
}

async function mapCategories(institutionId: string, academicYear: string): Promise<FlatCategory[]> {
  const [categories, itemCounts] = await Promise.all([
    prisma.invCategory.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      orderBy: [{ sortOrder: 'asc' }, { categoryName: 'asc' }],
    }),
    prisma.invItem.groupBy({
      by: ['categoryId'],
      where: { institutionId, academicYear, status: 'ACTIVE' },
      _count: { _all: true },
    }),
  ]);
  const countMap = new Map(itemCounts.map((r) => [r.categoryId, r._count._all]));
  const childMap = new Map<string, number>();
  for (const c of categories) {
    if (c.parentId) childMap.set(c.parentId, (childMap.get(c.parentId) ?? 0) + 1);
  }
  return categories.map((c) => ({
    id: c.id,
    parentId: c.parentId,
    categoryCode: c.categoryCode,
    categoryName: c.categoryName,
    skuPrefix: c.skuPrefix || c.categoryCode,
    baseUnit: c.baseUnit,
    ledgerCode: c.ledgerCode,
    description: c.description,
    color: c.color,
    sortOrder: c.sortOrder,
    itemCount: countMap.get(c.id) ?? 0,
    childCount: childMap.get(c.id) ?? 0,
  }));
}

export async function getCategoriesUnits(
  institutionId: string,
  academicYear = '2025-26',
  userRole = 'Inventory Manager',
) {
  const flat = await mapCategories(institutionId, academicYear);
  const tree = buildTree(flat);

  const [units, conversions] = await Promise.all([
    prisma.invUnit.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      orderBy: [{ isBase: 'desc' }, { unitName: 'asc' }],
    }),
    prisma.invUnitConversion.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      include: { baseUnit: true, alternateUnit: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const itemCountByUnit = await prisma.invItem.groupBy({
    by: ['unitId'],
    where: { institutionId, academicYear, status: 'ACTIVE', unitId: { not: null } },
    _count: { _all: true },
  });
  const unitUsage = new Map(itemCountByUnit.map((r) => [r.unitId!, r._count._all]));

  await logActivity(institutionId, 'VIEW_CATEGORIES_UNITS', 'Categories & Units accessed', { academicYear });

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    tree,
    flatCategories: flat,
    totalCategories: flat.length,
    totalUnits: units.length,
    totalConversions: conversions.length,
    units: units.map((u) => ({
      id: u.id,
      code: u.unitCode,
      name: u.unitName,
      isBase: u.isBase,
      itemCount: unitUsage.get(u.id) ?? 0,
      typeLabel: u.isBase ? 'Base Unit' : 'Alternate Unit',
    })),
    conversions: conversions.map((c) => ({
      id: c.id,
      baseUnitId: c.baseUnitId,
      baseUnitCode: c.baseUnit.unitCode,
      baseUnitName: c.baseUnit.unitName,
      alternateUnitId: c.alternateUnitId,
      alternateUnitCode: c.alternateUnit.unitCode,
      alternateUnitName: c.alternateUnit.unitName,
      conversionFactor: c.conversionFactor,
      formula: `1 ${c.alternateUnit.unitName} = ${c.conversionFactor} ${c.baseUnit.unitName}`,
    })),
    baseUnits: units.filter((u) => u.isBase).map((u) => ({ id: u.id, code: u.unitCode, name: u.unitName })),
    alternateUnits: units.filter((u) => !u.isBase).map((u) => ({ id: u.id, code: u.unitCode, name: u.unitName })),
    permissions: {
      canCreate: MANAGER_ROLES.has(userRole),
      canEdit: MANAGER_ROLES.has(userRole),
      canDelete: MANAGER_ROLES.has(userRole),
    },
    automationRules: [
      'Auto-suggest category codes from parent name + category name',
      'SKU prefix derived from category code',
      'Unit conversion: 1 Alternate = Factor × Base (e.g. 1 Box = 50 Pcs)',
    ],
    validationRules: [
      'Prevent circular references in category hierarchy',
      'Cannot delete category with attached items or child categories',
      'Cannot delete unit used in items or conversion matrix',
    ],
    workflow: [
      'Categories: Create Parent → Create Child → Map to Ledger',
      'Units: Create Base Unit → Create Alternate Unit → Define Conversion Factor',
    ],
  };
}

export async function createInvCategory(
  institutionId: string,
  body: {
    categoryName: string;
    categoryCode?: string;
    parentId?: string | null;
    baseUnit?: string;
    ledgerCode?: string;
    description?: string;
    color?: string;
    skuPrefix?: string;
    academicYear?: string;
  },
) {
  const academicYear = body.academicYear ?? '2025-26';
  if (!body.categoryName?.trim()) throw new Error('Category name is required');
  if (!body.baseUnit?.trim()) throw new Error('Base unit is required');

  if (body.parentId) {
    const parent = await prisma.invCategory.findFirst({ where: { id: body.parentId, institutionId } });
    if (!parent) throw new Error('Parent category not found');
  }

  const existing = await prisma.invCategory.findMany({ where: { institutionId }, select: { categoryCode: true } });
  const categoryCode = body.categoryCode?.trim()
    || (await suggestInvCategoryCode(institutionId, body.categoryName, body.parentId)).categoryCode;

  if (existing.some((c) => c.categoryCode.toLowerCase() === categoryCode.toLowerCase())) {
    throw new Error(`Category code "${categoryCode}" already exists`);
  }

  const siblings = await prisma.invCategory.count({
    where: { institutionId, academicYear, parentId: body.parentId ?? null },
  });

  const skuPrefix = body.skuPrefix?.trim() || categoryCode.replace(/-/g, '').slice(0, 8);

  const category = await prisma.invCategory.create({
    data: {
      institutionId,
      categoryCode,
      categoryName: body.categoryName.trim(),
      parentId: body.parentId || null,
      baseUnit: body.baseUnit.trim(),
      ledgerCode: body.ledgerCode?.trim() ?? '',
      description: body.description?.trim() ?? '',
      color: body.color ?? '#3b82f6',
      skuPrefix,
      sortOrder: siblings,
      academicYear,
    },
  });

  await logActivity(institutionId, 'CATEGORY_CREATED', `Created category ${categoryCode}: ${body.categoryName}`, { categoryId: category.id });
  return { success: true, categoryId: category.id, categoryCode, message: `Category "${body.categoryName}" created` };
}

export async function updateInvCategory(
  institutionId: string,
  categoryId: string,
  body: Record<string, unknown>,
) {
  const category = await prisma.invCategory.findFirst({ where: { id: categoryId, institutionId } });
  if (!category) throw new Error('Category not found');

  const flat = await mapCategories(institutionId, category.academicYear);

  if (body.parentId !== undefined && body.parentId !== category.parentId) {
    const newParentId = body.parentId ? String(body.parentId) : null;
    if (newParentId === categoryId) throw new Error('Category cannot be its own parent');
    if (newParentId && isDescendant(flat, categoryId, newParentId)) {
      throw new Error('Cannot set parent — would create circular reference');
    }
    if (newParentId) {
      const parent = await prisma.invCategory.findFirst({ where: { id: newParentId, institutionId } });
      if (!parent) throw new Error('Parent category not found');
    }
  }

  const updates: Prisma.InvCategoryUpdateInput = {};
  if (body.categoryName) updates.categoryName = String(body.categoryName).trim();
  if (body.baseUnit) updates.baseUnit = String(body.baseUnit).trim();
  if (body.ledgerCode !== undefined) updates.ledgerCode = String(body.ledgerCode);
  if (body.description !== undefined) updates.description = String(body.description);
  if (body.color) updates.color = String(body.color);
  if (body.skuPrefix) updates.skuPrefix = String(body.skuPrefix);
  if (body.parentId !== undefined) updates.parent = body.parentId
    ? { connect: { id: String(body.parentId) } }
    : { disconnect: true };
  if (body.sortOrder !== undefined) updates.sortOrder = Number(body.sortOrder);

  await prisma.invCategory.update({ where: { id: categoryId }, data: updates });
  await logActivity(institutionId, 'CATEGORY_UPDATED', `Updated category ${category.categoryCode}`, { categoryId });

  return { success: true, message: 'Category updated successfully' };
}

export async function moveInvCategory(
  institutionId: string,
  categoryId: string,
  newParentId: string | null,
  sortOrder = 0,
) {
  const category = await prisma.invCategory.findFirst({ where: { id: categoryId, institutionId } });
  if (!category) throw new Error('Category not found');

  const flat = await mapCategories(institutionId, category.academicYear);
  if (newParentId === categoryId) throw new Error('Category cannot be its own parent');
  if (newParentId && isDescendant(flat, categoryId, newParentId)) {
    throw new Error('Cannot move — would create circular reference');
  }

  await prisma.invCategory.update({
    where: { id: categoryId },
    data: {
      parentId: newParentId,
      sortOrder,
    },
  });

  await logActivity(institutionId, 'CATEGORY_MOVED', `Moved category ${category.categoryCode}`, { categoryId, newParentId });
  return getCategoriesUnits(institutionId, category.academicYear);
}

export async function deleteInvCategory(institutionId: string, categoryId: string) {
  const category = await prisma.invCategory.findFirst({ where: { id: categoryId, institutionId } });
  if (!category) throw new Error('Category not found');

  const [itemCount, childCount] = await Promise.all([
    prisma.invItem.count({ where: { categoryId, institutionId } }),
    prisma.invCategory.count({ where: { parentId: categoryId, institutionId } }),
  ]);

  if (itemCount > 0) throw new Error(`Cannot delete — ${itemCount} item(s) attached to this category`);
  if (childCount > 0) throw new Error(`Cannot delete — ${childCount} child categor(ies) exist. Remove children first`);

  await prisma.invCategory.delete({ where: { id: categoryId } });
  await logActivity(institutionId, 'CATEGORY_DELETED', `Deleted category ${category.categoryCode}`, { categoryId });

  return { success: true, message: `Category "${category.categoryName}" deleted` };
}

export async function createInvUnit(
  institutionId: string,
  body: { unitCode?: string; unitName: string; isBase?: boolean; academicYear?: string },
) {
  const academicYear = body.academicYear ?? '2025-26';
  if (!body.unitName?.trim()) throw new Error('Unit name is required');

  const unitCode = body.unitCode?.trim().toUpperCase()
    || body.unitName.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)
    || 'UNIT';

  const dup = await prisma.invUnit.findFirst({ where: { institutionId, unitCode } });
  if (dup) throw new Error(`Unit code "${unitCode}" already exists`);

  const unit = await prisma.invUnit.create({
    data: {
      institutionId,
      unitCode,
      unitName: body.unitName.trim(),
      isBase: body.isBase ?? true,
      academicYear,
    },
  });

  await logActivity(institutionId, 'UNIT_CREATED', `Created unit ${unitCode}: ${body.unitName}`, { unitId: unit.id });
  return { success: true, unitId: unit.id, message: `Unit "${body.unitName}" created` };
}

export async function updateInvUnit(
  institutionId: string,
  unitId: string,
  body: { unitName?: string; isBase?: boolean },
) {
  const unit = await prisma.invUnit.findFirst({ where: { id: unitId, institutionId } });
  if (!unit) throw new Error('Unit not found');

  const updates: Prisma.InvUnitUpdateInput = {};
  if (body.unitName) updates.unitName = body.unitName.trim();
  if (body.isBase !== undefined) updates.isBase = body.isBase;

  await prisma.invUnit.update({ where: { id: unitId }, data: updates });
  await logActivity(institutionId, 'UNIT_UPDATED', `Updated unit ${unit.unitCode}`, { unitId });

  return { success: true, message: 'Unit updated successfully' };
}

export async function deleteInvUnit(institutionId: string, unitId: string) {
  const unit = await prisma.invUnit.findFirst({ where: { id: unitId, institutionId } });
  if (!unit) throw new Error('Unit not found');

  const [itemCount, convCount] = await Promise.all([
    prisma.invItem.count({ where: { unitId, institutionId } }),
    prisma.invUnitConversion.count({
      where: {
        institutionId,
        OR: [{ baseUnitId: unitId }, { alternateUnitId: unitId }],
      },
    }),
  ]);

  if (itemCount > 0) throw new Error(`Cannot delete — ${itemCount} item(s) use this unit`);
  if (convCount > 0) throw new Error('Cannot delete — unit is used in conversion matrix');

  await prisma.invUnitConversion.deleteMany({
    where: { institutionId, OR: [{ baseUnitId: unitId }, { alternateUnitId: unitId }] },
  });
  await prisma.invUnit.delete({ where: { id: unitId } });
  await logActivity(institutionId, 'UNIT_DELETED', `Deleted unit ${unit.unitCode}`, { unitId });

  return { success: true, message: `Unit "${unit.unitName}" deleted` };
}

export async function createInvUnitConversion(
  institutionId: string,
  body: {
    baseUnitId: string;
    alternateUnitId: string;
    conversionFactor: number;
    academicYear?: string;
  },
) {
  const academicYear = body.academicYear ?? '2025-26';
  if (!body.baseUnitId || !body.alternateUnitId) throw new Error('Base and alternate units are required');
  if (body.baseUnitId === body.alternateUnitId) throw new Error('Base and alternate units must differ');
  if (!body.conversionFactor || body.conversionFactor <= 0) throw new Error('Conversion factor must be greater than zero');

  const [base, alt] = await Promise.all([
    prisma.invUnit.findFirst({ where: { id: body.baseUnitId, institutionId } }),
    prisma.invUnit.findFirst({ where: { id: body.alternateUnitId, institutionId } }),
  ]);
  if (!base || !alt) throw new Error('Unit not found');
  if (!base.isBase) throw new Error('Selected base unit must be a base unit type');
  if (alt.isBase) throw new Error('Alternate unit cannot be a base unit');

  const existing = await prisma.invUnitConversion.findFirst({
    where: { institutionId, baseUnitId: body.baseUnitId, alternateUnitId: body.alternateUnitId },
  });
  if (existing) throw new Error('Conversion already exists for this unit pair');

  const conversion = await prisma.invUnitConversion.create({
    data: {
      institutionId,
      baseUnitId: body.baseUnitId,
      alternateUnitId: body.alternateUnitId,
      conversionFactor: body.conversionFactor,
      academicYear,
    },
    include: { baseUnit: true, alternateUnit: true },
  });

  await logActivity(
    institutionId,
    'UNIT_CONVERSION_CREATED',
    `1 ${alt.unitName} = ${body.conversionFactor} ${base.unitName}`,
    { conversionId: conversion.id },
  );

  return {
    success: true,
    conversionId: conversion.id,
    message: `Conversion added: 1 ${alt.unitName} = ${body.conversionFactor} ${base.unitName}`,
  };
}

export async function updateInvUnitConversion(
  institutionId: string,
  conversionId: string,
  body: { conversionFactor: number },
) {
  const conversion = await prisma.invUnitConversion.findFirst({
    where: { id: conversionId, institutionId },
    include: { baseUnit: true, alternateUnit: true },
  });
  if (!conversion) throw new Error('Conversion not found');
  if (!body.conversionFactor || body.conversionFactor <= 0) throw new Error('Conversion factor must be greater than zero');

  await prisma.invUnitConversion.update({
    where: { id: conversionId },
    data: { conversionFactor: body.conversionFactor },
  });

  await logActivity(institutionId, 'UNIT_CONVERSION_UPDATED', `Updated conversion ${conversionId}`, { conversionId });
  return {
    success: true,
    message: `Updated: 1 ${conversion.alternateUnit.unitName} = ${body.conversionFactor} ${conversion.baseUnit.unitName}`,
  };
}

export async function deleteInvUnitConversion(institutionId: string, conversionId: string) {
  const conversion = await prisma.invUnitConversion.findFirst({
    where: { id: conversionId, institutionId },
    include: { baseUnit: true, alternateUnit: true },
  });
  if (!conversion) throw new Error('Conversion not found');

  await prisma.invUnitConversion.delete({ where: { id: conversionId } });
  await logActivity(institutionId, 'UNIT_CONVERSION_DELETED', `Deleted conversion ${conversionId}`, { conversionId });

  return { success: true, message: 'Conversion removed' };
}

export async function seedCategoriesUnits(institutionId: string) {
  await seedInventoryDashboard(institutionId);
  await seedItemsManagement(institutionId);
  const academicYear = '2025-26';

  for (const u of UNIT_SEED) {
    const existing = await prisma.invUnit.findFirst({ where: { institutionId, unitCode: u.code } });
    if (!existing) {
      await prisma.invUnit.create({
        data: { institutionId, unitCode: u.code, unitName: u.name, isBase: u.isBase, academicYear },
      });
    } else if (existing.isBase !== u.isBase) {
      await prisma.invUnit.update({ where: { id: existing.id }, data: { isBase: u.isBase } });
    }
  }

  const units = await prisma.invUnit.findMany({ where: { institutionId } });
  const unitMap = new Map(units.map((u) => [u.unitCode, u.id]));

  for (const [altCode, baseCode, factor] of CONVERSION_SEED) {
    const baseUnitId = unitMap.get(baseCode);
    const alternateUnitId = unitMap.get(altCode);
    if (!baseUnitId || !alternateUnitId) continue;
    const existing = await prisma.invUnitConversion.findFirst({
      where: { institutionId, baseUnitId, alternateUnitId },
    });
    if (!existing) {
      await prisma.invUnitConversion.create({
        data: { institutionId, baseUnitId, alternateUnitId, conversionFactor: factor, academicYear },
      });
    }
  }

  const lab = await prisma.invCategory.findFirst({ where: { institutionId, categoryCode: 'LAB' } });
  if (lab && !lab.parentId) {
    const physics = await prisma.invCategory.upsert({
      where: { institutionId_categoryCode: { institutionId, categoryCode: 'LAB-PHY' } },
      create: {
        institutionId,
        parentId: lab.id,
        categoryCode: 'LAB-PHY',
        categoryName: 'Physics',
        skuPrefix: 'LABPHY',
        baseUnit: 'Set',
        ledgerCode: 'GL-LAB-PHY',
        color: '#2563eb',
        sortOrder: 0,
        academicYear,
      },
      update: { parentId: lab.id, baseUnit: 'Set', ledgerCode: 'GL-LAB-PHY' },
    });

    await prisma.invCategory.upsert({
      where: { institutionId_categoryCode: { institutionId, categoryCode: 'LAB-PHY-OPT' } },
      create: {
        institutionId,
        parentId: physics.id,
        categoryCode: 'LAB-PHY-OPT',
        categoryName: 'Optics',
        skuPrefix: 'LABOPT',
        baseUnit: 'Pcs',
        ledgerCode: 'GL-LAB-OPT',
        color: '#1d4ed8',
        sortOrder: 0,
        academicYear,
      },
      update: { parentId: physics.id, baseUnit: 'Pcs', ledgerCode: 'GL-LAB-OPT' },
    });

    await prisma.invCategory.upsert({
      where: { institutionId_categoryCode: { institutionId, categoryCode: 'LAB-CHE' } },
      create: {
        institutionId,
        parentId: lab.id,
        categoryCode: 'LAB-CHE',
        categoryName: 'Chemistry',
        skuPrefix: 'LABCHE',
        baseUnit: 'Ltr',
        ledgerCode: 'GL-LAB-CHE',
        color: '#0ea5e9',
        sortOrder: 1,
        academicYear,
      },
      update: { parentId: lab.id, baseUnit: 'Ltr', ledgerCode: 'GL-LAB-CHE' },
    });
  }

  const books = await prisma.invCategory.findFirst({ where: { institutionId, categoryCode: 'BOOKS' } });
  if (books) {
    await prisma.invCategory.update({
      where: { id: books.id },
      data: { baseUnit: 'Pcs', ledgerCode: 'GL-BOOKS', skuPrefix: 'BOOKS' },
    });
    await prisma.invCategory.upsert({
      where: { institutionId_categoryCode: { institutionId, categoryCode: 'BOOKS-CON' } },
      create: {
        institutionId,
        parentId: books.id,
        categoryCode: 'BOOKS-CON',
        categoryName: 'Consumables',
        skuPrefix: 'BOOKCON',
        baseUnit: 'Pcs',
        ledgerCode: 'GL-BOOKS-CON',
        color: '#059669',
        sortOrder: 0,
        academicYear,
      },
      update: { parentId: books.id },
    });
  }

  for (const cat of await prisma.invCategory.findMany({ where: { institutionId, skuPrefix: '' } })) {
    await prisma.invCategory.update({
      where: { id: cat.id },
      data: { skuPrefix: cat.categoryCode.replace(/-/g, '').slice(0, 8) },
    });
  }

  await logActivity(institutionId, 'SEED_CATEGORIES_UNITS', 'Categories & Units seeded with hierarchy and conversions');
  return getCategoriesUnits(institutionId, academicYear);
}
