type CacheEntry = { value: unknown; expiresAt: number };

const store = new Map<string, CacheEntry>();
let lastFlushedAt: string | null = null;

export function getAppCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setAppCache(key: string, value: unknown, ttlSeconds: number) {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export function flushAppCache() {
  const size = store.size;
  store.clear();
  lastFlushedAt = new Date().toISOString();
  return { clearedEntries: size, flushedAt: lastFlushedAt };
}

export function getAppCacheStats() {
  return { entries: store.size, lastFlushedAt };
}
