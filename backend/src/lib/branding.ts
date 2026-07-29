import { prisma } from './prisma.js';

export const DEFAULT_LOGO_URL = '/logo.png';
export const DEFAULT_FAVICON_URL = '/favicon.png';

function patchBasicInformationLogo(basicInformation: unknown) {
  const basic = (basicInformation && typeof basicInformation === 'object'
    ? { ...(basicInformation as Record<string, unknown>) }
    : {}) as Record<string, unknown>;

  const sections = {
    ...((basic.sections as Record<string, Record<string, string>> | undefined) ?? {}),
  };

  const logoBranding = { ...(sections.logoBranding ?? {}) };
  let changed = false;

  if (!logoBranding.logoUrl?.trim()) {
    logoBranding.logoUrl = DEFAULT_LOGO_URL;
    changed = true;
  }
  if (!logoBranding.faviconUrl?.trim()) {
    logoBranding.faviconUrl = DEFAULT_FAVICON_URL;
    changed = true;
  }

  if (!changed) return { data: basicInformation, changed: false };

  sections.logoBranding = logoBranding;
  return { data: { ...basic, sections }, changed: true };
}

function patchModulesUiLogo(modulesUiSetup: unknown) {
  const mod = (modulesUiSetup && typeof modulesUiSetup === 'object'
    ? { ...(modulesUiSetup as Record<string, unknown>) }
    : {}) as Record<string, unknown>;

  const sections = {
    ...((mod.sections as Record<string, Record<string, string>> | undefined) ?? {}),
  };
  const theme = { ...(sections.themeSettings ?? {}) };
  let changed = false;

  if (!theme.logoUrl?.trim()) {
    theme.logoUrl = DEFAULT_LOGO_URL;
    changed = true;
  }

  if (!changed) return { data: modulesUiSetup, changed: false };

  sections.themeSettings = theme;
  return { data: { ...mod, sections }, changed: true };
}

/** Ensure institution branding URLs point at bundled assets when unset. */
export async function bootstrapBrandingAssets(institutionId: string) {
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    include: { setup: true },
  });
  if (!institution) return { updated: false };

  const setup = institution.setup;
  const basicPatch = patchBasicInformationLogo(setup?.basicInformation);
  const modulesPatch = patchModulesUiLogo(setup?.modulesUiSetup);

  if (setup && (basicPatch.changed || modulesPatch.changed)) {
    await prisma.institutionSetup.update({
      where: { institutionId },
      data: {
        ...(basicPatch.changed ? { basicInformation: basicPatch.data as object } : {}),
        ...(modulesPatch.changed ? { modulesUiSetup: modulesPatch.data as object } : {}),
      },
    });
  }

  const global = await prisma.globalSetting.findUnique({ where: { institutionId } });
  if (global && !global.brandingLogoUrl.trim()) {
    await prisma.globalSetting.update({
      where: { institutionId },
      data: { brandingLogoUrl: DEFAULT_LOGO_URL },
    });
  }

  const theme = await prisma.themeSetting.findUnique({ where: { institutionId } });
  if (theme && !theme.logoUrl.trim()) {
    await prisma.themeSetting.update({
      where: { institutionId },
      data: { logoUrl: DEFAULT_LOGO_URL },
    });
  } else if (!theme) {
    await prisma.themeSetting.create({
      data: {
        institutionId,
        brandName: institution.name,
        logoUrl: DEFAULT_LOGO_URL,
        fontFamily: 'Inter',
      },
    });
  }

  return { updated: basicPatch.changed || modulesPatch.changed || Boolean(global && !global.brandingLogoUrl.trim()) };
}
