import { prisma } from './prisma.js';
import { deleteAppCache, getAppCache, setAppCache } from './appCache.js';

const INSTITUTION_CACHE_KEY = 'defaultInstitutionId';
const INSTITUTION_TTL_SEC = 300;

/** Cached default institution id — avoids a DB roundtrip on nearly every API request. */
export async function getDefaultInstitutionId() {
  const cached = getAppCache<string>(INSTITUTION_CACHE_KEY);
  if (cached) return cached;

  let institution = await prisma.institution.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!institution) {
    institution = await prisma.institution.create({
      data: {
        name: 'Greenwood International School',
        setup: { create: {} },
      },
    });
  }
  setAppCache(INSTITUTION_CACHE_KEY, institution.id, INSTITUTION_TTL_SEC);
  return institution.id;
}

export function clearInstitutionIdCache() {
  deleteAppCache(INSTITUTION_CACHE_KEY);
}
