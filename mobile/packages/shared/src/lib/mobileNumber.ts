export const INDIA_MOBILE_PREFIX = '+91';

/** Keep only the 10-digit local Indian mobile number. */
export function extractLocalMobileDigits(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length > 10) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 10);
}

/** Format as +91XXXXXXXXXX for API requests. */
export function formatMobileWithPrefix(localDigits: string): string {
  const digits = extractLocalMobileDigits(localDigits);
  return digits ? `${INDIA_MOBILE_PREFIX}${digits}` : '';
}

export function isValidIndiaMobile(localDigits: string): boolean {
  const digits = extractLocalMobileDigits(localDigits);
  return digits.length === 10 && /^[6-9]/.test(digits);
}
