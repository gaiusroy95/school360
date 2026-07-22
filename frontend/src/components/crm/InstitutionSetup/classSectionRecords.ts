import type { RecordColumn } from './masterListExcel';

export type NormalizedClassSection = {
  className: string;
  sectionName: string;
  capacity: string;
  room: string;
  classTeacher: string;
  classTeacherId: string;
  classTeacherPhone: string;
  classTeacherEmail: string;
};

export type StaffMember = {
  id: string;
  name: string;
  department: string;
  phone: string;
  email: string;
  source: string;
};

const FIELD_ALIASES: Record<keyof NormalizedClassSection, string[]> = {
  className: ['classname', 'class', 'class name', 'grade', 'standard', 'std'],
  sectionName: ['sectionname', 'section', 'section name', 'div', 'division'],
  capacity: ['capacity', 'seats', 'maxstudents', 'strength', 'max capacity'],
  room: ['room', 'roommapping', 'room mapping', 'room no', 'classroom', 'class room'],
  classTeacher: ['classteacher', 'class teacher', 'teacher', 'assigned teacher', 'teacher name'],
  classTeacherId: ['classteacherid', 'teacherid', 'teacher id', 'employee id', 'staff id', 'emp id'],
  classTeacherPhone: ['classteacherphone', 'teacherphone', 'teacher mobile', 'teacher phone', 'staff phone'],
  classTeacherEmail: ['classteacheremail', 'teacheremail', 'teacher email', 'staff email'],
};

function normKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function pickByAliases(row: Record<string, string>, aliases: string[]): string {
  const aliasSet = new Set(aliases.map(normKey));
  for (const [key, raw] of Object.entries(row)) {
    if (aliasSet.has(normKey(key))) {
      return String(raw ?? '').trim();
    }
  }
  return '';
}

function pickByColumnLabel(
  row: Record<string, string>,
  columns: RecordColumn[] | undefined,
  labelHints: string[],
): string {
  if (!columns?.length) return '';
  const hints = labelHints.map(normKey);
  for (const col of columns) {
    const labelNorm = normKey(col.label);
    if (hints.some((h) => labelNorm.includes(h) || h.includes(labelNorm))) {
      return String(row[col.key] ?? '').trim();
    }
  }
  return '';
}

/** Resolve one class–section row regardless of Excel/header key naming. */
export function normalizeClassSectionRow(
  row: Record<string, string>,
  columns?: RecordColumn[],
): NormalizedClassSection {
  const className =
    pickByAliases(row, FIELD_ALIASES.className) ||
    pickByColumnLabel(row, columns, ['class', 'grade', 'standard']) ||
    '';
  const sectionName =
    pickByAliases(row, FIELD_ALIASES.sectionName) ||
    pickByColumnLabel(row, columns, ['section', 'division']) ||
    '';

  // Last resort: first two non-teacher columns from master list headers
  let fallbackClass = '';
  let fallbackSection = '';
  if (columns?.length && (!className || !sectionName)) {
    const dataCols = columns.filter((c) => {
      const n = normKey(c.label);
      return !n.includes('teacher') && !n.includes('capacity') && !n.includes('room');
    });
    if (!className && dataCols[0]) fallbackClass = String(row[dataCols[0].key] ?? '').trim();
    if (!sectionName && dataCols[1]) fallbackSection = String(row[dataCols[1].key] ?? '').trim();
  }

  return {
    className: className || fallbackClass,
    sectionName: sectionName || fallbackSection,
    capacity:
      pickByAliases(row, FIELD_ALIASES.capacity) ||
      pickByColumnLabel(row, columns, ['capacity', 'seats', 'strength']) ||
      '',
    room:
      pickByAliases(row, FIELD_ALIASES.room) ||
      pickByColumnLabel(row, columns, ['room']) ||
      '',
    classTeacher:
      pickByAliases(row, FIELD_ALIASES.classTeacher) ||
      pickByColumnLabel(row, columns, ['teacher']) ||
      '',
    classTeacherId:
      pickByAliases(row, FIELD_ALIASES.classTeacherId) ||
      pickByColumnLabel(row, columns, ['employee', 'staff id']) ||
      '',
    classTeacherPhone:
      pickByAliases(row, FIELD_ALIASES.classTeacherPhone) ||
      pickByColumnLabel(row, columns, ['phone', 'mobile']) ||
      '',
    classTeacherEmail:
      pickByAliases(row, FIELD_ALIASES.classTeacherEmail) ||
      pickByColumnLabel(row, columns, ['email']) ||
      '',
  };
}

