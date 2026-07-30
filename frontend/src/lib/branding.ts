/** Central branding assets — served from `frontend/public/`. */
import { API_URL } from './api';

export const APP_NAME = '360schoolERP';
export const APP_TAGLINE = 'One Platform. One Login. Complete Management.';

export const APP_LOGO_URL = '/logo.png';
export const APP_FAVICON_URL = '/favicon.png';

/** Resolve institution / theme logo with app default fallback. */
export function resolveLogoUrl(logoUrl?: string | null): string {
  const trimmed = logoUrl?.trim();
  if (!trimmed) return APP_LOGO_URL;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (trimmed.startsWith('/api/') && API_URL) {
    return `${API_URL}${trimmed}`;
  }
  return trimmed;
}
