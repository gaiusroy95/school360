import { Router } from 'express';
import { z } from 'zod';
import { HolidayAudience, HolidayType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const holidaysRouter = Router();
holidaysRouter.use(requireAuth);

async function getDefaultInstitutionId() {
  let institution = await prisma.institution.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!institution) {
    institution = await prisma.institution.create({
      data: {
        name: 'Greenwood International School',
        setup: { create: {} },
      },
    });
  }
  return institution.id;
}

function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const raw = String(value).trim();
  // Support YYYY-MM-DD and Excel serial-ish ISO
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${raw}`);
  }
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function toHolidayType(value?: string): HolidayType {
  const v = (value || 'NATIONAL').toUpperCase().replace(/\s+/g, '_');
  if (v in HolidayType) return v as HolidayType;
  if (v.includes('RESTRICT')) return HolidayType.RESTRICTED;
  if (v.includes('OPTIONAL')) return HolidayType.OPTIONAL;
  if (v.includes('INSTITUTION')) return HolidayType.INSTITUTIONAL;
  return HolidayType.OTHER;
}

function toAudience(value?: string): HolidayAudience {
  const v = (value || 'ALL').toUpperCase();
  if (v.includes('STAFF') || v.includes('EMPLOYEE')) return HolidayAudience.STAFF;
  if (v.includes('STUDENT')) return HolidayAudience.STUDENTS;
  return HolidayAudience.ALL;
}

const holidayBodySchema = z.object({
  date: z.string().min(4),
  name: z.string().min(1),
  type: z.string().optional(),
  applicableTo: z.string().optional(),
  isPaid: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

holidaysRouter.get('/', async (req, res) => {
  const institutionId = await getDefaultInstitutionId();
  const year = req.query.year ? Number(req.query.year) : undefined;
  const month = req.query.month ? Number(req.query.month) : undefined;
  const audience = req.query.audience ? String(req.query.audience).toUpperCase() : undefined;

  const where: Prisma.HolidayWhereInput = { institutionId };

  if (year && month) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));
    where.date = { gte: start, lte: end };
  } else if (year) {
    where.date = {
      gte: new Date(Date.UTC(year, 0, 1)),
      lte: new Date(Date.UTC(year, 11, 31)),
    };
  }

  if (audience === 'STAFF' || audience === 'STUDENTS' || audience === 'ALL') {
    where.OR = [{ applicableTo: 'ALL' }, { applicableTo: audience as HolidayAudience }];
  }

  const holidays = await prisma.holiday.findMany({
    where,
    orderBy: { date: 'asc' },
  });

  return res.json({ holidays });
});

/** Working-day / payroll calendar summary for a month */
holidaysRouter.get('/payroll-calendar', async (req, res) => {
  const institutionId = await getDefaultInstitutionId();
  const now = new Date();
  const year = req.query.year ? Number(req.query.year) : now.getFullYear();
  const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;

  if (!year || !month || month < 1 || month > 12) {
    return res.status(400).json({ error: 'Invalid year/month' });
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const daysInMonth = end.getUTCDate();

  const holidays = await prisma.holiday.findMany({
    where: {
      institutionId,
      date: { gte: start, lte: end },
      OR: [{ applicableTo: 'ALL' }, { applicableTo: 'STAFF' }],
    },
    orderBy: { date: 'asc' },
  });

  const holidayDates = new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));

  let weekends = 0;
  let workingDays = 0;
  const dayMap: { date: string; weekday: string; kind: 'working' | 'weekend' | 'holiday'; holidayName?: string }[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(Date.UTC(year, month - 1, day));
    const iso = d.toISOString().slice(0, 10);
    const weekday = d.getUTCDay(); // 0 Sun .. 6 Sat
    const isWeekend = weekday === 0 || weekday === 6;
    const holiday = holidays.find((h) => h.date.toISOString().slice(0, 10) === iso);

    if (holiday) {
      dayMap.push({ date: iso, weekday: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }), kind: 'holiday', holidayName: holiday.name });
    } else if (isWeekend) {
      weekends += 1;
      dayMap.push({ date: iso, weekday: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }), kind: 'weekend' });
    } else {
      workingDays += 1;
      dayMap.push({ date: iso, weekday: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }), kind: 'working' });
    }
  }

  return res.json({
    year,
    month,
    daysInMonth,
    weekends,
    holidayCount: holidayDates.size,
    workingDays,
    paidHolidays: holidays.filter((h) => h.isPaid).length,
    holidays,
    calendar: dayMap,
  });
});

holidaysRouter.post('/', async (req, res) => {
  const parsed = holidayBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const institutionId = await getDefaultInstitutionId();
  try {
    const holiday = await prisma.holiday.create({
      data: {
        institutionId,
        date: parseDateOnly(parsed.data.date),
        name: parsed.data.name.trim(),
        type: toHolidayType(parsed.data.type),
        applicableTo: toAudience(parsed.data.applicableTo),
        isPaid: parsed.data.isPaid ?? true,
        notes: parsed.data.notes || null,
      },
    });
    return res.status(201).json({ holiday });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return res.status(409).json({ error: 'Holiday with same date and name already exists' });
    }
    throw e;
  }
});

holidaysRouter.put('/:id', async (req, res) => {
  const parsed = holidayBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const holiday = await prisma.holiday.update({
      where: { id: req.params.id },
      data: {
        date: parseDateOnly(parsed.data.date),
        name: parsed.data.name.trim(),
        type: toHolidayType(parsed.data.type),
        applicableTo: toAudience(parsed.data.applicableTo),
        isPaid: parsed.data.isPaid ?? true,
        notes: parsed.data.notes || null,
      },
    });
    return res.json({ holiday });
  } catch {
    return res.status(404).json({ error: 'Holiday not found' });
  }
});

holidaysRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.holiday.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch {
    return res.status(404).json({ error: 'Holiday not found' });
  }
});

/** Bulk import from Excel-parsed rows (frontend parses xlsx) */
holidaysRouter.post('/import', async (req, res) => {
  const schema = z.object({
    replaceYear: z.number().optional(),
    rows: z.array(
      z.object({
        date: z.string().min(4),
        name: z.string().min(1),
        type: z.string().optional(),
        applicableTo: z.string().optional(),
        isPaid: z.union([z.boolean(), z.string()]).optional(),
        notes: z.string().optional().nullable(),
      }),
    ),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const institutionId = await getDefaultInstitutionId();
  const errors: string[] = [];
  const prepared: {
    date: Date;
    name: string;
    type: HolidayType;
    applicableTo: HolidayAudience;
    isPaid: boolean;
    notes: string | null;
  }[] = [];

  parsed.data.rows.forEach((row, i) => {
    try {
      const date = parseDateOnly(row.date);
      const isPaid =
        typeof row.isPaid === 'boolean'
          ? row.isPaid
          : String(row.isPaid ?? 'yes').toLowerCase() !== 'no' &&
            String(row.isPaid ?? 'yes').toLowerCase() !== 'false';
      prepared.push({
        date,
        name: row.name.trim(),
        type: toHolidayType(row.type),
        applicableTo: toAudience(row.applicableTo),
        isPaid,
        notes: row.notes || null,
      });
    } catch (e) {
      errors.push(`Row ${i + 1}: ${e instanceof Error ? e.message : 'invalid row'}`);
    }
  });

  if (errors.length) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  const result = await prisma.$transaction(async (tx) => {
    if (parsed.data.replaceYear) {
      const y = parsed.data.replaceYear;
      await tx.holiday.deleteMany({
        where: {
          institutionId,
          date: {
            gte: new Date(Date.UTC(y, 0, 1)),
            lte: new Date(Date.UTC(y, 11, 31)),
          },
        },
      });
    }

    let created = 0;
    let skipped = 0;
    for (const row of prepared) {
      try {
        await tx.holiday.create({
          data: { institutionId, ...row },
        });
        created += 1;
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          skipped += 1;
        } else {
          throw e;
        }
      }
    }
    return { created, skipped };
  });

  const holidays = await prisma.holiday.findMany({
    where: { institutionId },
    orderBy: { date: 'asc' },
  });

  return res.json({
    message: 'Holiday list imported',
    ...result,
    holidays,
  });
});
