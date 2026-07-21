import { Router } from 'express';
import { z } from 'zod';
import { ApplicationStatus, SeatAllocationStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getPassMarksForTest, getInstitutionPassMarks } from '../lib/admissionTestSettings.js';
import { ensureAdmissionRecordForApprovedApp } from '../lib/admissionRecords.js';

export const seatAllocationRouter = Router();
seatAllocationRouter.use(requireAuth);

const DEFAULT_YEAR = '2025-26';

function normalizeClassKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^class\s+/i, '')
    .replace(/\s+/g, ' ');
}

function classesMatch(a: string, b: string): boolean {
  if (!a.trim() || !b.trim()) return false;
  const na = normalizeClassKey(a);
  const nb = normalizeClassKey(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

type SetupRow = Record<string, string>;

function extractSetupClassSections(setup: {
  classesSections?: unknown;
} | null): Array<{ className: string; sectionName: string; capacity: number }> {
  const tile = (setup?.classesSections || {}) as {
    records?: SetupRow[];
  };
  const rows = tile.records || [];
  const out: Array<{ className: string; sectionName: string; capacity: number }> = [];
  for (const r of rows) {
    const className = (r.className || r.class || r.Class || '').trim();
    const sectionName = (r.sectionName || r.section || r.Section || 'A').trim() || 'A';
    const capacityRaw = r.capacity || r.Capacity || '30';
    const capacity = Math.max(0, Number.parseInt(String(capacityRaw), 10) || 30);
    if (!className) continue;
    out.push({ className, sectionName, capacity });
  }
  return out;
}

function serializeCapacity(
  c: {
    id: string;
    className: string;
    sectionName: string;
    totalSeats: number;
    academicYear: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  },
  allocatedCount: number,
) {
  return {
    id: c.id,
    className: c.className,
    sectionName: c.sectionName,
    totalSeats: c.totalSeats,
    academicYear: c.academicYear,
    sortOrder: c.sortOrder,
    allocatedCount,
    remainingSeats: Math.max(0, c.totalSeats - allocatedCount),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function serializeAllocation(a: {
  id: string;
  className: string;
  sectionName: string;
  meritRank: number;
  classMeritRank: number;
  entranceScore: number;
  status: SeatAllocationStatus;
  academicYear: string;
  allocatedAt: Date;
  allocatedBy: string;
  notes: string;
  application: {
    id: string;
    applicationId: string;
    studentName: string;
    classApplied: string;
    email: string;
    mobile: string;
    status: ApplicationStatus;
    entranceTestScore: number | null;
  };
}) {
  return {
    id: a.id,
    className: a.className,
    sectionName: a.sectionName,
    meritRank: a.meritRank,
    classMeritRank: a.classMeritRank,
    entranceScore: a.entranceScore,
    status: a.status === SeatAllocationStatus.ALLOCATED ? 'Allocated' : 'Waitlisted',
    statusKey: a.status,
    academicYear: a.academicYear,
    allocatedAt: a.allocatedAt.toISOString(),
    allocatedBy: a.allocatedBy,
    notes: a.notes,
    applicationDbId: a.application.id,
    applicationId: a.application.applicationId,
    studentName: a.application.studentName,
    classApplied: a.application.classApplied,
    email: a.application.email,
    mobile: a.application.mobile,
    applicationStatus: a.application.status,
  };
}

seatAllocationRouter.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
    const fromSetup = extractSetupClassSections(setup);
    const years = await prisma.seatCapacity.findMany({
      where: { institutionId },
      select: { academicYear: true },
      distinct: ['academicYear'],
      orderBy: { academicYear: 'desc' },
    });
    const academicYears = [
      ...new Set([DEFAULT_YEAR, ...years.map((y) => y.academicYear)]),
    ];

    return res.json({
      defaultAcademicYear: DEFAULT_YEAR,
      academicYears,
      setupSuggestions: fromSetup,
      classesFromSetup: [...new Set(fromSetup.map((r) => r.className))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    });
  }),
);

seatAllocationRouter.get(
  '/capacities',
  asyncHandler(async (req, res) => {
    const academicYear = String(req.query.academicYear || DEFAULT_YEAR);
    const institutionId = await getDefaultInstitutionId();
    const capacities = await prisma.seatCapacity.findMany({
      where: { institutionId, academicYear },
      orderBy: [{ className: 'asc' }, { sortOrder: 'asc' }, { sectionName: 'asc' }],
      include: {
        _count: {
          select: {
            allocations: { where: { status: SeatAllocationStatus.ALLOCATED } },
          },
        },
      },
    });

    const byClassMap = new Map<
      string,
      {
        className: string;
        totalSeats: number;
        allocated: number;
        remaining: number;
        sections: ReturnType<typeof serializeCapacity>[];
      }
    >();

    for (const c of capacities) {
      const allocated = c._count.allocations;
      const row = serializeCapacity(c, allocated);
      const existing = byClassMap.get(c.className) || {
        className: c.className,
        totalSeats: 0,
        allocated: 0,
        remaining: 0,
        sections: [] as ReturnType<typeof serializeCapacity>[],
      };
      existing.totalSeats += c.totalSeats;
      existing.allocated += allocated;
      existing.remaining += row.remainingSeats;
      existing.sections.push(row);
      byClassMap.set(c.className, existing);
    }

    return res.json({
      academicYear,
      capacities: capacities.map((c) => serializeCapacity(c, c._count.allocations)),
      byClass: [...byClassMap.values()],
      summary: {
        totalSeats: capacities.reduce((n, c) => n + c.totalSeats, 0),
        allocated: capacities.reduce((n, c) => n + c._count.allocations, 0),
        sections: capacities.length,
        classes: byClassMap.size,
      },
    });
  }),
);

seatAllocationRouter.put(
  '/capacities',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().min(4).default(DEFAULT_YEAR),
      capacities: z
        .array(
          z.object({
            id: z.string().optional(),
            className: z.string().min(1),
            sectionName: z.string().min(1),
            totalSeats: z.number().int().min(0).max(500),
            sortOrder: z.number().int().optional(),
          }),
        )
        .min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const { academicYear, capacities } = parsed.data;

    // Deduplicate by class+section
    const unique = new Map<string, (typeof capacities)[number]>();
    capacities.forEach((c, i) => {
      const key = `${c.className.trim().toLowerCase()}|${c.sectionName.trim().toLowerCase()}`;
      unique.set(key, { ...c, sortOrder: c.sortOrder ?? i });
    });

    const saved = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const c of unique.values()) {
        const row = await tx.seatCapacity.upsert({
          where: {
            institutionId_academicYear_className_sectionName: {
              institutionId,
              academicYear,
              className: c.className.trim(),
              sectionName: c.sectionName.trim(),
            },
          },
          create: {
            institutionId,
            academicYear,
            className: c.className.trim(),
            sectionName: c.sectionName.trim(),
            totalSeats: c.totalSeats,
            sortOrder: c.sortOrder ?? 0,
          },
          update: {
            totalSeats: c.totalSeats,
            sortOrder: c.sortOrder ?? 0,
          },
        });
        results.push(row);
      }
      return results;
    });

    return res.json({
      academicYear,
      capacities: saved.map((c) => serializeCapacity(c, 0)),
      message: `Saved ${saved.length} class/section seat configuration(s)`,
    });
  }),
);

