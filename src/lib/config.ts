/** True when DEMO_VERSION=true in .env — frontend runs without backend/Firebase. */
export const isDemoVersion =
  import.meta.env.DEMO_VERSION === 'true' ||
  import.meta.env.VITE_DEMO_VERSION === 'true';
