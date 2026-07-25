import { prisma } from './prisma.js';
import { seedCategoriesSubjects } from './libraryCategories.js';

type ShelfWithPath = {
  id: string;
  shelfNumber: string;
  capacity: number;
  sortOrder: number;
  currentOccupancy: number;
  availableSpace: number;
  rackNumber: string;
  aisleName: string;
  floorName: string;
  branchName: string;
  locationLabel: string;
};

export function formatLocationLabel(parts: {
  floorName?: string;
  aisleName?: string;
  rackNumber?: string;
  shelfNumber?: string;
  branchName?: string;
}): string {
  const segments: string[] = [];
  if (parts.floorName) segments.push(parts.floorName);
  if (parts.aisleName) segments.push(parts.aisleName);
  if (parts.rackNumber) segments.push(`Rack ${parts.rackNumber}`);
  if (parts.shelfNumber) segments.push(`Shelf ${parts.shelfNumber}`);
  return segments.join(', ') || parts.branchName || 'Unassigned';
}

async function logActivity(institutionId: string, action: string, details: string, entityId = '') {
  await prisma.libActivityLog.create({
    data: { institutionId, entityType: 'LibRack', entityId, action, details, performedBy: 'Librarian' },
  });
}

async function loadShelfPaths(institutionId: string): Promise<Map<string, ShelfWithPath>> {
  const shelves = await prisma.libShelf.findMany({
    where: { institutionId, status: 'ACTIVE' },
    include: {
      rack: {
        include: {
          location: { include: { parent: true, branch: true } },
        },
      },
      _count: { select: { bookCopies: true } },
    },
  });

  const map = new Map<string, ShelfWithPath>();
  for (const s of shelves) {
    const aisle = s.rack.location;
    const floor = aisle.parent;
    const label = formatLocationLabel({
      floorName: floor?.locationName,
      aisleName: aisle.locationName,
      rackNumber: s.rack.rackNumber,
      shelfNumber: s.shelfNumber,
    });
    map.set(s.id, {
      id: s.id,
      shelfNumber: s.shelfNumber,
      capacity: s.capacity,
      sortOrder: s.sortOrder,
      currentOccupancy: s._count.bookCopies,
      availableSpace: Math.max(0, s.capacity - s._count.bookCopies),
      rackNumber: s.rack.rackNumber,
      aisleName: aisle.locationName,
      floorName: floor?.locationName ?? '',
      branchName: aisle.branch.branchName,
      locationLabel: label,
    });
  }
  return map;
}

export async function resolveShelfLocationLabel(institutionId: string, shelfId: string | null | undefined) {
  if (!shelfId) return '';
  const paths = await loadShelfPaths(institutionId);
  return paths.get(shelfId)?.locationLabel ?? '';
}