export function normalizeClassSectionRecords(
  records: Record<string, string>[],
  columns?: RecordColumn[],
): Record<string, string>[] {
  return records.map((row) => {
    const n = normalizeClassSectionRow(row, columns);
    return {
      className: n.className,
      sectionName: n.sectionName,
      capacity: n.capacity,
      room: n.room,
      classTeacher: n.classTeacher,
      classTeacherId: n.classTeacherId,
      classTeacherPhone: n.classTeacherPhone,
      classTeacherEmail: n.classTeacherEmail,
    };
  });
}

export function formatClassSectionLabel(row: NormalizedClassSection): string {
  const cls = row.className || 'Unnamed class';
  const sec = row.sectionName ? ` — Section ${row.sectionName}` : '';
  return `${cls}${sec}`;
}

export function buildStaffRoster(input: {
  teacherPoolRaw?: string;
  departmentRecords?: Record<string, string>[];
  classRecords?: Record<string, string>[];
  columns?: RecordColumn[];
}): StaffMember[] {
  const byId = new Map<string, StaffMember>();

  const add = (member: Omit<StaffMember, 'id'> & { id?: string }) => {
    const name = member.name.trim();
    if (!name) return;
    const id = member.id?.trim() || `staff_${normKey(name)}`;
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, { ...member, id, name });
      return;
    }
    byId.set(id, {
      ...existing,
      department: existing.department || member.department,
      phone: existing.phone || member.phone,
      email: existing.email || member.email,
    });
  };

  if (input.teacherPoolRaw) {
    const lines = input.teacherPoolRaw.split(/\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (line.includes('|')) {
        const [name, department, phone, email] = line.split('|').map((p) => p.trim());
        if (name) {
          add({
            name,
            department: department || 'Teaching Staff',
            phone: phone || '',
            email: email || '',
            source: 'Staff directory',
          });
        }
        continue;
      }
      for (const part of line.split(/[,;]/)) {
        const name = part.trim();
        if (name) {
          add({ name, department: 'Teaching Staff', phone: '', email: '', source: 'Staff directory' });
        }
      }
    }
  }

  for (const row of input.departmentRecords || []) {
    const hod = (row.hod || '').trim();
    if (hod) {
      add({
        name: hod,
        department: row.departmentName || row.department || 'Department HOD',
        phone: '',
        email: '',
        source: 'Department HOD',
      });
    }
  }

  for (const row of input.classRecords || []) {
    const n = normalizeClassSectionRow(row, input.columns);
    if (n.classTeacher) {
      add({
        id: n.classTeacherId || undefined,
        name: n.classTeacher,
        department: 'Class Teacher',
        phone: n.classTeacherPhone,
        email: n.classTeacherEmail,
        source: 'Already assigned',
      });
    }
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function applyStaffToRow(
  row: Record<string, string>,
  staff: StaffMember | null,
): Record<string, string> {
  const next = { ...row };
  if (!staff) {
    next.classTeacher = '';
    next.classTeacherId = '';
    next.classTeacherPhone = '';
    next.classTeacherEmail = '';
    return next;
  }
  next.classTeacher = staff.name;
  next.classTeacherId = staff.id.startsWith('staff_') ? '' : staff.id;
  next.classTeacherPhone = staff.phone;
  next.classTeacherEmail = staff.email;
  return next;
}