seatAllocationRouter.post(
  '/capacities/import-from-setup',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().min(4).optional().default(DEFAULT_YEAR),
      overwrite: z.boolean().optional().default(false),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
    const suggestions = extractSetupClassSections(setup);
    if (suggestions.length === 0) {
      return res.status(400).json({
        error:
          'No classes/sections found in Institution Setup. Add them under Classes & Sections first.',
      });
    }

    const academicYear = parsed.data.academicYear;
    if (parsed.data.overwrite) {
      await prisma.seatCapacity.deleteMany({ where: { institutionId, academicYear } });
    }

    let created = 0;
    let updated = 0;
    for (let i = 0; i < suggestions.length; i++) {
      const s = suggestions[i];
      const existing = await prisma.seatCapacity.findUnique({
        where: {
          institutionId_academicYear_className_sectionName: {
            institutionId,
            academicYear,
            className: s.className,
            sectionName: s.sectionName,
          },
        },
      });
      if (existing) {
        await prisma.seatCapacity.update({
          where: { id: existing.id },
          data: { totalSeats: s.capacity, sortOrder: i },
        });
        updated += 1;
      } else {
        await prisma.seatCapacity.create({
          data: {
            institutionId,
            academicYear,
            className: s.className,
            sectionName: s.sectionName,
            totalSeats: s.capacity,
            sortOrder: i,
          },
        });
        created += 1;
      }
    }

    return res.json({
      academicYear,
      created,
      updated,
      message: `Imported ${created + updated} seat capacities from Institution Setup`,
    });
  }),
);

