import type { Prisma } from '@prisma/client';
import { ExamTypeFilter, HolidayAudience, HolidayType } from '@prisma/client';
import { prisma } from './prisma.js';
import { getMergedCalendarEvents } from './institutionCalendar.js';
import { logUserActivity } from './securityAuditCompliance.js';

type SetupSections = Record<string, Record<string, unknown>>;
type DeptRecord = Record<string, string>;

const DEPT_TILE_KEYS = ['departmentsSetup', 'sessionTermSetup', 'calendarSetup'] as const;

function readSetupSections(tile: unknown): SetupSections {
  if (!tile || typeof tile !== 'object') return {};
  const t = tile as { sections?: SetupSections; records?: unknown };
  return t.sections || {};
}

function readRecords(tile: unknown): DeptRecord[] {
  if (!tile || typeof tile !== 'object') return [];
  const records = (tile as { records?: unknown }).records;
  if (!Array.isArray(records)) return [];
  return records.map((row) => {
    const out: DeptRecord = {};
    if (row && typeof row === 'object') {
      for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
        out[k] = v == null ? '' : String(v);
      }
    }
    return out;
  });
}

function readField(sections: SetupSections, sectionKeys: string | string[], key: string, fallback = '') {
  const keys = Array.isArray(sectionKeys) ? sectionKeys : [sectionKeys];
  for (const sectionKey of keys) {
    const val = sections[sectionKey]?.[key];
    if (val != null && String(val) !== '') return String(val);
  }
  return fallback;
}

function parseDateOnly(value: string): Date | null {
  const raw = value.trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function parseDateRangeLine(line: string): { title: string; start: Date; end: Date | null; extra?: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/^(.+?):\s*(\d{4}-\d{2}-\d{2})(?:\s+to\s+(\d{4}-\d{2}-\d{2}))?(?:\s*\|\s*(.+))?$/i);
  if (!m) return null;
  const start = parseDateOnly(m[2]);
  if (!start) return null;
  const end = m[3] ? parseDateOnly(m[3]) : null;
  return { title: m[1].trim(), start, end, extra: m[4]?.trim() };
}

function parseEventLines(raw: string) {
  return raw.split('\n').map(parseDateRangeLine).filter(Boolean) as Array<{
    title: string; start: Date; end: Date | null; extra?: string;
  }>;
}

function slugCode(name: string) {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32) || 'DEPT';
}

export function loadDepartmentOpsSetup(setup: {
  departmentsSetup?: unknown;
  sessionTermSetup?: unknown;
  calendarSetup?: unknown;
} | null) {
  const dept = readSetupSections(setup?.departmentsSetup);
  const session = readSetupSections(setup?.sessionTermSetup);
  const cal = readSetupSections(setup?.calendarSetup);
  const deptRecords = readRecords(setup?.departmentsSetup);

  return {
    departments: deptRecords,
    deptSettings: {
      requireCode: readField(dept, ['departmentList'], 'requireCode', 'Yes'),
      currency: readField(dept, ['departmentBudget'], 'currency', 'INR'),
      enableBudget: readField(dept, ['departmentBudget'], 'enableBudget', 'Yes'),
    },
    session: {
      sessionName: readField(session, ['academicSession'], 'sessionName', '2025-26'),
      admissionStart: readField(session, ['importantDates'], 'admissionStart', ''),
      admissionEnd: readField(session, ['importantDates'], 'admissionEnd', ''),
      resultDate: readField(session, ['importantDates'], 'resultDate', ''),
      registrationCutoff: readField(session, ['examinationPeriods'], 'registrationCutoff', ''),
      marksEntryDeadline: readField(session, ['examinationPeriods'], 'marksEntryDeadline', ''),
      examPeriods: readField(session, ['examinationPeriods'], 'examPeriods', ''),
      holidaysList: readField(session, ['holidays'], 'holidaysList', ''),
    },
    calendar: {
      academicEvents: readField(cal, ['academicCalendar'], 'academicEvents', ''),
      eventCalendar: readField(cal, ['eventCalendar'], 'eventEntries', ''),
      customEvents: readField(cal, ['customEvents'], 'customEventEntries', ''),
      layers: readField(cal, ['comprehensiveCalendar'], 'enabledLayers', 'ACADEMIC,EVENTS,EXAMS,HOLIDAYS,CUSTOM'),
    },
    calendarEvents: Array.isArray((setup?.calendarSetup as { events?: unknown })?.events)
      ? (setup?.calendarSetup as { events: Array<Record<string, string>> }).events
      : [],
  };
}

