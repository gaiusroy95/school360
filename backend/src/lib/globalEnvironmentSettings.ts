import { prisma } from './prisma.js';
import { DEFAULT_LOGO_URL } from './branding.js';
import { getDefaultInstitutionId } from './institution.js';

function readSetupSections(raw: unknown): Record<string, Record<string, unknown>> {
  if (!raw || typeof raw !== 'object') return {};
  const root = raw as Record<string, unknown>;
  const out: Record<string, Record<string, unknown>> = {};
  for (const [sectionId, section] of Object.entries(root)) {
    if (section && typeof section === 'object' && !Array.isArray(section)) {
      out[sectionId] = section as Record<string, unknown>;
    }
  }
  return out;
}

function readField(
  sections: Record<string, Record<string, unknown>>,
  sectionIds: string[],
  key: string,
  fallback = '',
) {
  for (const id of sectionIds) {
    const val = sections[id]?.[key];
    if (val != null && String(val) !== '') return String(val);
  }
  return fallback;
}

async function ensureGlobalSettings(institutionId: string) {
  let row = await prisma.globalSetting.findUnique({ where: { institutionId } });
  if (!row) {
    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
    row = await prisma.globalSetting.create({
      data: {
        institutionId,
        companyName: institution?.name ?? '',
      },
    });
  }
  return row;
}

function serializeGlobalSettings(row: {
  companyName: string;
  timezone: string;
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  language: string;
  weekStartsOn: string;
  brandingLogoUrl: string;
  updatedAt: Date;
}) {
  return {
    companyName: row.companyName,
    timezone: row.timezone,
    currency: row.currency,
    currencySymbol: row.currencySymbol,
    dateFormat: row.dateFormat,
    language: row.language,
    weekStartsOn: row.weekStartsOn,
    brandingLogoUrl: row.brandingLogoUrl,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getGlobalConfig(institutionId: string) {
  const row = await ensureGlobalSettings(institutionId);
  return { config: serializeGlobalSettings(row) };
}

export async function updateGlobalConfig(institutionId: string, body: Record<string, unknown>) {
  const current = await ensureGlobalSettings(institutionId);
  const updated = await prisma.globalSetting.update({
    where: { institutionId },
    data: {
      companyName: String(body.companyName ?? current.companyName).trim(),
      timezone: String(body.timezone ?? current.timezone).trim() || 'Asia/Kolkata',
      currency: String(body.currency ?? current.currency).trim() || 'INR',
      currencySymbol: String(body.currencySymbol ?? current.currencySymbol).trim() || '₹',
      dateFormat: String(body.dateFormat ?? current.dateFormat).trim() || 'DD/MM/YYYY',
      language: String(body.language ?? current.language).trim() || 'English',
      weekStartsOn: String(body.weekStartsOn ?? current.weekStartsOn).trim() || 'Monday',
      brandingLogoUrl: String(body.brandingLogoUrl ?? current.brandingLogoUrl).trim(),
    },
  });

  return {
    message: 'Global environment settings saved; runtime locale and branding refreshed',
    config: serializeGlobalSettings(updated),
  };
}

export function loadGlobalEnvironmentFromSetup(setup: {
  basicInformation?: unknown;
  otherPreferences?: unknown;
} | null) {
  const basic = readSetupSections(setup?.basicInformation);
  const prefs = readSetupSections(setup?.otherPreferences);

  return {
    companyName: readField(basic, ['institutionProfile'], 'institutionName', ''),
    brandingLogoUrl: readField(basic, ['logoBranding'], 'logoUrl', DEFAULT_LOGO_URL),
    language: readField(prefs, ['languageSettings'], 'defaultLanguage', 'English'),
    currency: readField(prefs, ['currencySettings'], 'currency', 'INR'),
    currencySymbol: readField(prefs, ['currencySettings'], 'currencySymbol', '₹'),
    timezone: readField(prefs, ['timeZoneSettings'], 'timeZone', 'Asia/Kolkata'),
    dateFormat: readField(prefs, ['systemPreferences'], 'dateFormat', 'DD/MM/YYYY'),
    weekStartsOn: readField(prefs, ['systemPreferences'], 'weekStartsOn', 'Monday'),
  };
}

export async function syncGlobalEnvironmentFromSetup(institutionId: string) {
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    include: { setup: true },
  });
  if (!institution?.setup) {
    return { synced: false, message: 'Institution setup not found' };
  }

  const config = loadGlobalEnvironmentFromSetup({
    basicInformation: institution.setup.basicInformation,
    otherPreferences: institution.setup.otherPreferences,
  });

  const updated = await prisma.globalSetting.upsert({
    where: { institutionId },
    create: { institutionId, ...config },
    update: config,
  });

  return {
    synced: true,
    message: 'Global environment synced from Institution Setup',
    config: serializeGlobalSettings(updated),
  };
}

export async function onGlobalEnvironmentTileSaved(institutionId: string, tileKey: string) {
  if (tileKey === 'basicInformation' || tileKey === 'otherPreferences') {
    return { globalEnvironment: await syncGlobalEnvironmentFromSetup(institutionId) };
  }
  return null;
}

export async function bootstrapGlobalEnvironment(institutionId?: string) {
  const id = institutionId ?? await getDefaultInstitutionId();
  await ensureGlobalSettings(id);
  const institution = await prisma.institution.findUnique({
    where: { id },
    include: { setup: true },
  });
  if (institution?.setup?.basicInformation || institution?.setup?.otherPreferences) {
    await syncGlobalEnvironmentFromSetup(id);
  }
  return getGlobalConfig(id);
}