export async function getRackManagement(institutionId: string) {
  const [branches, locations, racks, shelves, categories, copies, shelfPaths] = await Promise.all([
    prisma.libBranch.findMany({ where: { institutionId, status: 'ACTIVE' }, orderBy: { branchName: 'asc' } }),
    prisma.libLocation.findMany({
      where: { institutionId, status: 'ACTIVE' },
      orderBy: [{ sortOrder: 'asc' }, { locationName: 'asc' }],
    }),
    prisma.libRack.findMany({
      where: { institutionId, status: 'ACTIVE' },
      orderBy: { rackNumber: 'asc' },
    }),
    prisma.libShelf.findMany({
      where: { institutionId, status: 'ACTIVE' },
      include: { _count: { select: { bookCopies: true } } },
      orderBy: [{ sortOrder: 'asc' }, { shelfNumber: 'asc' }],
    }),
    prisma.libCategory.findMany({
      where: { institutionId, status: 'ACTIVE' },
      select: { id: true, categoryCode: true, categoryName: true, defaultRackId: true },
      orderBy: { categoryName: 'asc' },
    }),
    prisma.libBookCopy.findMany({
      where: { institutionId },
      include: {
        book: { select: { id: true, title: true, categoryId: true, category: { select: { categoryName: true } } } },
        shelf: true,
      },
      take: 500,
    }),
    loadShelfPaths(institutionId),
  ]);

  const shelfByRack = new Map<string, typeof shelves>();
  for (const s of shelves) {
    const list = shelfByRack.get(s.rackId) ?? [];
    list.push(s);
    shelfByRack.set(s.rackId, list);
  }

  const racksByLocation = new Map<string, typeof racks>();
  for (const r of racks) {
    const list = racksByLocation.get(r.locationId) ?? [];
    list.push(r);
    racksByLocation.set(r.locationId, list);
  }

  const floorsByBranch = new Map<string, typeof locations>();
  const aislesByFloor = new Map<string, typeof locations>();
  for (const loc of locations) {
    if (loc.locationType === 'FLOOR') {
      const list = floorsByBranch.get(loc.branchId) ?? [];
      list.push(loc);
      floorsByBranch.set(loc.branchId, list);
    } else if (loc.locationType === 'AISLE' && loc.parentId) {
      const list = aislesByFloor.get(loc.parentId) ?? [];
      list.push(loc);
      aislesByFloor.set(loc.parentId, list);
    }
  }

  const tree = branches.map((branch) => ({
    id: branch.id,
    code: branch.branchCode,
    name: branch.branchName,
    floors: (floorsByBranch.get(branch.id) ?? []).map((floor) => ({
      id: floor.id,
      locationName: floor.locationName,
      locationCode: floor.locationCode,
      locationType: floor.locationType,
      aisles: (aislesByFloor.get(floor.id) ?? []).map((aisle) => ({
        id: aisle.id,
        locationName: aisle.locationName,
        locationCode: aisle.locationCode,
        locationType: aisle.locationType,
        racks: (racksByLocation.get(aisle.id) ?? []).map((rack) => {
          const rackShelves = shelfByRack.get(rack.id) ?? [];
          const currentOccupancy = rackShelves.reduce((sum, sh) => sum + sh._count.bookCopies, 0);
          return {
            id: rack.id,
            rackNumber: rack.rackNumber,
            capacity: rack.capacity,
            currentOccupancy,
            availableSpace: Math.max(0, rack.capacity - currentOccupancy),
            assetTag: rack.assetTag,
            description: rack.description,
            defaultCategoryIds: categories.filter((c) => c.defaultRackId === rack.id).map((c) => c.id),
            shelves: rackShelves.map((sh) => ({
              id: sh.id,
              shelfNumber: sh.shelfNumber,
              capacity: sh.capacity,
              currentOccupancy: sh._count.bookCopies,
              availableSpace: Math.max(0, sh.capacity - sh._count.bookCopies),
              locationLabel: shelfPaths.get(sh.id)?.locationLabel ?? '',
            })),
          };
        }),
      })),
    })),
  }));

  const totalCapacity = racks.reduce((s, r) => s + r.capacity, 0);
  const totalOccupancy = copies.filter((c) => c.shelfId).length;
  const spaceUtilization = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 1000) / 10 : 0;

  const spaceUtilizationReport = racks.map((rack) => {
    const rackShelves = shelfByRack.get(rack.id) ?? [];
    const occ = rackShelves.reduce((sum, sh) => sum + sh._count.bookCopies, 0);
    const aisle = locations.find((l) => l.id === rack.locationId);
    const floor = aisle?.parentId ? locations.find((l) => l.id === aisle.parentId) : null;
    return {
      rackId: rack.id,
      rackNumber: rack.rackNumber,
      floor: floor?.locationName ?? '',
      aisle: aisle?.locationName ?? '',
      capacity: rack.capacity,
      currentOccupancy: occ,
      availableSpace: Math.max(0, rack.capacity - occ),
      utilizationPct: rack.capacity > 0 ? `${Math.round((occ / rack.capacity) * 1000) / 10}%` : '0%',
    };
  }).sort((a, b) => b.currentOccupancy - a.currentOccupancy);

  const misplacedBooks = copies
    .filter((c) => {
      if (!c.shelfId && c.rackLocation) return true;
      if (c.shelfId) {
        const expected = shelfPaths.get(c.shelfId)?.locationLabel ?? '';
        return expected && c.rackLocation && c.rackLocation !== expected;
      }
      return !c.shelfId && !c.rackLocation;
    })
    .slice(0, 50)
    .map((c) => ({
      copyId: c.id,
      accessionNo: c.copyCode,
      title: c.book.title,
      category: c.book.category?.categoryName ?? '—',
      recordedLocation: c.rackLocation || 'Unassigned',
      expectedLocation: c.shelfId ? (shelfPaths.get(c.shelfId)?.locationLabel ?? '—') : 'No shelf assigned',
      status: c.status,
    }));

  const unassignedCopies = copies
    .filter((c) => !c.shelfId)
    .slice(0, 100)
    .map((c) => ({
      copyId: c.id,
      accessionNo: c.copyCode,
      title: c.book.title,
      categoryId: c.book.categoryId,
      category: c.book.category?.categoryName ?? '—',
      rackLocation: c.rackLocation || '—',
    }));

  return {
    tree,
    branches: branches.map((b) => ({ id: b.id, code: b.branchCode, name: b.branchName })),
    categories: categories.map((c) => ({
      id: c.id,
      code: c.categoryCode,
      name: c.categoryName,
      defaultRackId: c.defaultRackId,
    })),
    summary: {
      totalRacks: racks.length,
      totalShelves: shelves.length,
      totalCapacity,
      totalOccupancy,
      availableSpace: Math.max(0, totalCapacity - totalOccupancy),
      spaceUtilizationPct: spaceUtilization,
    },
    spaceUtilizationReport,
    misplacedBooks,
    unassignedCopies,
    reports: ['Space Utilization Report', 'Misplaced Books (stock verification)'],
    mobileSync: ['OPAC detail page shows exact shelf location'],
    assetIntegration: 'Racks tracked as physical assets via asset tag',
    roles: ['Librarian'],
  };
}