async function syncHrDepartment(
  institutionId: string,
  code: string,
  name: string,
  location: string,
  budget: number,
  hod: string,
) {
  const existing = await prisma.hrDepartment.findUnique({
    where: { institutionId_code: { institutionId, code } },
  });
  // Respect soft-deletes — do not resurrect a department the user removed from HR
  if (existing?.status === 'DELETED') {
    return existing.id;
  }

  const hr = await prisma.hrDepartment.upsert({
    where: { institutionId_code: { institutionId, code } },
    create: {
      institutionId,
      code,
      name,
      campus: location || 'Main Campus',
      budgetAllocation: budget,
      shortDescription: hod ? `HOD: ${hod}` : '',
      status: 'ACTIVE',
    },
    update: {
      name,
      campus: location || 'Main Campus',
      budgetAllocation: budget,
      shortDescription: hod ? `HOD: ${hod}` : '',
    },
  });
  return hr.id;
}

export async function syncDepartmentOpsFromSetup(institutionId: string, actorEmail = 'system') {
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    include: { setup: true },
  });
  if (!institution?.setup) return { synced: false };

  const config = loadDepartmentOpsSetup({
    departmentsSetup: institution.setup.departmentsSetup,
    sessionTermSetup: institution.setup.sessionTermSetup,
    calendarSetup: institution.setup.calendarSetup,
  });

  const fiscalYear = config.session.sessionName || '2025-26';
  let deptCount = 0;
  let headCount = 0;
  let staffCount = 0;
  let locationCount = 0;
  let budgetCount = 0;
  const syncedCodes = new Set<string>();

  for (const row of config.departments) {
    const name = (row.departmentName || '').trim();
    const code = (row.departmentCode || slugCode(name)).trim();
    if (!name || !code) continue;
    syncedCodes.add(code.toUpperCase());

    const hod = (row.hod || '').trim();
    const location = (row.location || '').trim();
    const budget = Number((row.budget || '0').replace(/[^\d.]/g, '')) || 0;
    const staffMembers = (row.staffMembers || hod).split(/[,;]/).map((s) => s.trim()).filter(Boolean);

    const hrId = await syncHrDepartment(institutionId, code, name, location, budget, hod);

    const dept = await prisma.opsDepartment.upsert({
      where: { institutionId_departmentCode: { institutionId, departmentCode: code } },
      create: {
        institutionId,
        departmentCode: code,
        departmentName: name,
        hrDepartmentId: hrId,
        isActive: true,
      },
      update: {
        departmentName: name,
        hrDepartmentId: hrId,
        isActive: true,
      },
    });
    deptCount += 1;

    if (hod) {
      await prisma.departmentHead.updateMany({
        where: { institutionId, departmentId: dept.id, isActive: true, staffName: { not: hod } },
        data: { isActive: false },
      });
      const existingHead = await prisma.departmentHead.findFirst({
        where: { institutionId, departmentId: dept.id, staffName: hod },
      });
      if (existingHead) {
        await prisma.departmentHead.update({
          where: { id: existingHead.id },
          data: { isActive: true, appointedBy: actorEmail },
        });
      } else {
        await prisma.departmentHead.create({
          data: {
            institutionId,
            departmentId: dept.id,
            staffName: hod,
            isActive: true,
            appointedBy: actorEmail,
          },
        });
      }
      headCount += 1;
    }

    for (const staff of staffMembers) {
      await prisma.departmentStaffMapping.upsert({
        where: {
          institutionId_departmentId_staffName_mappingType: {
            institutionId,
            departmentId: dept.id,
            staffName: staff,
            mappingType: staff === hod ? 'PRIMARY' : 'SECONDARY',
          },
        },
        create: {
          institutionId,
          departmentId: dept.id,
          staffName: staff,
          mappingType: staff === hod ? 'PRIMARY' : 'SECONDARY',
        },
        update: { isActive: true },
      });
      staffCount += 1;
    }

    if (location) {
      const existingLoc = await prisma.departmentLocation.findFirst({
        where: { institutionId, departmentId: dept.id, isPrimary: true },
      });
      if (existingLoc) {
        await prisma.departmentLocation.update({
          where: { id: existingLoc.id },
          data: { building: location, roomLabel: location },
        });
      } else {
        await prisma.departmentLocation.create({
          data: {
            institutionId,
            departmentId: dept.id,
            building: location,
            roomLabel: location,
            isPrimary: true,
          },
        });
      }
      locationCount += 1;
    }

    if (config.deptSettings.enableBudget.toLowerCase() !== 'no') {
      await prisma.departmentBudget.upsert({
        where: {
          institutionId_departmentId_fiscalYear: {
            institutionId,
            departmentId: dept.id,
            fiscalYear,
          },
        },
        create: {
          institutionId,
          departmentId: dept.id,
          fiscalYear,
          currency: config.deptSettings.currency,
          allocated: budget,
        },
        update: {
          currency: config.deptSettings.currency,
          allocated: budget,
        },
      });
      budgetCount += 1;
    }
  }

  await prisma.importantDate.deleteMany({ where: { institutionId } });
  const importantDefs = [
    { title: 'Admission Start', date: config.session.admissionStart, category: 'ADMISSION', priority: 'HIGH' },
    { title: 'Admission End', date: config.session.admissionEnd, category: 'ADMISSION', priority: 'HIGH' },
    { title: 'Result Declaration', date: config.session.resultDate, category: 'ACADEMIC', priority: 'HIGH' },
    { title: 'Registration Cutoff', date: config.session.registrationCutoff, category: 'EXAM', priority: 'HIGH' },
    { title: 'Marks Entry Deadline', date: config.session.marksEntryDeadline, category: 'EXAM', priority: 'NORMAL' },
  ];
  let importantCount = 0;
  for (const item of importantDefs) {
    const d = parseDateOnly(item.date);
    if (!d) continue;
    await prisma.importantDate.create({
      data: {
        institutionId,
        title: item.title,
        eventDate: d,
        category: item.category,
        priority: item.priority,
      },
    });
    importantCount += 1;
  }

  let holidayCount = 0;
  for (const line of config.session.holidaysList.split('\n')) {
    const parsed = parseDateRangeLine(line);
    if (!parsed) continue;
    await prisma.holiday.upsert({
      where: {
        institutionId_date_name: {
          institutionId,
          date: parsed.start,
          name: parsed.title,
        },
      },
      create: {
        institutionId,
        date: parsed.start,
        name: parsed.title,
        type: HolidayType.INSTITUTIONAL,
        applicableTo: HolidayAudience.ALL,
      },
      update: {},
    });
    holidayCount += 1;
  }

  let examCount = 0;
  await prisma.examSchedule.deleteMany({
    where: { institutionId, recordId: { startsWith: 'setup_' } },
  });
  for (const parsed of parseEventLines(config.session.examPeriods)) {
    const recordId = `setup_${slugCode(parsed.title)}`;
    await prisma.examSchedule.create({
      data: {
        institutionId,
        recordId,
        academicYear: fiscalYear,
        examType: ExamTypeFilter.UNIT_TEST,
        name: parsed.title,
        classRange: 'All Classes',
        startDate: parsed.start,
        endDate: parsed.end || parsed.start,
      },
    });
    examCount += 1;
  }

  await prisma.academicCalendarEntry.deleteMany({ where: { institutionId } });
  let academicCalCount = 0;
  for (const parsed of parseEventLines(config.calendar.academicEvents)) {
    await prisma.academicCalendarEntry.create({
      data: {
        institutionId,
        title: parsed.title,
        startDate: parsed.start,
        endDate: parsed.end,
        academicYear: fiscalYear,
        description: parsed.extra || '',
      },
    });
    academicCalCount += 1;
  }

  await prisma.eventCalendarEntry.deleteMany({ where: { institutionId } });
  let eventCalCount = 0;
  for (const parsed of parseEventLines(config.calendar.eventCalendar)) {
    await prisma.eventCalendarEntry.create({
      data: {
        institutionId,
        title: parsed.title,
        startDate: parsed.start,
        endDate: parsed.end,
        audience: parsed.extra || 'ALL',
        description: '',
      },
    });
    eventCalCount += 1;
  }

  await prisma.opsCustomEvent.deleteMany({ where: { institutionId } });
  let customCount = 0;
  for (const parsed of parseEventLines(config.calendar.customEvents)) {
    const deptCode = parsed.extra?.split('|')[0]?.trim() || '';
    const invitees = parsed.extra?.includes('|')
      ? parsed.extra.split('|').slice(1).join('|').split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    await prisma.opsCustomEvent.create({
      data: {
        institutionId,
        title: parsed.title,
        startDate: parsed.start,
        endDate: parsed.end,
        departmentCode: deptCode,
        invitees: invitees as Prisma.InputJsonValue,
        createdBy: actorEmail,
      },
    });
    customCount += 1;
  }

  for (const evt of config.calendarEvents) {
    const cat = (evt.category || '').toUpperCase();
    const start = parseDateOnly(evt.date || '');
    if (!start) continue;
    const end = evt.endDate ? parseDateOnly(evt.endDate) : null;
    if (cat === 'ACADEMIC') {
      await prisma.academicCalendarEntry.create({
        data: { institutionId, title: evt.title || 'Event', startDate: start, endDate: end, academicYear: fiscalYear },
      });
      academicCalCount += 1;
    } else if (cat === 'EVENTS' || cat === 'EVENT') {
      await prisma.eventCalendarEntry.create({
        data: { institutionId, title: evt.title || 'Event', startDate: start, endDate: end },
      });
      eventCalCount += 1;
    } else if (cat === 'CUSTOM') {
      await prisma.opsCustomEvent.create({
        data: { institutionId, title: evt.title || 'Event', startDate: start, endDate: end, createdBy: actorEmail },
      });
      customCount += 1;
    }
  }

  // Departments removed from Institution Setup → soft-delete from HR directory / ops
  if (syncedCodes.size > 0) {
    const activeOps = await prisma.opsDepartment.findMany({
      where: { institutionId, isActive: true },
    });
    const staleOps = activeOps.filter((op) => !syncedCodes.has(op.departmentCode.toUpperCase()));
    for (const op of staleOps) {
      await prisma.opsDepartment.update({
        where: { id: op.id },
        data: { isActive: false },
      });
      if (op.hrDepartmentId) {
        await prisma.hrDepartment.updateMany({
          where: { id: op.hrDepartmentId, institutionId, NOT: { status: 'DELETED' } },
          data: { status: 'DELETED' },
        });
      } else {
        await prisma.hrDepartment.updateMany({
          where: {
            institutionId,
            code: { equals: op.departmentCode, mode: 'insensitive' },
            NOT: { status: 'DELETED' },
          },
          data: { status: 'DELETED' },
        });
      }
    }
  }

  await logUserActivity(institutionId, {
    userId: 'system',
    userEmail: actorEmail,
    action: 'DEPARTMENT_OPS_SYNC',
    module: 'Department & Operations',
    details: JSON.stringify({ deptCount, headCount, staffCount, importantCount, holidayCount, examCount }),
  });

  return {
    synced: true,
    departments: deptCount,
    heads: headCount,
    staff: staffCount,
    locations: locationCount,
    budgets: budgetCount,
    importantDates: importantCount,
    holidays: holidayCount,
    examSchedules: examCount,
    academicCalendar: academicCalCount,
    eventCalendar: eventCalCount,
    customEvents: customCount,
  };
}

