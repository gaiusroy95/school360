/** Central branding assets — served from `frontend/public/`. */
export const APP_NAME = '360schoolERP';
export const APP_TAGLINE = 'One Platform. One Login. Complete Management.';

export const APP_LOGO_URL = '/logo.png';
export const APP_FAVICON_URL = '/favicon.png';

/** Resolve institution / theme logo with app default fallback. */
export function resolveLogoUrl(logoUrl?: string | null): string {
  const trimmed = logoUrl?.trim();
  return trimmed || APP_LOGO_URL;
}
