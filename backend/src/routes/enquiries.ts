import { Router } from 'express';
import { z } from 'zod';
import { EnquiryActivityType, EnquiryStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';

export const enquiriesRouter = Router();
enquiriesRouter.use(requireAuth);

const STATUS_UI_TO_DB: Record<string, EnquiryStatus> = {
  New: EnquiryStatus.NEW,
  'In Process': EnquiryStatus.IN_PROCESS,
  'Follow Up': EnquiryStatus.FOLLOW_UP,
  Converted: EnquiryStatus.CONVERTED,
  'Not Interested': EnquiryStatus.NOT_INTERESTED,
  NEW: EnquiryStatus.NEW,
  IN_PROCESS: EnquiryStatus.IN_PROCESS,
  FOLLOW_UP: EnquiryStatus.FOLLOW_UP,
  CONVERTED: EnquiryStatus.CONVERTED,
  NOT_INTERESTED: EnquiryStatus.NOT_INTERESTED,
};

const STATUS_DB_TO_UI: Record<EnquiryStatus, string> = {
  NEW: 'New',
  IN_PROCESS: 'In Process',
  FOLLOW_UP: 'Follow Up',
  CONVERTED: 'Converted',
  NOT_INTERESTED: 'Not Interested',
};

function toStatus(value?: string | null): EnquiryStatus {
  if (!value) return EnquiryStatus.NEW;
  const key = String(value).trim();
  return STATUS_UI_TO_DB[key] || STATUS_UI_TO_DB[key.toUpperCase().replace(/\s+/g, '_')] || EnquiryStatus.NEW;
}

function parseOptionalDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = String(value).trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function serializeEnquiry(e: {
  id: string;
  enquiryId: string;
  enquiryDate: Date;
  enquirerName: string;
  mobile: string;
  email: string;
  classInterested: string;
  source: string;
  status: EnquiryStatus;
  assignedTo: string;
  nextFollowUp: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: e.id,
    enquiryId: e.enquiryId,
    enquiryDate: e.enquiryDate.toISOString(),
    enquirerName: e.enquirerName,
    mobile: e.mobile,
    email: e.email,
    classInterested: e.classInterested,
    source: e.source,
    status: STATUS_DB_TO_UI[e.status],
    assignedTo: e.assignedTo,
    nextFollowUp: e.nextFollowUp ? e.nextFollowUp.toISOString().slice(0, 10) : '',
    notes: e.notes || '',
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

async function nextEnquiryCode(institutionId: string) {
  const count = await prisma.enquiry.count({ where: { institutionId } });
  const n = count + 1;
  return `ENQ${String(89000 + n).padStart(5, '0')}`;
}

function parseDueDateTime(dateStr: string, timeStr?: string | null): Date | null {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return parseOptionalDate(dateStr);
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (timeStr && /^\d{1,2}:\d{2}/.test(timeStr)) {
    const [h, min] = timeStr.split(':').map(Number);
    return new Date(y, mo, d, h, min, 0, 0);
  }
  return new Date(y, mo, d, 0, 0, 0, 0);
}

type FollowUpModeKey =
  | 'PHONE'
  | 'CAMPUS_VISIT'
  | 'VIDEO_CALL'
  | 'EMAIL'
  | 'IN_PERSON_COUNSELLING';

const FOLLOW_UP_MODE_UI_TO_DB: Record<string, FollowUpModeKey> = {
  Phone: 'PHONE',
  'Campus Visit': 'CAMPUS_VISIT',
  'Video Call': 'VIDEO_CALL',
  Email: 'EMAIL',
  'In-person Counselling': 'IN_PERSON_COUNSELLING',
  PHONE: 'PHONE',
  CAMPUS_VISIT: 'CAMPUS_VISIT',
  VIDEO_CALL: 'VIDEO_CALL',
  EMAIL: 'EMAIL',
  IN_PERSON_COUNSELLING: 'IN_PERSON_COUNSELLING',
};

const FOLLOW_UP_MODE_DB_TO_UI: Record<FollowUpModeKey, string> = {
  PHONE: 'Phone',
  CAMPUS_VISIT: 'Campus Visit',
  VIDEO_CALL: 'Video Call',
  EMAIL: 'Email',
  IN_PERSON_COUNSELLING: 'In-person Counselling',
};

function toFollowUpMode(value?: string | null): FollowUpModeKey {
  if (!value) return 'PHONE';
  const key = String(value).trim();
  return FOLLOW_UP_MODE_UI_TO_DB[key] || 'PHONE';
}

function serializeTask(t: {
  id: string;
  enquiryId: string;
  title: string;
  mode?: FollowUpModeKey | string | null;
  subject?: string | null;
  discussionNotes?: string | null;
  assignedTo: string;
  dueDate: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  enquiry: { enquiryId: string; enquirerName: string };
}) {
  const modeKey = (t.mode || 'PHONE') as FollowUpModeKey;
  const modeUi = FOLLOW_UP_MODE_DB_TO_UI[modeKey] || 'Phone';
  const pad = (n: number) => String(n).padStart(2, '0');
  const dueTime = `${pad(t.dueDate.getHours())}:${pad(t.dueDate.getMinutes())}`;
  const hasTime = t.dueDate.getHours() !== 0 || t.dueDate.getMinutes() !== 0;
  return {
    id: t.id,
    enquiryId: t.enquiry.enquiryId,
    enquiryDbId: t.enquiryId,
    enquiryName: t.enquiry.enquirerName,
    title: t.title,
    mode: modeUi,
    modeKey,
    subject: t.subject || '',
    discussionNotes: t.discussionNotes || '',
    assignedTo: t.assignedTo,
    dueDate: t.dueDate.toISOString().slice(0, 10),
    dueTime: hasTime ? dueTime : '',
    scheduledAt: t.dueDate.toISOString(),
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

async function logActivity(
  enquiryId: string,
  type: EnquiryActivityType,
  description: string,
  performedBy = 'System',
) {
  await prisma.enquiryActivity.create({
    data: { enquiryId, type, description, performedBy },
  });
}

const enquiryBodySchema = z.object({
  enquirerName: z.string().min(1),
  mobile: z.string().min(5),
  email: z.string().optional().nullable(),
  classInterested: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  nextFollowUp: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  enquiryDate: z.string().optional().nullable(),
  enquiryId: z.string().optional().nullable(),
});

enquiriesRouter.get('/', async (req, res) => {
  const institutionId = await getDefaultInstitutionId();
  const status = req.query.status ? String(req.query.status) : undefined;
  const source = req.query.source ? String(req.query.source) : undefined;
  const classInterested = req.query.classInterested ? String(req.query.classInterested) : undefined;
  const q = req.query.q ? String(req.query.q).trim().toLowerCase() : undefined;

  const where: Prisma.EnquiryWhereInput = { institutionId };
  if (status && status !== 'All') where.status = toStatus(status);
  if (source && source !== 'All') where.source = source;
  if (classInterested && classInterested !== 'All') where.classInterested = classInterested;
  if (q) {
    where.OR = [
      { enquirerName: { contains: q, mode: 'insensitive' } },
      { enquiryId: { contains: q, mode: 'insensitive' } },
      { mobile: { contains: q } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }

  const enquiries = await prisma.enquiry.findMany({
    where,
    orderBy: { enquiryDate: 'desc' },
  });

  return res.json({ enquiries: enquiries.map(serializeEnquiry) });
});

enquiriesRouter.get('/meta', async (_req, res) => {
  const institutionId = await getDefaultInstitutionId();
  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const classesTile = (setup?.classesSections || {}) as {
    records?: Array<Record<string, string>>;
    recordColumns?: Array<{ key: string; label: string }>;
  };
  const classKeyHint =
    classesTile.recordColumns?.find((c) => /class/i.test(c.key) || /class/i.test(c.label))?.key ||
    'className';
  const classNames = [
    ...new Set(
      (classesTile.records || [])
        .map((r) => (r[classKeyHint] || r.className || r.class || r.Class || '').trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const sources = [
    'Website',
    'Walk-in',
    'Phone Call',
    'Facebook',
    'Meta Ads',
    'Google Ads',
    'Referral',
    'Others',
  ];
  const statuses = ['New', 'In Process', 'Follow Up', 'Converted', 'Not Interested'];

  return res.json({
    // Prefer configured Classes & Sections master list; fallback only if empty
    classes: classNames,
    sources,
    statuses,
    classesFromSetup: classNames.length > 0,
  });
});

enquiriesRouter.get('/analytics', async (_req, res) => {
  const institutionId = await getDefaultInstitutionId();
  const enquiries = await prisma.enquiry.findMany({
    where: { institutionId },
    orderBy: { enquiryDate: 'asc' },
  });

  const total = enquiries.length;
  const byStatus = {
    New: enquiries.filter((e) => e.status === EnquiryStatus.NEW).length,
    'In Process': enquiries.filter((e) => e.status === EnquiryStatus.IN_PROCESS).length,
    'Follow Up': enquiries.filter((e) => e.status === EnquiryStatus.FOLLOW_UP).length,
    Converted: enquiries.filter((e) => e.status === EnquiryStatus.CONVERTED).length,
    'Not Interested': enquiries.filter((e) => e.status === EnquiryStatus.NOT_INTERESTED).length,
  };
  const conversionRate = total ? Number(((byStatus.Converted / total) * 100).toFixed(2)) : 0;

  const sourceMap = new Map<string, number>();
  const classMap = new Map<string, number>();
  for (const e of enquiries) {
    sourceMap.set(e.source || 'Others', (sourceMap.get(e.source || 'Others') || 0) + 1);
    classMap.set(e.classInterested || 'Unspecified', (classMap.get(e.classInterested || 'Unspecified') || 0) + 1);
  }

  const bySource = [...sourceMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const byClass = [...classMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Last 30 days overview
  const now = new Date();
  const dayCounts = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dayCounts.set(d.toISOString().slice(0, 10), 0);
  }
  for (const e of enquiries) {
    const key = e.enquiryDate.toISOString().slice(0, 10);
    if (dayCounts.has(key)) dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
  }
  const overview = [...dayCounts.entries()].map(([date, value]) => ({
    date: date.slice(5),
    value,
  }));

  const funnel = [
    { name: 'New Enquiries', value: total },
    { name: 'Contacted', value: Math.max(0, total - byStatus.New) },
    { name: 'Follow Up', value: byStatus['Follow Up'] + byStatus.Converted },
    { name: 'Application', value: byStatus.Converted },
    { name: 'Converted', value: byStatus.Converted },
  ];

  const topSources = bySource.slice(0, 6).map((s) => ({
    name: s.name,
    val: s.value,
    pct: total ? Number(((s.value / total) * 100).toFixed(1)) : 0,
  }));

  return res.json({
    kpis: {
      total,
      new: byStatus.New,
      inProcess: byStatus['In Process'],
      followUp: byStatus['Follow Up'],
      converted: byStatus.Converted,
      notInterested: byStatus['Not Interested'],
      conversionRate,
    },
    overview,
    bySource,
    byClass,
    funnel,
    topSources,
    conversionTrend: overview.map((o) => ({
      date: o.date,
      enquiries: o.value,
      applications: Math.round(o.value * 0.3),
      admissions: Math.round(o.value * 0.2),
    })),
  });
});

enquiriesRouter.get('/activities', async (req, res) => {
  const institutionId = await getDefaultInstitutionId();
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const activities = await prisma.enquiryActivity.findMany({
    where: { enquiry: { institutionId } },
    include: { enquiry: { select: { enquiryId: true, enquirerName: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return res.json({
    activities: activities.map((a) => ({
      id: a.id,
      enquiryId: a.enquiry.enquiryId,
      enquiryName: a.enquiry.enquirerName,
      type:
        a.type === 'STATUS_CHANGE'
          ? 'Status Change'
          : a.type === 'CALL'
            ? 'Call'
            : a.type === 'EMAIL'
              ? 'Email'
              : a.type === 'MEETING'
                ? 'Visit'
                : a.type === 'SYSTEM'
                  ? 'System'
                  : 'System',
      description: a.description,
      performedBy: a.performedBy,
      timestamp: a.createdAt.toISOString(),
    })),
  });
});

enquiriesRouter.get('/tasks', async (req, res) => {
  const institutionId = await getDefaultInstitutionId();
  const status = req.query.status ? String(req.query.status) : undefined;
  const mode = req.query.mode ? String(req.query.mode) : undefined;
  const tasks = await prisma.followUpTask.findMany({
    where: {
      enquiry: { institutionId },
      ...(status ? { status } : {}),
      ...(mode ? { mode: toFollowUpMode(mode) } : {}),
    },
    include: { enquiry: { select: { enquiryId: true, enquirerName: true } } },
    orderBy: { dueDate: 'asc' },
  });
  return res.json({
    tasks: tasks.map(serializeTask),
  });
});

enquiriesRouter.get('/tasks/meta', async (_req, res) => {
  const institutionId = await getDefaultInstitutionId();
  const enquiries = await prisma.enquiry.findMany({
    where: { institutionId },
    select: { id: true, enquiryId: true, enquirerName: true, assignedTo: true, classInterested: true },
    orderBy: { enquirerName: 'asc' },
  });
  const assignees = await prisma.enquiry.findMany({
    where: { institutionId, assignedTo: { not: '' } },
    select: { assignedTo: true },
    distinct: ['assignedTo'],
    orderBy: { assignedTo: 'asc' },
  });
  return res.json({
    modes: Object.values(FOLLOW_UP_MODE_DB_TO_UI),
    modeKeys: Object.keys(FOLLOW_UP_MODE_DB_TO_UI),
    enquiries: enquiries.map((e) => ({
      id: e.id,
      enquiryId: e.enquiryId,
      enquirerName: e.enquirerName,
      assignedTo: e.assignedTo,
      classInterested: e.classInterested,
    })),
    counselors: assignees.map((a) => a.assignedTo).filter(Boolean),
  });
});

enquiriesRouter.patch('/tasks/:taskId', async (req, res) => {
  const institutionId = await getDefaultInstitutionId();
  const schema = z.object({
    title: z.string().min(1).optional(),
    mode: z.string().optional(),
    subject: z.string().optional(),
    discussionNotes: z.string().optional().nullable(),
    dueDate: z.string().optional(),
    dueTime: z.string().optional().nullable(),
    assignedTo: z.string().optional(),
    status: z.enum(['Pending', 'Completed']).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.followUpTask.findFirst({
    where: { id: req.params.taskId, enquiry: { institutionId } },
    include: { enquiry: { select: { enquiryId: true, enquirerName: true } } },
  });
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  let dueDate = existing.dueDate;
  if (parsed.data.dueDate) {
    const next = parseDueDateTime(parsed.data.dueDate, parsed.data.dueTime);
    if (!next) return res.status(400).json({ error: 'Invalid dueDate' });
    dueDate = next;
  } else if (parsed.data.dueTime) {
    const dateStr = existing.dueDate.toISOString().slice(0, 10);
    const next = parseDueDateTime(dateStr, parsed.data.dueTime);
    if (next) dueDate = next;
  }

  const task = await prisma.followUpTask.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.mode !== undefined ? { mode: toFollowUpMode(parsed.data.mode) } : {}),
      ...(parsed.data.subject !== undefined ? { subject: parsed.data.subject } : {}),
      ...(parsed.data.discussionNotes !== undefined
        ? { discussionNotes: parsed.data.discussionNotes || null }
        : {}),
      ...(parsed.data.assignedTo !== undefined ? { assignedTo: parsed.data.assignedTo } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      dueDate,
    } as Prisma.FollowUpTaskUncheckedUpdateInput,
    include: { enquiry: { select: { enquiryId: true, enquirerName: true } } },
  });

  if (parsed.data.status === 'Completed' && existing.status !== 'Completed') {
    await logActivity(
      existing.enquiryId,
      EnquiryActivityType.SYSTEM,
      `Follow-up completed: ${task.title}`,
      task.assignedTo || 'Admin',
    );
  } else if (
    parsed.data.title ||
    parsed.data.mode ||
    parsed.data.subject ||
    parsed.data.dueDate ||
    parsed.data.assignedTo
  ) {
    await logActivity(
      existing.enquiryId,
      EnquiryActivityType.SYSTEM,
      `Follow-up updated: ${task.title}`,
      task.assignedTo || 'Admin',
    );
  }

  if (task.status === 'Pending') {
    await prisma.enquiry.update({
      where: { id: existing.enquiryId },
      data: { nextFollowUp: dueDate },
    });
  }

  return res.json({ task: serializeTask(task) });
});

enquiriesRouter.delete('/tasks/:taskId', async (req, res) => {
  const institutionId = await getDefaultInstitutionId();
  const existing = await prisma.followUpTask.findFirst({
    where: { id: req.params.taskId, enquiry: { institutionId } },
  });
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  await prisma.followUpTask.delete({ where: { id: existing.id } });
  return res.json({ ok: true });
});

enquiriesRouter.post('/', async (req, res) => {
  const parsed = enquiryBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const institutionId = await getDefaultInstitutionId();
  const data = parsed.data;
  const enquiryId = data.enquiryId?.trim() || (await nextEnquiryCode(institutionId));
  const performedBy = data.assignedTo || 'Admin';

  const enquiry = await prisma.enquiry.create({
    data: {
      institutionId,
      enquiryId,
      enquiryDate: parseOptionalDate(data.enquiryDate) || new Date(),
      enquirerName: data.enquirerName.trim(),
      mobile: data.mobile.trim(),
      email: (data.email || '').trim(),
      classInterested: (data.classInterested || '').trim(),
      source: (data.source || 'Website').trim(),
      status: toStatus(data.status),
      assignedTo: (data.assignedTo || '').trim(),
      nextFollowUp: parseOptionalDate(data.nextFollowUp),
      notes: data.notes || null,
    },
  });

  await logActivity(enquiry.id, EnquiryActivityType.SYSTEM, `Enquiry ${enquiry.enquiryId} created`, performedBy);

  if (enquiry.nextFollowUp) {
    await prisma.followUpTask.create({
      data: {
        enquiryId: enquiry.id,
        title: `Follow up with ${enquiry.enquirerName}`,
        assignedTo: enquiry.assignedTo || performedBy,
        dueDate: enquiry.nextFollowUp,
      },
    });
  }

  return res.status(201).json({ enquiry: serializeEnquiry(enquiry) });
});

enquiriesRouter.post('/import', async (req, res) => {
  const schema = z.object({
    rows: z.array(
      z.object({
        enquiryId: z.string().optional().nullable(),
        enquiryDate: z.string().optional().nullable(),
        enquirerName: z.string().min(1),
        mobile: z.string().min(5),
        email: z.string().optional().nullable(),
        classInterested: z.string().optional().nullable(),
        source: z.string().optional().nullable(),
        status: z.string().optional().nullable(),
        assignedTo: z.string().optional().nullable(),
        nextFollowUp: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      }),
    ),
    replaceAll: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const institutionId = await getDefaultInstitutionId();
  if (parsed.data.replaceAll) {
    await prisma.enquiry.deleteMany({ where: { institutionId } });
  }

  let created = 0;
  let skipped = 0;
  for (const row of parsed.data.rows) {
    try {
      const enquiryId = row.enquiryId?.trim() || (await nextEnquiryCode(institutionId));
      const enquiry = await prisma.enquiry.create({
        data: {
          institutionId,
          enquiryId,
          enquiryDate: parseOptionalDate(row.enquiryDate) || new Date(),
          enquirerName: row.enquirerName.trim(),
          mobile: row.mobile.trim(),
          email: (row.email || '').trim(),
          classInterested: (row.classInterested || '').trim(),
          source: (row.source || 'Others').trim(),
          status: toStatus(row.status),
          assignedTo: (row.assignedTo || '').trim(),
          nextFollowUp: parseOptionalDate(row.nextFollowUp),
          notes: row.notes || null,
        },
      });
      await logActivity(
        enquiry.id,
        EnquiryActivityType.SYSTEM,
        `Enquiry imported from Excel (${enquiry.source})`,
        'Import',
      );
      created += 1;
    } catch {
      skipped += 1;
    }
  }

  const enquiries = await prisma.enquiry.findMany({
    where: { institutionId },
    orderBy: { enquiryDate: 'desc' },
  });

  return res.json({
    message: `Imported ${created} enquiries (${skipped} skipped)`,
    created,
    skipped,
    enquiries: enquiries.map(serializeEnquiry),
  });
});

enquiriesRouter.patch('/:id', async (req, res) => {
  const parsed = enquiryBodySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.enquiry.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Enquiry not found' });

  const data = parsed.data;
  const nextStatus = data.status !== undefined ? toStatus(data.status) : existing.status;

  const enquiry = await prisma.enquiry.update({
    where: { id: existing.id },
    data: {
      enquirerName: data.enquirerName?.trim() ?? existing.enquirerName,
      mobile: data.mobile?.trim() ?? existing.mobile,
      email: data.email !== undefined ? (data.email || '').trim() : existing.email,
      classInterested:
        data.classInterested !== undefined ? (data.classInterested || '').trim() : existing.classInterested,
      source: data.source !== undefined ? (data.source || '').trim() : existing.source,
      status: nextStatus,
      assignedTo: data.assignedTo !== undefined ? (data.assignedTo || '').trim() : existing.assignedTo,
      nextFollowUp:
        data.nextFollowUp !== undefined ? parseOptionalDate(data.nextFollowUp) : existing.nextFollowUp,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      enquiryDate:
        data.enquiryDate !== undefined
          ? parseOptionalDate(data.enquiryDate) || existing.enquiryDate
          : existing.enquiryDate,
    },
  });

  if (nextStatus !== existing.status) {
    await logActivity(
      enquiry.id,
      EnquiryActivityType.STATUS_CHANGE,
      `Enquiry status updated to ${STATUS_DB_TO_UI[nextStatus]}`,
      enquiry.assignedTo || 'Admin',
    );
  } else {
    await logActivity(enquiry.id, EnquiryActivityType.NOTE, `Enquiry ${enquiry.enquiryId} updated`, enquiry.assignedTo || 'Admin');
  }

  return res.json({ enquiry: serializeEnquiry(enquiry) });
});

enquiriesRouter.patch('/:id/status', async (req, res) => {
  const schema = z.object({
    status: z.string().min(1),
    nextFollowUp: z.string().optional().nullable(),
    performedBy: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.enquiry.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Enquiry not found' });

  const status = toStatus(parsed.data.status);
  const enquiry = await prisma.enquiry.update({
    where: { id: existing.id },
    data: {
      status,
      nextFollowUp:
        parsed.data.nextFollowUp !== undefined
          ? parseOptionalDate(parsed.data.nextFollowUp)
          : existing.nextFollowUp,
    },
  });

  await logActivity(
    enquiry.id,
    EnquiryActivityType.STATUS_CHANGE,
    `Enquiry status updated to ${STATUS_DB_TO_UI[status]}`,
    parsed.data.performedBy || enquiry.assignedTo || 'Admin',
  );

  return res.json({ enquiry: serializeEnquiry(enquiry) });
});

enquiriesRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.enquiry.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Enquiry not found' });
  await prisma.enquiry.delete({ where: { id: existing.id } });
  return res.json({ ok: true });
});

enquiriesRouter.post('/:id/activities', async (req, res) => {
  const schema = z.object({
    type: z.string().optional(),
    description: z.string().min(1),
    performedBy: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.enquiry.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Enquiry not found' });

  const typeRaw = (parsed.data.type || 'NOTE').toUpperCase().replace(/\s+/g, '_');
  const type =
    typeRaw in EnquiryActivityType
      ? (typeRaw as EnquiryActivityType)
      : EnquiryActivityType.NOTE;

  const activity = await prisma.enquiryActivity.create({
    data: {
      enquiryId: existing.id,
      type,
      description: parsed.data.description,
      performedBy: parsed.data.performedBy || existing.assignedTo || 'Admin',
    },
  });

  return res.status(201).json({
    activity: {
      id: activity.id,
      enquiryId: existing.enquiryId,
      type: parsed.data.type || 'Note',
      description: activity.description,
      performedBy: activity.performedBy,
      timestamp: activity.createdAt.toISOString(),
    },
  });
});

enquiriesRouter.post('/:id/tasks', async (req, res) => {
  const schema = z.object({
    title: z.string().min(1).optional(),
    mode: z.string().optional(),
    subject: z.string().optional(),
    discussionNotes: z.string().optional().nullable(),
    dueDate: z.string().min(4),
    dueTime: z.string().optional().nullable(),
    assignedTo: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.enquiry.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Enquiry not found' });

  const dueDate = parseDueDateTime(parsed.data.dueDate, parsed.data.dueTime);
  if (!dueDate) return res.status(400).json({ error: 'Invalid dueDate' });

  const mode = toFollowUpMode(parsed.data.mode);
  const subject = (parsed.data.subject || '').trim();
  const modeLabel = FOLLOW_UP_MODE_DB_TO_UI[mode];
  const title =
    (parsed.data.title || '').trim() ||
    (subject ? `${modeLabel}: ${subject}` : `${modeLabel} follow-up`);

  const task = await prisma.followUpTask.create({
    data: {
      enquiryId: existing.id,
      title,
      mode,
      subject,
      discussionNotes: parsed.data.discussionNotes || null,
      dueDate,
      assignedTo: parsed.data.assignedTo || existing.assignedTo || '',
    } as Prisma.FollowUpTaskUncheckedCreateInput,
    include: { enquiry: { select: { enquiryId: true, enquirerName: true } } },
  });

  await logActivity(
    existing.id,
    EnquiryActivityType.SYSTEM,
    `Follow-up scheduled (${modeLabel}): ${task.title}`,
    task.assignedTo || 'Admin',
  );

  await prisma.enquiry.update({
    where: { id: existing.id },
    data: {
      nextFollowUp: dueDate,
      status: existing.status === EnquiryStatus.NEW ? EnquiryStatus.FOLLOW_UP : existing.status,
    },
  });

  return res.status(201).json({
    task: serializeTask(task),
  });
});