seatAllocationRouter.delete(
  '/capacities/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.seatCapacity.findFirst({
      where: { id: req.params.id, institutionId },
      include: {
        _count: { select: { allocations: { where: { status: SeatAllocationStatus.ALLOCATED } } } },
      },
    });
    if (!existing) return res.status(404).json({ error: 'Capacity not found' });
    if (existing._count.allocations > 0) {
      return res.status(400).json({
        error: 'Cannot delete: seats already allocated in this section. Clear allocations first.',
      });
    }
    await prisma.seatCapacity.delete({ where: { id: existing.id } });
    return res.json({ ok: true });
  }),
);

seatAllocationRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().optional().default(DEFAULT_YEAR),
      className: z.string().optional(),
      status: z.enum(['all', 'Allocated', 'Waitlisted', 'ALLOCATED', 'WAITLISTED']).optional().default('all'),
      q: z.string().optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const statusFilter =
      parsed.data.status === 'Allocated' || parsed.data.status === 'ALLOCATED'
        ? SeatAllocationStatus.ALLOCATED
        : parsed.data.status === 'Waitlisted' || parsed.data.status === 'WAITLISTED'
          ? SeatAllocationStatus.WAITLISTED
          : undefined;

    const allocations = await prisma.seatAllocation.findMany({
      where: {
        institutionId,
        academicYear: parsed.data.academicYear,
        ...(parsed.data.className ? { className: parsed.data.className } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(parsed.data.q
          ? {
              OR: [
                { application: { studentName: { contains: parsed.data.q, mode: 'insensitive' } } },
                { application: { applicationId: { contains: parsed.data.q, mode: 'insensitive' } } },
                { sectionName: { contains: parsed.data.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        application: {
          select: {
            id: true,
            applicationId: true,
            studentName: true,
            classApplied: true,
            email: true,
            mobile: true,
            status: true,
            entranceTestScore: true,
          },
        },
      },
      orderBy: [{ meritRank: 'asc' }, { classMeritRank: 'asc' }],
    });

    const allocated = allocations.filter((a) => a.status === SeatAllocationStatus.ALLOCATED).length;
    const waitlisted = allocations.filter((a) => a.status === SeatAllocationStatus.WAITLISTED).length;

    return res.json({
      academicYear: parsed.data.academicYear,
      summary: {
        total: allocations.length,
        allocated,
        waitlisted,
      },
      allocations: allocations.map(serializeAllocation),
    });
  }),
);

seatAllocationRouter.post(
  '/run',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().min(4).optional().default(DEFAULT_YEAR),
      clearExisting: z.boolean().optional().default(true),
      className: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const academicYear = parsed.data.academicYear;
    const allocatedBy = req.user?.email || 'SYSTEM';

    const capacities = await prisma.seatCapacity.findMany({
      where: {
        institutionId,
        academicYear,
        ...(parsed.data.className ? { className: parsed.data.className } : {}),
      },
      orderBy: [{ className: 'asc' }, { sortOrder: 'asc' }, { sectionName: 'asc' }],
    });

    if (capacities.length === 0) {
      return res.status(400).json({
        error:
          'No seat capacities configured. Configure class/section seats first, or import from Institution Setup.',
      });
    }

    // Eligible: submitted entrance attempts that passed (and application not rejected)
    const attempts = await prisma.entranceExamAttempt.findMany({
      where: {
        submittedAt: { not: null },
        credential: {
          publication: { institutionId },
          application: {
            status: { not: ApplicationStatus.REJECTED },
          },
        },
      },
      include: {
        credential: {
          include: {
            publication: {
              include: { test: { select: { id: true, passMarksPercent: true } } },
            },
            application: true,
          },
        },
      },
    });

    const defaultPass = await getInstitutionPassMarks(institutionId);
    const passMarksCache = new Map<string, number>();
    type Candidate = {
      applicationId: string;
      studentName: string;
      classApplied: string;
      score: number;
      submittedAt: Date;
    };

    const byApp = new Map<string, Candidate>();
    for (const attempt of attempts) {
      const app = attempt.credential.application;
      const test = attempt.credential.publication.test;
      let passMarks = passMarksCache.get(test.id);
      if (passMarks == null) {
        passMarks =
          test.passMarksPercent ?? (await getPassMarksForTest(test.id, institutionId)) ?? defaultPass;
        passMarksCache.set(test.id, passMarks);
      }
      const percent = attempt.percentScore ?? 0;
      const passed = attempt.passed ?? percent >= passMarks;
      if (!passed) continue;
      if (parsed.data.className && !classesMatch(app.classApplied, parsed.data.className)) {
        continue;
      }

      const existing = byApp.get(app.id);
      if (!existing || percent > existing.score) {
        byApp.set(app.id, {
          applicationId: app.id,
          studentName: app.studentName,
          classApplied: app.classApplied || 'Unspecified',
          score: percent,
          submittedAt: attempt.submittedAt || new Date(),
        });
      }
    }

    const candidates = [...byApp.values()].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.submittedAt.getTime() - b.submittedAt.getTime();
    });

    if (candidates.length === 0) {
      return res.status(400).json({
        error:
          'No eligible candidates found. Students must submit and pass the entrance exam first (see Merit List).',
      });
    }

    // Group capacities by class
    const capsByClass = new Map<string, typeof capacities>();
    for (const c of capacities) {
      const list = capsByClass.get(c.className) || [];
      list.push(c);
      capsByClass.set(c.className, list);
    }

    const remaining = new Map<string, number>();
    for (const c of capacities) remaining.set(c.id, c.totalSeats);

    type Planned = {
      applicationId: string;
      capacityId: string | null;
      className: string;
      sectionName: string;
      meritRank: number;
      classMeritRank: number;
      entranceScore: number;
      status: SeatAllocationStatus;
      notes: string;
    };

    const planned: Planned[] = [];
    const classRankCounter = new Map<string, number>();

    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[i];
      const meritRank = i + 1;

      // Find matching capacity class
      let matchedClassName: string | null = null;
      let matchedCaps: typeof capacities = [];
      for (const [className, caps] of capsByClass.entries()) {
        if (classesMatch(cand.classApplied, className)) {
          matchedClassName = className;
          matchedCaps = caps;
          break;
        }
      }

      if (!matchedClassName || matchedCaps.length === 0) {
        planned.push({
          applicationId: cand.applicationId,
          capacityId: null,
          className: cand.classApplied,
          sectionName: '',
          meritRank,
          classMeritRank: 0,
          entranceScore: cand.score,
          status: SeatAllocationStatus.WAITLISTED,
          notes: 'No seat capacity configured for applied class',
        });
        continue;
      }

      const classMeritRank = (classRankCounter.get(matchedClassName) || 0) + 1;
      classRankCounter.set(matchedClassName, classMeritRank);

      let assigned = false;
      for (const cap of matchedCaps) {
        const left = remaining.get(cap.id) ?? 0;
        if (left > 0) {
          remaining.set(cap.id, left - 1);
          planned.push({
            applicationId: cand.applicationId,
            capacityId: cap.id,
            className: matchedClassName,
            sectionName: cap.sectionName,
            meritRank,
            classMeritRank,
            entranceScore: cand.score,
            status: SeatAllocationStatus.ALLOCATED,
            notes: '',
          });
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        planned.push({
          applicationId: cand.applicationId,
          capacityId: null,
          className: matchedClassName,
          sectionName: '',
          meritRank,
          classMeritRank,
          entranceScore: cand.score,
          status: SeatAllocationStatus.WAITLISTED,
          notes: 'All seats filled for this class — waitlisted by merit rank',
        });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      if (parsed.data.clearExisting) {
        await tx.seatAllocation.deleteMany({
          where: {
            institutionId,
            academicYear,
            ...(parsed.data.className
              ? {
                  OR: [
                    { className: parsed.data.className },
                    {
                      application: {
                        classApplied: { equals: parsed.data.className, mode: 'insensitive' },
                      },
                    },
                  ],
                }
              : {}),
          },
        });
      }

      // Skip apps that already have allocation if not clearing
      const existingIds = new Set(
        (
          await tx.seatAllocation.findMany({
            where: { institutionId, academicYear },
            select: { applicationId: true },
          })
        ).map((a) => a.applicationId),
      );

      const toCreate = planned.filter((p) => !existingIds.has(p.applicationId));

      if (toCreate.length > 0) {
        await tx.seatAllocation.createMany({
          data: toCreate.map((p) => ({
            institutionId,
            academicYear,
            applicationId: p.applicationId,
            capacityId: p.capacityId,
            className: p.className,
            sectionName: p.sectionName,
            meritRank: p.meritRank,
            classMeritRank: p.classMeritRank,
            entranceScore: p.entranceScore,
            status: p.status,
            allocatedBy,
            notes: p.notes,
          })),
        });
      }

      // Mark allocated applications as APPROVED if still verified/pending
      const allocatedAppIds = toCreate
        .filter((p) => p.status === SeatAllocationStatus.ALLOCATED)
        .map((p) => p.applicationId);

      if (allocatedAppIds.length > 0) {
        await tx.application.updateMany({
          where: {
            id: { in: allocatedAppIds },
            status: {
              in: [ApplicationStatus.PENDING_VERIFICATION, ApplicationStatus.VERIFIED],
            },
          },
          data: {
            status: ApplicationStatus.APPROVED,
            reviewedBy: allocatedBy,
            reviewedAt: new Date(),
            approvalRemarks: 'Auto-approved via seat allocation from entrance merit list',
          },
        });
      }

      return {
        created: toCreate.length,
        allocated: toCreate.filter((p) => p.status === SeatAllocationStatus.ALLOCATED).length,
        waitlisted: toCreate.filter((p) => p.status === SeatAllocationStatus.WAITLISTED).length,
        allocatedAppIds,
      };
    });

    const { allocatedAppIds: _allocatedAppIds, ...stats } = result;

    for (const appId of result.allocatedAppIds) {
      await ensureAdmissionRecordForApprovedApp(appId, institutionId);
    }

    return res.json({
      academicYear,
      candidatesConsidered: candidates.length,
      ...stats,
      message: `Allocated ${stats.allocated} seat(s), waitlisted ${stats.waitlisted} candidate(s) by entrance test merit.`,
    });
  }),
);

seatAllocationRouter.delete(
  '/',
  asyncHandler(async (req, res) => {
    const academicYear = String(req.query.academicYear || req.body?.academicYear || DEFAULT_YEAR);
    const institutionId = await getDefaultInstitutionId();
    const deleted = await prisma.seatAllocation.deleteMany({
      where: { institutionId, academicYear },
    });
    return res.json({
      ok: true,
      deleted: deleted.count,
      message: `Cleared ${deleted.count} allocation(s) for ${academicYear}`,
    });
  }),
);
