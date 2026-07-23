export * from './types/auth';
export * from './types/api';
export * from './types/staff';
export {
  api,
  mobileAuth,
  mobileApp,
  API_URL,
  getToken,
  setToken,
  uploadFileUrl,
  type MobileAuthModes,
} from './api/client';
export { mobileStaff } from './api/staff';
export {
  INDIA_MOBILE_PREFIX,
  extractLocalMobileDigits,
  formatMobileWithPrefix,
  isValidIndiaMobile,
} from './lib/mobileNumber';