export async function createLocation(
  institutionId: string,
  data: {
    branchId: string;
    locationType: 'FLOOR' | 'AISLE';
    locationName: string;
    locationCode?: string;
    parentId?: string;
    description?: string;
    sortOrder?: number;
  },
) {
  if (!data.locationName?.trim()) throw new Error('Location name is required');
  if (data.locationType === 'AISLE' && !data.parentId) {
    throw new Error('Aisle requires a parent floor');
  }

  const code = (data.locationCode ?? data.locationName).trim().toUpperCase().replace(/\s+/g, '-').slice(0, 20);
  const maxOrder = await prisma.libLocation.aggregate({
    where: { institutionId, branchId: data.branchId, parentId: data.parentId ?? null },
    _max: { sortOrder: true },
  });

  const loc = await prisma.libLocation.create({
    data: {
      institutionId,
      branchId: data.branchId,
      parentId: data.parentId ?? null,
      locationType: data.locationType,
      locationName: data.locationName.trim(),
      locationCode: code,
      description: data.description ?? '',
      sortOrder: data.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });

  await logActivity(institutionId, 'CREATE_LOCATION', `${data.locationType} "${loc.locationName}" created`, loc.id);
  return loc;
}

export async function updateLocation(
  institutionId: string,
  locationId: string,
  data: Partial<{ locationName: string; description: string; sortOrder: number; status: string }>,
) {
  const existing = await prisma.libLocation.findFirst({ where: { institutionId, id: locationId } });
  if (!existing) throw new Error('Location not found');

  await prisma.libLocation.update({
    where: { id: locationId },
    data: {
      ...(data.locationName != null && { locationName: data.locationName }),
      ...(data.description != null && { description: data.description }),
      ...(data.sortOrder != null && { sortOrder: data.sortOrder }),
      ...(data.status != null && { status: data.status }),
    },
  });

  await logActivity(institutionId, 'UPDATE_LOCATION', `Location "${existing.locationName}" updated`, locationId);
  return getRackManagement(institutionId);
}

export async function deleteLocation(institutionId: string, locationId: string) {
  const loc = await prisma.libLocation.findFirst({
    where: { institutionId, id: locationId },
    include: { children: true, racks: true },
  });
  if (!loc) throw new Error('Location not found');
  if (loc.children.length > 0) throw new Error('Cannot delete — location has child aisles');
  if (loc.racks.length > 0) throw new Error('Cannot delete — location has racks assigned');

  await prisma.libLocation.delete({ where: { id: locationId } });
  await logActivity(institutionId, 'DELETE_LOCATION', `Location "${loc.locationName}" deleted`, locationId);
  return { success: true };
}

export async function createRack(
  institutionId: string,
  data: {
    locationId: string;
    rackNumber: string;
    capacity: number;
    assetTag?: string;
    description?: string;
  },
) {
  if (!data.rackNumber?.trim()) throw new Error('Rack number is required');
  if (!data.capacity || data.capacity < 1) throw new Error('Capacity must be at least 1');

  const loc = await prisma.libLocation.findFirst({
    where: { institutionId, id: data.locationId, locationType: 'AISLE' },
  });
  if (!loc) throw new Error('Rack must be assigned to an aisle');

  const rack = await prisma.libRack.create({
    data: {
      institutionId,
      locationId: data.locationId,
      rackNumber: data.rackNumber.trim(),
      capacity: data.capacity,
      assetTag: data.assetTag ?? '',
      description: data.description ?? '',
    },
  });

  await logActivity(institutionId, 'CREATE_RACK', `Rack ${rack.rackNumber} created`, rack.id);
  return rack;
}

export async function updateRack(
  institutionId: string,
  rackId: string,
  data: Partial<{ rackNumber: string; capacity: number; assetTag: string; description: string; status: string }>,
) {
  const existing = await prisma.libRack.findFirst({ where: { institutionId, id: rackId } });
  if (!existing) throw new Error('Rack not found');

  await prisma.libRack.update({
    where: { id: rackId },
    data: {
      ...(data.rackNumber != null && { rackNumber: data.rackNumber }),
      ...(data.capacity != null && { capacity: data.capacity }),
      ...(data.assetTag != null && { assetTag: data.assetTag }),
      ...(data.description != null && { description: data.description }),
      ...(data.status != null && { status: data.status }),
    },
  });

  await logActivity(institutionId, 'UPDATE_RACK', `Rack ${existing.rackNumber} updated`, rackId);
  return getRackManagement(institutionId);
}

export async function deleteRack(institutionId: string, rackId: string) {
  const rack = await prisma.libRack.findFirst({
    where: { institutionId, id: rackId },
    include: { shelves: { include: { _count: { select: { bookCopies: true } } } } },
  });
  if (!rack) throw new Error('Rack not found');

  const booksOnRack = rack.shelves.reduce((s, sh) => s + sh._count.bookCopies, 0);
  if (booksOnRack > 0) throw new Error('Cannot delete — books are assigned to shelves on this rack');

  await prisma.libCategory.updateMany({ where: { defaultRackId: rackId }, data: { defaultRackId: null } });
  await prisma.libShelf.deleteMany({ where: { rackId } });
  await prisma.libRack.delete({ where: { id: rackId } });
  await logActivity(institutionId, 'DELETE_RACK', `Rack ${rack.rackNumber} deleted`, rackId);
  return { success: true };
}

export async function createShelf(
  institutionId: string,
  data: { rackId: string; shelfNumber: string; capacity?: number; sortOrder?: number },
) {
  if (!data.shelfNumber?.trim()) throw new Error('Shelf number is required');

  const rack = await prisma.libRack.findFirst({ where: { institutionId, id: data.rackId } });
  if (!rack) throw new Error('Rack not found');

  const maxOrder = await prisma.libShelf.aggregate({
    where: { institutionId, rackId: data.rackId },
    _max: { sortOrder: true },
  });

  const shelf = await prisma.libShelf.create({
    data: {
      institutionId,
      rackId: data.rackId,
      shelfNumber: data.shelfNumber.trim(),
      capacity: data.capacity ?? 20,
      sortOrder: data.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });

  await logActivity(institutionId, 'CREATE_SHELF', `Shelf ${shelf.shelfNumber} on rack ${rack.rackNumber}`, shelf.id);
  return shelf;
}

export async function updateShelf(
  institutionId: string,
  shelfId: string,
  data: Partial<{ shelfNumber: string; capacity: number; sortOrder: number; status: string }>,
) {
  const existing = await prisma.libShelf.findFirst({ where: { institutionId, id: shelfId } });
  if (!existing) throw new Error('Shelf not found');

  await prisma.libShelf.update({
    where: { id: shelfId },
    data: {
      ...(data.shelfNumber != null && { shelfNumber: data.shelfNumber }),
      ...(data.capacity != null && { capacity: data.capacity }),
      ...(data.sortOrder != null && { sortOrder: data.sortOrder }),
      ...(data.status != null && { status: data.status }),
    },
  });

  return getRackManagement(institutionId);
}

export async function deleteShelf(institutionId: string, shelfId: string) {
  const shelf = await prisma.libShelf.findFirst({
    where: { institutionId, id: shelfId },
    include: { _count: { select: { bookCopies: true } } },
  });
  if (!shelf) throw new Error('Shelf not found');
  if (shelf._count.bookCopies > 0) throw new Error('Cannot delete — books are assigned to this shelf');

  await prisma.libShelf.delete({ where: { id: shelfId } });
  return { success: true };
}

export async function suggestRackForCategory(institutionId: string, categoryId: string) {
  const category = await prisma.libCategory.findFirst({
    where: { institutionId, id: categoryId },
    include: {
      defaultRack: {
        include: {
          location: { include: { parent: true, branch: true } },
          shelves: { include: { _count: { select: { bookCopies: true } } } },
        },
      },
    },
  });
  if (!category) throw new Error('Category not found');
  if (!category.defaultRack) {
    return { suggested: false, message: 'No default rack configured for this category' };
  }

  const rack = category.defaultRack;
  const aisle = rack.location;
  const floor = aisle.parent;
  const bestShelf = rack.shelves
    .map((s) => ({ ...s, available: s.capacity - s._count.bookCopies }))
    .filter((s) => s.available > 0)
    .sort((a, b) => b.available - a.available)[0];

  return {
    suggested: true,
    rackId: rack.id,
    rackNumber: rack.rackNumber,
    shelfId: bestShelf?.id ?? null,
    shelfNumber: bestShelf?.shelfNumber ?? null,
    locationLabel: formatLocationLabel({
      floorName: floor?.locationName,
      aisleName: aisle.locationName,
      rackNumber: rack.rackNumber,
      shelfNumber: bestShelf?.shelfNumber,
    }),
    branchName: aisle.branch.branchName,
    capacityWarning: bestShelf ? bestShelf.available <= 2 : true,
  };
}

export async function setCategoryDefaultRack(institutionId: string, categoryId: string, rackId: string | null) {
  await prisma.libCategory.updateMany({
    where: { institutionId, id: categoryId },
    data: { defaultRackId: rackId },
  });
  return suggestRackForCategory(institutionId, categoryId).catch(() => ({ suggested: false }));
}

export async function assignBooksToShelf(
  institutionId: string,
  copyIds: string[],
  shelfId: string,
  force = false,
) {
  const shelf = await prisma.libShelf.findFirst({
    where: { institutionId, id: shelfId },
    include: {
      _count: { select: { bookCopies: true } },
      rack: { include: { location: { include: { parent: true, branch: true } } } },
    },
  });
  if (!shelf) throw new Error('Shelf not found');

  const current = shelf._count.bookCopies;
  const incoming = copyIds.length;
  const afterAssign = current + incoming;

  if (afterAssign > shelf.capacity && !force) {
    return {
      success: false,
      warning: true,
      message: `Shelf capacity is ${shelf.capacity}. Assigning ${incoming} book(s) would result in ${afterAssign} — over capacity by ${afterAssign - shelf.capacity}.`,
      currentOccupancy: current,
      availableSpace: Math.max(0, shelf.capacity - current),
      capacity: shelf.capacity,
    };
  }

  const aisle = shelf.rack.location;
  const floor = aisle.parent;
  const locationLabel = formatLocationLabel({
    floorName: floor?.locationName,
    aisleName: aisle.locationName,
    rackNumber: shelf.rack.rackNumber,
    shelfNumber: shelf.shelfNumber,
  });

  await prisma.libBookCopy.updateMany({
    where: { institutionId, id: { in: copyIds } },
    data: { shelfId, rackLocation: locationLabel },
  });

  await logActivity(
    institutionId,
    'ASSIGN_SHELF',
    `Assigned ${copyIds.length} book(s) to ${locationLabel}`,
    shelfId,
  );

  return {
    success: true,
    assigned: copyIds.length,
    locationLabel,
    warning: afterAssign > shelf.capacity,
    message: afterAssign > shelf.capacity
      ? `Assigned with capacity exceeded (${afterAssign}/${shelf.capacity})`
      : `Assigned ${copyIds.length} book(s) to ${locationLabel}`,
    data: await getRackManagement(institutionId),
  };
}

export async function bulkAssignByCategory(
  institutionId: string,
  categoryId: string,
  shelfId: string,
  force = false,
) {
  const copies = await prisma.libBookCopy.findMany({
    where: { institutionId, book: { categoryId }, shelfId: null },
    select: { id: true },
    take: 200,
  });

  if (!copies.length) {
    return { success: false, message: 'No unassigned copies found for this category' };
  }

  const suggestion = await suggestRackForCategory(institutionId, categoryId).catch(() => null);
  const targetShelfId = shelfId || suggestion?.shelfId;
  if (!targetShelfId) {
    return { success: false, message: 'No shelf specified and no default rack shelf available' };
  }

  return assignBooksToShelf(
    institutionId,
    copies.map((c) => c.id),
    targetShelfId,
    force,
  );
}

export async function seedRackManagement(institutionId: string) {
  await seedCategoriesSubjects(institutionId);

  const branch = await prisma.libBranch.findFirst({ where: { institutionId } });
  if (!branch) throw new Error('No library branch found — seed dashboard first');

  const floorCodes = ['FL-1', 'FL-2'];
  const floors: { id: string; code: string }[] = [];
  for (const [i, code] of floorCodes.entries()) {
    let floor = await prisma.libLocation.findUnique({
      where: { institutionId_branchId_locationCode: { institutionId, branchId: branch.id, locationCode: code } },
    });
    if (!floor) {
      floor = await prisma.libLocation.create({
        data: {
          institutionId,
          branchId: branch.id,
          locationType: 'FLOOR',
          locationName: `Floor ${i + 1}`,
          locationCode: code,
          sortOrder: i,
        },
      });
    }
    floors.push({ id: floor.id, code });
  }

  const aisleSeed = [
    { floor: 0, code: 'AISLE-A', name: 'Aisle A' },
    { floor: 0, code: 'AISLE-B', name: 'Aisle B' },
    { floor: 1, code: 'AISLE-C', name: 'Aisle C' },
    { floor: 1, code: 'AISLE-D', name: 'Aisle D' },
  ];

  const aisles: { id: string; code: string }[] = [];
  for (const [i, a] of aisleSeed.entries()) {
    let aisle = await prisma.libLocation.findUnique({
      where: { institutionId_branchId_locationCode: { institutionId, branchId: branch.id, locationCode: a.code } },
    });
    if (!aisle) {
      aisle = await prisma.libLocation.create({
        data: {
          institutionId,
          branchId: branch.id,
          parentId: floors[a.floor].id,
          locationType: 'AISLE',
          locationName: a.name,
          locationCode: a.code,
          sortOrder: i,
        },
      });
    }
    aisles.push({ id: aisle.id, code: a.code });
  }

  const rackSeed = [
    { aisle: 0, num: '1', cap: 60, asset: 'AST-RACK-001' },
    { aisle: 0, num: '2', cap: 50, asset: 'AST-RACK-002' },
    { aisle: 1, num: '3', cap: 40, asset: 'AST-RACK-003' },
    { aisle: 1, num: '4', cap: 45, asset: 'AST-RACK-004' },
    { aisle: 2, num: '1', cap: 55, asset: 'AST-RACK-005' },
    { aisle: 3, num: '2', cap: 30, asset: 'AST-RACK-006' },
  ];

  const racks: { id: string; num: string }[] = [];
  for (const r of rackSeed) {
    let rack = await prisma.libRack.findFirst({
      where: { institutionId, locationId: aisles[r.aisle].id, rackNumber: r.num },
    });
    if (!rack) {
      rack = await prisma.libRack.create({
        data: {
          institutionId,
          locationId: aisles[r.aisle].id,
          rackNumber: r.num,
          capacity: r.cap,
          assetTag: r.asset,
          description: `Physical asset ${r.asset}`,
        },
      });
    }
    racks.push({ id: rack.id, num: r.num });

    for (let s = 1; s <= 4; s += 1) {
      const shelfNum = String(s);
      const exists = await prisma.libShelf.findFirst({
        where: { institutionId, rackId: rack.id, shelfNumber: shelfNum },
      });
      if (!exists) {
        await prisma.libShelf.create({
          data: { institutionId, rackId: rack.id, shelfNumber: shelfNum, capacity: 15, sortOrder: s },
        });
      }
    }
  }

  const categories = await prisma.libCategory.findMany({ where: { institutionId }, take: 10 });
  const catRackMap: Record<string, number> = {
    SCI: 0, FIC: 1, REF: 2, ACA: 4, OTH: 5,
  };
  for (const cat of categories) {
    const rackIdx = catRackMap[cat.categoryCode];
    if (rackIdx != null && racks[rackIdx]) {
      await prisma.libCategory.update({
        where: { id: cat.id },
        data: { defaultRackId: racks[rackIdx].id },
      });
    }
  }

  const copies = await prisma.libBookCopy.findMany({
    where: { institutionId, shelfId: null },
    include: { book: { include: { category: true } } },
    take: 80,
  });

  const allShelves = await prisma.libShelf.findMany({
    where: { institutionId },
    include: { rack: { include: { location: { include: { parent: true } } } } },
  });

  for (const copy of copies) {
    const catCode = copy.book.category?.categoryCode;
    const rackIdx = catCode ? catRackMap[catCode] : 0;
    const rackId = racks[rackIdx ?? 0]?.id;
    const shelf = allShelves.find((s) => s.rackId === rackId && s.shelfNumber === '1')
      ?? allShelves[0];
    if (!shelf) continue;

    const aisle = shelf.rack.location;
    const floor = aisle.parent;
    const label = formatLocationLabel({
      floorName: floor?.locationName,
      aisleName: aisle.locationName,
      rackNumber: shelf.rack.rackNumber,
      shelfNumber: shelf.shelfNumber,
    });

    await prisma.libBookCopy.update({
      where: { id: copy.id },
      data: { shelfId: shelf.id, rackLocation: label },
    });
  }

  await logActivity(institutionId, 'SEED', 'Rack management layout seeded');
  return getRackManagement(institutionId);
}
