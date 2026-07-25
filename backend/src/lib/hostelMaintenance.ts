import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedHostelStudents } from './hostelStudents.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const CATEGORIES = ['ELECTRICAL', 'PLUMBING', 'FURNITURE', 'HVAC', 'GENERAL'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
const OPEN_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS'];

type Category = typeof CATEGORIES[number];
type Priority = typeof PRIORITIES[number];

function formatDateTime(d: Date) {
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusColor(status: string) {
  if (status === 'OPEN') return 'red';
  if (status === 'ASSIGNED' || status === 'IN_PROGRESS') return 'yellow';
  return 'green';
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    OPEN: 'Open',
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
  };
  return map[status] ?? status;
}

async function logMaintenanceAudit(
  institutionId: string,
  maintenanceId: string,
  action: string,
  fromStatus: string,
  toStatus: string,
  performedBy: string,
  details = '',
) {
  await prisma.hostelMaintenanceAuditLog.create({
    data: { institutionId, maintenanceId, action, fromStatus, toStatus, performedBy, details },
  });
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'System',
) {
  await prisma.hostelActivityLog.create({
    data: {
      institutionId,
      action,
      details,
      filterSnapshot: snapshot as Prisma.InputJsonValue,
      performedBy,
    },
  });
}

async function nextTicketNumber(institutionId: string) {
  const count = await prisma.hostelMaintenanceRequest.count({ where: { institutionId } });
  return `MT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
}

function mapTicketRow(t: {
  id: string;
  ticketNumber: string;
  issue: string;
  description: string;
  category: string;
  location: string;
  priority: string;
  status: string;
  raisedBy: string;
  raisedByRole: string;
  assignedTechnicianName: string;
  facilityManagerName: string;
  fixNotes: string;
  requestDate: Date;
  assignedAt: Date | null;
  workStartedAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  hostel: { hostelName: string };
  partUsages?: { itemName: string; quantity: number; unit: string }[];
}) {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    issue: t.issue,
    description: t.description,
    category: t.category.replace('_', ' '),
    categoryCode: t.category,
    location: t.location || t.hostel.hostelName,
    hostel: t.hostel.hostelName,
    priority: t.priority,
    status: t.status,
    statusLabel: statusLabel(t.status),
    statusColor: statusColor(t.status),
    raisedBy: t.raisedBy,
    raisedByRole: t.raisedByRole,
    assignedTechnician: t.assignedTechnicianName || '—',
    facilityManager: t.facilityManagerName || '—',
    fixNotes: t.fixNotes,
    requestDate: formatDate(t.requestDate),
    assignedAt: t.assignedAt ? formatDateTime(t.assignedAt) : null,
    workStartedAt: t.workStartedAt ? formatDateTime(t.workStartedAt) : null,
    resolvedAt: t.resolvedAt ? formatDateTime(t.resolvedAt) : null,
    closedAt: t.closedAt ? formatDateTime(t.closedAt) : null,
    partsUsed: (t.partUsages ?? []).map((p) => `${p.itemName} (${p.quantity} ${p.unit})`),
  };
}

export function countMaintenanceKpis(tickets: { status: string }[]) {
  let open = 0;
  let inProgress = 0;
  let resolved = 0;
  let closed = 0;

  for (const t of tickets) {
    if (t.status === 'OPEN') open += 1;
    else if (t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS') inProgress += 1;
    else if (t.status === 'RESOLVED') resolved += 1;
    else if (t.status === 'CLOSED') closed += 1;
  }

  return { open, inProgress, resolved, closed, total: tickets.length };
}

function rolePermissions(role: string) {
  if (role === 'Student') {
    return { canRaise: true, canAssign: false, canWork: false, canResolve: false, canClose: false, canExport: false };
  }
  if (role === 'Technician') {
    return { canRaise: false, canAssign: false, canWork: true, canResolve: true, canClose: false, canExport: false };
  }
  if (role === 'Facility Manager') {
    return { canRaise: true, canAssign: true, canWork: false, canResolve: false, canClose: true, canExport: true };
  }
  return { canRaise: true, canAssign: true, canWork: true, canResolve: true, canClose: true, canExport: true };
}

export async function getMaintenanceManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: { status?: string; category?: string; userRole?: string } = {},
) {
  const where: Prisma.HostelMaintenanceRequestWhereInput = { institutionId, academicYear };
  if (filters.category && filters.category !== 'ALL') where.category = filters.category;
  if (filters.status && filters.status !== 'ALL') {
    if (filters.status === 'IN_PROGRESS') {
      where.status = { in: ['ASSIGNED', 'IN_PROGRESS'] };
    } else {
      where.status = filters.status;
    }
  }

  const [tickets, allTickets, hostels, students, inventory, technicians] = await Promise.all([
    prisma.hostelMaintenanceRequest.findMany({
      where,
      include: { hostel: true, partUsages: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.hostelMaintenanceRequest.findMany({ where: { institutionId, academicYear } }),
    prisma.hostelMaster.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' }, orderBy: { hostelName: 'asc' } }),
    prisma.hostelStudentProfile.findMany({
      where: { institutionId, academicYear, residentStatus: 'ACTIVE' },
      include: { student: true },
      take: 50,
    }),
    prisma.hostelInventoryItem.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      orderBy: { itemName: 'asc' },
    }),
    prisma.hostelStaff.findMany({
      where: { institutionId, status: 'ACTIVE', role: { in: ['TECHNICIAN', 'Technician', 'MAINTENANCE', 'WARDEN'] } },
      orderBy: { staffName: 'asc' },
    }),
  ]);

  const kpis = countMaintenanceKpis(allTickets);
  const statusChart = [
    { name: 'Open', value: kpis.open, color: '#ef4444', percent: kpis.total ? `${Math.round((kpis.open / kpis.total) * 100)}%` : '0%' },
    { name: 'In Progress', value: kpis.inProgress, color: '#f59e0b', percent: kpis.total ? `${Math.round((kpis.inProgress / kpis.total) * 100)}%` : '0%' },
    { name: 'Resolved', value: kpis.resolved, color: '#22c55e', percent: kpis.total ? `${Math.round((kpis.resolved / kpis.total) * 100)}%` : '0%' },
    { name: 'Closed', value: kpis.closed, color: '#10b981', percent: kpis.total ? `${Math.round((kpis.closed / kpis.total) * 100)}%` : '0%' },
  ];

  const lowStock = inventory.filter((i) => i.stockQty <= i.reorderLevel);

  await logActivity(institutionId, 'VIEW_MAINTENANCE', 'Maintenance management accessed', { academicYear }, filters.userRole);

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    categories: CATEGORIES.map((c) => ({ value: c, label: c.charAt(0) + c.slice(1).toLowerCase() })),
    priorities: PRIORITIES.map((p) => ({ value: p, label: p })),
    kpis,
    statusChart,
    tickets: tickets.map((t) => mapTicketRow(t)),
    widgetPreview: tickets.slice(0, 6).map((t) => mapTicketRow(t)),
    inventory: inventory.map((i) => ({
      id: i.id,
      itemCode: i.itemCode,
      itemName: i.itemName,
      category: i.category,
      stockQty: i.stockQty,
      unit: i.unit,
      reorderLevel: i.reorderLevel,
      lowStock: i.stockQty <= i.reorderLevel,
    })),
    lowStockCount: lowStock.length,
    students: students.map((s) => ({
      profileId: s.id,
      studentId: s.studentId,
      studentName: `${s.student.firstName} ${s.student.lastName}`.trim(),
      hostelId: s.hostelId,
    })),
    technicians: technicians.map((t) => ({ id: t.id, name: t.staffName, role: t.role, hostelId: t.hostelId })),
    hostels: hostels.map((h) => ({ id: h.id, name: h.hostelName })),
    permissions: rolePermissions(filters.userRole ?? 'Facility Manager'),
    statusFlow: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    reports: ['Maintenance Register', 'Technician Workload', 'Spare Parts Usage'],
    exportFormats: ['PDF', 'Excel', 'CSV'],
    erpIntegration: ['Inventory — auto-deduct spare parts on ticket close'],
    statusLegend: { open: 'Red', inProgress: 'Yellow', resolved: 'Green' },
  };
}

export async function raiseMaintenanceTicket(
  institutionId: string,
  body: {
    hostelId: string;
    issue: string;
    description?: string;
    category?: Category;
    location: string;
    priority?: Priority;
    raisedBy?: string;
    raisedByRole?: string;
    studentProfileId?: string;
    academicYear?: string;
  },
) {
  if (!body.hostelId || !body.issue || !body.location) {
    throw new Error('Hostel, issue, and location are required');
  }

  const academicYear = body.academicYear ?? '2025-26';
  const ticketNumber = await nextTicketNumber(institutionId);

  let studentId = '';
  let studentName = '';
  if (body.studentProfileId) {
    const profile = await prisma.hostelStudentProfile.findFirst({
      where: { id: body.studentProfileId, institutionId },
      include: { student: true },
    });
    if (profile) {
      studentId = profile.studentId;
      studentName = `${profile.student.firstName} ${profile.student.lastName}`.trim();
    }
  }

  const ticket = await prisma.hostelMaintenanceRequest.create({
    data: {
      institutionId,
      hostelId: body.hostelId,
      ticketNumber,
      issue: body.issue,
      description: body.description ?? '',
      category: body.category ?? 'GENERAL',
      location: body.location,
      priority: body.priority ?? 'MEDIUM',
      status: 'OPEN',
      raisedBy: body.raisedBy ?? (studentName || 'Warden'),
      raisedByRole: body.raisedByRole ?? (body.studentProfileId ? 'STUDENT' : 'WARDEN'),
      studentId,
      studentProfileId: body.studentProfileId ?? '',
      academicYear,
    },
    include: { hostel: true },
  });

  await logMaintenanceAudit(institutionId, ticket.id, 'TICKET_RAISED', '', 'OPEN', ticket.raisedBy, body.issue);
  await logActivity(institutionId, 'MAINTENANCE_TICKET', `Ticket ${ticketNumber} raised: ${body.issue}`, { ticketId: ticket.id });

  return {
    success: true,
    ticket: mapTicketRow({ ...ticket, partUsages: [] }),
    message: `Ticket ${ticketNumber} raised successfully`,
    notifications: [`Push notify Facility Manager: New maintenance ticket ${ticketNumber}`],
  };
}

export async function assignMaintenanceTechnician(
  institutionId: string,
  ticketId: string,
  body: { technicianId: string; technicianName?: string; facilityManagerName?: string },
) {
  const ticket = await prisma.hostelMaintenanceRequest.findFirst({
    where: { id: ticketId, institutionId },
    include: { hostel: true },
  });
  if (!ticket || ticket.status !== 'OPEN') {
    throw new Error('Ticket not found or not in OPEN status');
  }

  const technician = body.technicianId
    ? await prisma.hostelStaff.findFirst({ where: { id: body.technicianId, institutionId } })
    : null;

  const updated = await prisma.hostelMaintenanceRequest.update({
    where: { id: ticketId },
    data: {
      status: 'ASSIGNED',
      assignedTechnicianId: body.technicianId,
      assignedTechnicianName: body.technicianName ?? technician?.staffName ?? 'Technician',
      facilityManagerName: body.facilityManagerName ?? 'Facility Manager',
      assignedAt: new Date(),
    },
    include: { hostel: true, partUsages: true },
  });

  await logMaintenanceAudit(
    institutionId,
    ticketId,
    'ASSIGNED_TO_TECHNICIAN',
    'OPEN',
    'ASSIGNED',
    body.facilityManagerName ?? 'Facility Manager',
    updated.assignedTechnicianName,
  );

  return {
    success: true,
    ticket: mapTicketRow(updated),
    message: `Assigned to ${updated.assignedTechnicianName}`,
    notifications: [`Push to Technician: Ticket ${ticket.ticketNumber} assigned`],
  };
}

export async function startMaintenanceWork(
  institutionId: string,
  ticketId: string,
  body: { technicianName?: string },
) {
  const ticket = await prisma.hostelMaintenanceRequest.findFirst({ where: { id: ticketId, institutionId } });
  if (!ticket || !['ASSIGNED', 'OPEN'].includes(ticket.status)) {
    throw new Error('Ticket must be assigned before starting work');
  }

  const updated = await prisma.hostelMaintenanceRequest.update({
    where: { id: ticketId },
    data: {
      status: 'IN_PROGRESS',
      workStartedAt: new Date(),
      assignedTechnicianName: body.technicianName ?? (ticket.assignedTechnicianName || 'Technician'),
    },
    include: { hostel: true, partUsages: true },
  });

  await logMaintenanceAudit(
    institutionId,
    ticketId,
    'WORK_STARTED',
    ticket.status,
    'IN_PROGRESS',
    body.technicianName ?? 'Technician',
  );

  return { success: true, ticket: mapTicketRow(updated), message: 'Work started on ticket' };
}

export async function resolveMaintenanceTicket(
  institutionId: string,
  ticketId: string,
  body: { fixNotes: string; resolvedBy?: string },
) {
  const ticket = await prisma.hostelMaintenanceRequest.findFirst({ where: { id: ticketId, institutionId } });
  if (!ticket || !['ASSIGNED', 'IN_PROGRESS'].includes(ticket.status)) {
    throw new Error('Ticket must be in progress to resolve');
  }

  const updated = await prisma.hostelMaintenanceRequest.update({
    where: { id: ticketId },
    data: {
      status: 'RESOLVED',
      fixNotes: body.fixNotes,
      resolvedAt: new Date(),
      resolvedBy: body.resolvedBy ?? (ticket.assignedTechnicianName || 'Technician'),
    },
    include: { hostel: true, partUsages: true },
  });

  await logMaintenanceAudit(
    institutionId,
    ticketId,
    'ISSUE_FIXED',
    ticket.status,
    'RESOLVED',
    body.resolvedBy ?? 'Technician',
    body.fixNotes,
  );

  return {
    success: true,
    ticket: mapTicketRow(updated),
    message: 'Issue fixed — ready to close ticket',
    notifications: [`Push to Facility Manager: Ticket ${ticket.ticketNumber} resolved`],
  };
}

async function deductInventoryParts(
  institutionId: string,
  maintenanceId: string,
  parts: { inventoryItemId: string; quantity: number }[],
  deductedBy: string,
) {
  const usages = [];
  for (const part of parts) {
    const item = await prisma.hostelInventoryItem.findFirst({
      where: { id: part.inventoryItemId, institutionId },
    });
    if (!item) throw new Error(`Inventory item not found: ${part.inventoryItemId}`);
    if (item.stockQty < part.quantity) {
      throw new Error(`Insufficient stock for ${item.itemName} (available: ${item.stockQty} ${item.unit})`);
    }

    await prisma.hostelInventoryItem.update({
      where: { id: item.id },
      data: { stockQty: { decrement: part.quantity } },
    });

    const usage = await prisma.hostelMaintenancePartUsage.create({
      data: {
        institutionId,
        maintenanceId,
        inventoryItemId: item.id,
        itemName: item.itemName,
        quantity: part.quantity,
        unit: item.unit,
        deductedBy,
      },
    });
    usages.push(usage);

    await logActivity(
      institutionId,
      'INVENTORY_DEDUCT',
      `Deducted ${part.quantity} ${item.unit} of ${item.itemName} for maintenance ticket`,
      { maintenanceId, itemId: item.id, quantity: part.quantity },
      deductedBy,
    );
  }
  return usages;
}

export async function closeMaintenanceTicket(
  institutionId: string,
  ticketId: string,
  body: {
    closedBy?: string;
    parts?: { inventoryItemId: string; quantity: number }[];
  },
) {
  const ticket = await prisma.hostelMaintenanceRequest.findFirst({ where: { id: ticketId, institutionId } });
  if (!ticket || ticket.status !== 'RESOLVED') {
    throw new Error('Ticket must be resolved before closing');
  }

  if (body.parts?.length) {
    await deductInventoryParts(institutionId, ticketId, body.parts, body.closedBy ?? 'Facility Manager');
  }

  const updated = await prisma.hostelMaintenanceRequest.update({
    where: { id: ticketId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      closedBy: body.closedBy ?? 'Facility Manager',
    },
    include: { hostel: true, partUsages: true },
  });

  await logMaintenanceAudit(
    institutionId,
    ticketId,
    'TICKET_CLOSED',
    'RESOLVED',
    'CLOSED',
    body.closedBy ?? 'Facility Manager',
    body.parts?.length ? `${body.parts.length} spare part(s) deducted` : '',
  );

  return {
    success: true,
    ticket: mapTicketRow(updated),
    message: body.parts?.length
      ? `Ticket closed — ${body.parts.length} spare part(s) deducted from inventory`
      : 'Ticket closed',
  };
}

export async function getMaintenanceDetail(institutionId: string, ticketId: string) {
  const ticket = await prisma.hostelMaintenanceRequest.findFirst({
    where: { id: ticketId, institutionId },
    include: { hostel: true, partUsages: true, auditLogs: { orderBy: { createdAt: 'asc' } } },
  });
  if (!ticket) throw new Error('Ticket not found');

  return {
    ...mapTicketRow(ticket),
    auditTrail: ticket.auditLogs.map((a) => ({
      action: a.action,
      fromStatus: a.fromStatus,
      toStatus: a.toStatus,
      performedBy: a.performedBy,
      details: a.details,
      at: formatDateTime(a.createdAt),
    })),
  };
}

export async function exportMaintenanceReport(
  institutionId: string,
  academicYear: string,
  format: 'PDF' | 'Excel' | 'CSV',
  reportType = 'Maintenance Register',
) {
  const data = await getMaintenanceManagement(institutionId, academicYear);
  const fileName = `hostel_maintenance_${Date.now()}.${format.toLowerCase()}`;
  await logActivity(institutionId, 'EXPORT_MAINTENANCE', `Exported ${reportType}`, { format });
  return { success: true, format, fileName, message: `${reportType} exported`, snapshot: data };
}

async function seedInventory(institutionId: string, academicYear: string) {
  const items = [
    { itemCode: 'BULB-LED-9W', itemName: 'LED Lightbulb 9W', category: 'ELECTRICAL', stockQty: 48, unit: 'pcs' },
    { itemCode: 'FAUCET-STD', itemName: 'Standard Faucet', category: 'PLUMBING', stockQty: 12, unit: 'pcs' },
    { itemCode: 'FAN-MOTOR', itemName: 'Ceiling Fan Motor', category: 'ELECTRICAL', stockQty: 6, unit: 'pcs' },
    { itemCode: 'DOOR-LOCK', itemName: 'Door Lock Set', category: 'FURNITURE', stockQty: 8, unit: 'pcs' },
    { itemCode: 'HEATER-ELEM', itemName: 'Water Heater Element', category: 'HVAC', stockQty: 4, unit: 'pcs' },
    { itemCode: 'PIPE-PVC-1', itemName: 'PVC Pipe 1 inch', category: 'PLUMBING', stockQty: 25, unit: 'm' },
    { itemCode: 'SWITCH-2G', itemName: '2-Gang Switch', category: 'ELECTRICAL', stockQty: 3, unit: 'pcs' },
  ];

  for (const item of items) {
    await prisma.hostelInventoryItem.upsert({
      where: { institutionId_itemCode: { institutionId, itemCode: item.itemCode } },
      create: { institutionId, academicYear, ...item, reorderLevel: 5, status: 'ACTIVE' },
      update: { stockQty: item.stockQty, status: 'ACTIVE' },
    });
  }
}

export async function seedMaintenanceManagement(institutionId: string) {
  await seedHostelStudents(institutionId);
  const academicYear = '2025-26';

  const existing = await prisma.hostelMaintenanceRequest.count({ where: { institutionId, academicYear } });
  if (existing >= 20) return getMaintenanceManagement(institutionId, academicYear);

  await prisma.hostelMaintenanceAuditLog.deleteMany({ where: { institutionId } });
  await prisma.hostelMaintenancePartUsage.deleteMany({ where: { institutionId } });
  await prisma.hostelMaintenanceRequest.deleteMany({ where: { institutionId } });

  await seedInventory(institutionId, academicYear);

  const hostels = await prisma.hostelMaster.findMany({ where: { institutionId, status: 'ACTIVE' }, take: 3 });
  let technicians = await prisma.hostelStaff.findMany({
    where: { institutionId, status: 'ACTIVE' },
    take: 5,
  });
  if (technicians.length < 2) {
    for (const h of hostels.slice(0, 2)) {
      await prisma.hostelStaff.create({
        data: { institutionId, hostelId: h.id, staffName: `Tech ${h.hostelName}`, role: 'TECHNICIAN', mobile: '9876500000' },
      });
    }
    technicians = await prisma.hostelStaff.findMany({ where: { institutionId, status: 'ACTIVE' }, take: 5 });
  }

  const profiles = await prisma.hostelStudentProfile.findMany({
    where: { institutionId, residentStatus: 'ACTIVE' },
    include: { student: true },
    take: 30,
  });

  const ticketDefs: [string, string, string, string][] = [
    ['Room Light Not Working', 'ELECTRICAL', 'Boys Hostel A - Room A101', 'OPEN'],
    ['Water Heater Issue', 'HVAC', 'Girls Hostel B - Room GB210', 'OPEN'],
    ['Fan Not Working', 'ELECTRICAL', 'PG Hostel - Room PG12', 'CLOSED'],
    ['Door Lock Problem', 'FURNITURE', 'Boys Hostel B - Room B203', 'IN_PROGRESS'],
    ['Leaking Faucet', 'PLUMBING', 'Girls Hostel A - Room GA105', 'ASSIGNED'],
    ['Broken Window Latch', 'FURNITURE', 'Boys Hostel A - Room A205', 'RESOLVED'],
    ['AC Not Cooling', 'HVAC', 'PG Hostel - Room PG08', 'IN_PROGRESS'],
    ['Power Socket Sparking', 'ELECTRICAL', 'Girls Hostel B - Common Area', 'OPEN'],
  ];

  const inventory = await prisma.hostelInventoryItem.findMany({ where: { institutionId } });
  const bulb = inventory.find((i) => i.itemCode === 'BULB-LED-9W');
  const fan = inventory.find((i) => i.itemCode === 'FAN-MOTOR');

  let ticketIdx = 0;
  for (const [issue, category, location, status] of ticketDefs) {
    const hostel = hostels[ticketIdx % hostels.length];
    const tech = technicians[ticketIdx % technicians.length];
    const profile = profiles[ticketIdx % profiles.length];
    if (!hostel) break;

    ticketIdx += 1;
    const ticketNumber = `MT-2025-${String(ticketIdx).padStart(4, '0')}`;
    const now = new Date();

    const ticket = await prisma.hostelMaintenanceRequest.create({
      data: {
        institutionId,
        hostelId: hostel.id,
        ticketNumber,
        issue,
        description: `${issue} reported — requires attention.`,
        category,
        location,
        priority: issue.includes('Sparking') || issue.includes('Heater') ? 'HIGH' : 'MEDIUM',
        status,
        raisedBy: profile ? `${profile.student.firstName} ${profile.student.lastName}`.trim() : 'Warden',
        raisedByRole: ticketIdx % 2 === 0 ? 'STUDENT' : 'WARDEN',
        studentProfileId: profile?.id ?? '',
        studentId: profile?.studentId ?? '',
        facilityManagerName: status !== 'OPEN' ? 'Facility Manager' : '',
        assignedAt: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status) ? now : null,
        assignedTechnicianId: tech?.id ?? '',
        assignedTechnicianName: tech?.staffName ?? 'Technician',
        workStartedAt: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status) ? now : null,
        fixNotes: ['RESOLVED', 'CLOSED'].includes(status) ? 'Issue repaired and tested OK' : '',
        resolvedAt: ['RESOLVED', 'CLOSED'].includes(status) ? now : null,
        resolvedBy: tech?.staffName ?? 'Technician',
        closedAt: status === 'CLOSED' ? now : null,
        closedBy: status === 'CLOSED' ? 'Facility Manager' : '',
        academicYear,
      },
      include: { hostel: true },
    });

    await logMaintenanceAudit(institutionId, ticket.id, 'SEED', '', status, 'System');

    if (status === 'CLOSED' && bulb) {
      await prisma.hostelMaintenancePartUsage.create({
        data: {
          institutionId,
          maintenanceId: ticket.id,
          inventoryItemId: bulb.id,
          itemName: bulb.itemName,
          quantity: issue.includes('Fan') && fan ? 1 : 2,
          unit: bulb.unit,
          deductedBy: 'Facility Manager',
        },
      });
      if (issue.includes('Fan') && fan) {
        await prisma.hostelInventoryItem.update({ where: { id: fan.id }, data: { stockQty: { decrement: 1 } } });
      } else {
        await prisma.hostelInventoryItem.update({ where: { id: bulb.id }, data: { stockQty: { decrement: 2 } } });
      }
    }
  }

  for (let i = 0; i < 6; i += 1) {
    const hostel = hostels[i % hostels.length];
    if (!hostel) break;
    const extraIssues = ['Loose Tap Handle', 'Mattress Replacement', 'Curtain Rod Broken', 'Drain Blocked', 'Wi-Fi Router Reset', 'Mirror Cracked'];
    await prisma.hostelMaintenanceRequest.create({
      data: {
        institutionId,
        hostelId: hostel.id,
        ticketNumber: `MT-2025-${String(ticketIdx + i + 1).padStart(4, '0')}`,
        issue: extraIssues[i],
        description: extraIssues[i],
        category: 'GENERAL',
        location: `${hostel.hostelName} - Room ${100 + i}`,
        status: i % 3 === 0 ? 'OPEN' : i % 3 === 1 ? 'IN_PROGRESS' : 'CLOSED',
        raisedBy: 'Warden',
        raisedByRole: 'WARDEN',
        assignedTechnicianName: technicians[0]?.staffName ?? 'Technician',
        academicYear,
        closedAt: i % 3 === 2 ? new Date() : null,
        closedBy: i % 3 === 2 ? 'Facility Manager' : '',
      },
    });
  }

  await logActivity(institutionId, 'SEED_MAINTENANCE', 'Maintenance demo seeded');
  return getMaintenanceManagement(institutionId, academicYear);
}