export async function onDepartmentOpsTileSaved(institutionId: string, tileKey: string) {
  if (!DEPT_TILE_KEYS.includes(tileKey as typeof DEPT_TILE_KEYS[number])) return null;
  return syncDepartmentOpsFromSetup(institutionId);
}

export async function bootstrapDepartmentOps(institutionId: string) {
  const deptCount = await prisma.opsDepartment.count({ where: { institutionId } });
  if (deptCount === 0) {
    await syncDepartmentOpsFromSetup(institutionId);
  }
}

export async function getDepartmentOpsOverview(institutionId: string) {
  const year = new Date().getFullYear();
  const [
    departments,
    heads,
    staff,
    locations,
    budgets,
    importantDates,
    holidays,
    academicCalendar,
    eventCalendar,
    examSchedules,
    customEvents,
    comprehensive,
  ] = await Promise.all([
    prisma.opsDepartment.findMany({ where: { institutionId, isActive: true }, orderBy: { departmentName: 'asc' } }),
    prisma.departmentHead.findMany({
      where: { institutionId, isActive: true },
      include: { department: { select: { departmentName: true, departmentCode: true } } },
      orderBy: { appointedAt: 'desc' },
    }),
    prisma.departmentStaffMapping.findMany({
      where: { institutionId, isActive: true },
      include: { department: { select: { departmentName: true } } },
      orderBy: { assignedAt: 'desc' },
    }),
    prisma.departmentLocation.findMany({
      where: { institutionId },
      include: { department: { select: { departmentName: true } } },
    }),
    prisma.departmentBudget.findMany({
      where: { institutionId, isActive: true },
      include: { department: { select: { departmentName: true, departmentCode: true } } },
    }),
    prisma.importantDate.findMany({ where: { institutionId, isActive: true }, orderBy: { eventDate: 'asc' } }),
    prisma.holiday.findMany({ where: { institutionId }, orderBy: { date: 'asc' }, take: 500 }),
    prisma.academicCalendarEntry.findMany({ where: { institutionId }, orderBy: { startDate: 'asc' } }),
    prisma.eventCalendarEntry.findMany({ where: { institutionId }, orderBy: { startDate: 'asc' } }),
    prisma.examSchedule.findMany({ where: { institutionId }, orderBy: { startDate: 'asc' }, take: 200 }),
    prisma.opsCustomEvent.findMany({ where: { institutionId }, orderBy: { startDate: 'asc' } }),
    getMergedCalendarEvents(institutionId, year),
  ]);

  return {
    stats: {
      departments: departments.length,
      heads: heads.length,
      staff: staff.length,
      locations: locations.length,
      budgets: budgets.length,
      importantDates: importantDates.length,
      holidays: holidays.length,
      academicCalendar: academicCalendar.length,
      eventCalendar: eventCalendar.length,
      examSchedules: examSchedules.length,
      customEvents: customEvents.length,
      comprehensiveEvents: comprehensive.length,
    },
    departments: departments.map((d) => ({
      id: d.id,
      departmentCode: d.departmentCode,
      departmentName: d.departmentName,
      isActive: d.isActive,
      hrLinked: Boolean(d.hrDepartmentId),
    })),
    heads: heads.map((h) => ({
      id: h.id,
      department: h.department.departmentName,
      departmentCode: h.department.departmentCode,
      staffName: h.staffName,
      tenureStart: h.tenureStart?.toISOString().slice(0, 10) ?? '—',
      tenureEnd: h.tenureEnd?.toISOString().slice(0, 10) ?? '—',
      isActive: h.isActive,
    })),
    staff: staff.map((s) => ({
      id: s.id,
      department: s.department.departmentName,
      staffName: s.staffName,
      mappingType: s.mappingType,
    })),
    locations: locations.map((l) => ({
      id: l.id,
      department: l.department.departmentName,
      building: l.building,
      floor: l.floor,
      roomLabel: l.roomLabel,
      campus: l.campus,
    })),
    budgets: budgets.map((b) => ({
      id: b.id,
      department: b.department.departmentName,
      departmentCode: b.department.departmentCode,
      fiscalYear: b.fiscalYear,
      currency: b.currency,
      allocated: b.allocated,
      spent: b.spent,
      remaining: b.allocated - b.spent,
    })),
    importantDates: importantDates.map((d) => ({
      id: d.id,
      title: d.title,
      eventDate: d.eventDate.toISOString().slice(0, 10),
      endDate: d.endDate?.toISOString().slice(0, 10) ?? '—',
      priority: d.priority,
      category: d.category,
    })),
    holidays: holidays.map((h) => ({
      id: h.id,
      name: h.name,
      date: h.date.toISOString().slice(0, 10),
      type: h.type,
      applicableTo: h.applicableTo,
    })),
    academicCalendar: academicCalendar.map((a) => ({
      id: a.id,
      title: a.title,
      startDate: a.startDate.toISOString().slice(0, 10),
      endDate: a.endDate?.toISOString().slice(0, 10) ?? '—',
      academicYear: a.academicYear,
      isPublished: a.isPublished,
    })),
    eventCalendar: eventCalendar.map((e) => ({
      id: e.id,
      title: e.title,
      startDate: e.startDate.toISOString().slice(0, 10),
      endDate: e.endDate?.toISOString().slice(0, 10) ?? '—',
      audience: e.audience,
      location: e.location,
    })),
    examSchedules: examSchedules.map((e) => ({
      id: e.id,
      name: e.name,
      examType: e.examType,
      classRange: e.classRange,
      startDate: e.startDate.toISOString().slice(0, 10),
      endDate: e.endDate.toISOString().slice(0, 10),
      academicYear: e.academicYear,
    })),
    customEvents: customEvents.map((c) => ({
      id: c.id,
      title: c.title,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate?.toISOString() ?? '—',
      departmentCode: c.departmentCode,
      invitees: c.invitees,
    })),
    comprehensiveCalendar: comprehensive,
  };
}

export async function exportHolidayCalendarIcal(institutionId: string, audience?: string) {
  const holidays = await prisma.holiday.findMany({
    where: {
      institutionId,
      ...(audience && audience !== 'ALL'
        ? { applicableTo: audience as HolidayAudience }
        : {}),
    },
    orderBy: { date: 'asc' },
  });

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//360SchoolERP//Holiday Calendar//EN',
    'CALSCALE:GREGORIAN',
  ];

  for (const h of holidays) {
    const d = h.date.toISOString().slice(0, 10).replace(/-/g, '');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:holiday-${h.id}@360schoolerp`);
    lines.push(`DTSTART;VALUE=DATE:${d}`);
    lines.push(`SUMMARY:${h.name}`);
    lines.push(`DESCRIPTION:${h.type} · ${h.applicableTo}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function validateDepartmentBudget(
  allocated: number,
  spent: number,
  requestAmount: number,
): { allowed: boolean; remaining: number } {
  const remaining = allocated - spent;
  return { allowed: requestAmount <= remaining, remaining };
}
