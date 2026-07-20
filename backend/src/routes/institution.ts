import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const institutionRouter = Router();

institutionRouter.use(requireAuth);

const TILE_KEYS = [
  'basicInformation',
  'academicSetup',
  'classesSections',
  'subjectsSetup',
  'departmentsSetup',
  'sessionTermSetup',
  'gradeMarksSetup',
  'feeGroupSetup',
  'documentSetup',
  'idCardNumbering',
  'calendarSetup',
  'customFieldsSetup',
  'notificationSetup',
  'otherPreferences',
  'integrationSetup',
  'backupRecovery',
  'securitySettings',
  'dataImportExport',
] as const;

type TileKey = (typeof TILE_KEYS)[number];

async function getOrCreateDefaultInstitution() {
  let institution = await prisma.institution.findFirst({
    include: { setup: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!institution) {
    institution = await prisma.institution.create({
      data: {
        name: 'Greenwood International School',
        setup: { create: {} },
      },
      include: { setup: true },
    });
  } else if (!institution.setup) {
    await prisma.institutionSetup.create({ data: { institutionId: institution.id } });
    institution = await prisma.institution.findUniqueOrThrow({
      where: { id: institution.id },
      include: { setup: true },
    });
  }

  return institution;
}

institutionRouter.get('/', async (_req, res) => {
  const institution = await getOrCreateDefaultInstitution();
  return res.json({ institution });
});

institutionRouter.get('/setup', async (_req, res) => {
  const institution = await getOrCreateDefaultInstitution();
  return res.json({ setup: institution.setup });
});

institutionRouter.patch('/setup/:tileKey', async (req, res) => {
  const tileKey = req.params.tileKey as TileKey;
  if (!TILE_KEYS.includes(tileKey)) {
    return res.status(400).json({ error: `Invalid tile key. Allowed: ${TILE_KEYS.join(', ')}` });
  }

  const bodySchema = z.object({ data: z.record(z.any()) });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const institution = await getOrCreateDefaultInstitution();
  const setup = await prisma.institutionSetup.update({
    where: { institutionId: institution.id },
    data: { [tileKey]: parsed.data.data },
  });

  return res.json({ setup, tileKey });
});

/** Express Setup Engine: apply multiple tiles from parsed Excel payload in one request */
institutionRouter.post('/setup/express', async (req, res) => {
  const schema = z.object({
    tiles: z.record(z.record(z.any())),
    meta: z.record(z.any()).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const updates: Record<string, unknown> = {
    expressSetupCompletedAt: new Date(),
    lastExpressImportMeta: parsed.data.meta ?? {},
  };

  for (const [key, value] of Object.entries(parsed.data.tiles)) {
    if (TILE_KEYS.includes(key as TileKey)) {
      updates[key] = value;
    }
  }

  const institution = await getOrCreateDefaultInstitution();
  const setup = await prisma.institutionSetup.update({
    where: { institutionId: institution.id },
    data: updates,
  });

  return res.json({ setup, message: 'Express setup applied successfully' });
});
