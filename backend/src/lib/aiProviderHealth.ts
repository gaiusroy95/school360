/**
 * Probe free AI providers and cache health so invalid keys (e.g. Gemini) are skipped quickly.
 */
type ProviderId = 'gemini' | 'openai' | 'groq';

type ProviderHealth = {
  configured: boolean;
  healthy: boolean;
  detail?: string;
  checkedAt: number;
};

const CACHE_MS = 10 * 60 * 1000;
const healthCache: Partial<Record<ProviderId, ProviderHealth>> = {};

function configured(id: ProviderId): boolean {
  if (id === 'gemini') return Boolean(process.env.GEMINI_API_KEY?.trim());
  if (id === 'openai') return Boolean(process.env.OPENAI_API_KEY?.trim());
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

async function probeGemini(): Promise<ProviderHealth> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return { configured: false, healthy: false, detail: 'GEMINI_API_KEY not configured', checkedAt: Date.now() };
  try {
    const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Reply with JSON {"ok":true}' }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 16 },
        }),
      },
    );
    const data = await res.json().catch(() => ({})) as { error?: { message?: string; status?: string } };
    if (!res.ok) {
      const msg = data.error?.message || `Gemini probe failed (${res.status})`;
      return { configured: true, healthy: false, detail: msg, checkedAt: Date.now() };
    }
    return { configured: true, healthy: true, checkedAt: Date.now() };
  } catch (err) {
    return {
      configured: true,
      healthy: false,
      detail: err instanceof Error ? err.message : String(err),
      checkedAt: Date.now(),
    };
  }
}

async function probeOpenAI(): Promise<ProviderHealth> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { configured: false, healthy: false, detail: 'OPENAI_API_KEY not configured', checkedAt: Date.now() };
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
      return {
        configured: true,
        healthy: false,
        detail: data.error?.message || `OpenAI probe failed (${res.status})`,
        checkedAt: Date.now(),
      };
    }
    return { configured: true, healthy: true, checkedAt: Date.now() };
  } catch (err) {
    return {
      configured: true,
      healthy: false,
      detail: err instanceof Error ? err.message : String(err),
      checkedAt: Date.now(),
    };
  }
}

async function probeGroq(): Promise<ProviderHealth> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return { configured: false, healthy: false, detail: 'GROQ_API_KEY not configured', checkedAt: Date.now() };
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
      return {
        configured: true,
        healthy: false,
        detail: data.error?.message || `Groq probe failed (${res.status})`,
        checkedAt: Date.now(),
      };
    }
    return { configured: true, healthy: true, checkedAt: Date.now() };
  } catch (err) {
    return {
      configured: true,
      healthy: false,
      detail: err instanceof Error ? err.message : String(err),
      checkedAt: Date.now(),
    };
  }
}

async function getHealth(id: ProviderId, force = false): Promise<ProviderHealth> {
  const cached = healthCache[id];
  if (!force && cached && Date.now() - cached.checkedAt < CACHE_MS) return cached;
  const next =
    id === 'gemini' ? await probeGemini() : id === 'openai' ? await probeOpenAI() : await probeGroq();
  healthCache[id] = next;
  return next;
}

/** Mark a provider unhealthy after a live API failure (e.g. invalid key). */
export function markAiProviderUnhealthy(id: ProviderId, detail: string) {
  healthCache[id] = {
    configured: configured(id),
    healthy: false,
    detail,
    checkedAt: Date.now(),
  };
}

export async function isAiProviderHealthy(id: ProviderId): Promise<boolean> {
  if (!configured(id)) return false;
  const h = await getHealth(id);
  return h.healthy;
}

export async function listAiProviderStatus(forceProbe = false) {
  const [gemini, openai, groq] = await Promise.all([
    getHealth('gemini', forceProbe),
    getHealth('openai', forceProbe),
    getHealth('groq', forceProbe),
  ]);
  return {
    gemini: gemini.healthy,
    openai: openai.healthy,
    groq: groq.healthy,
    configured: {
      gemini: gemini.configured,
      openai: openai.configured,
      groq: groq.configured,
    },
    details: {
      gemini: gemini.detail || (gemini.healthy ? 'ok' : undefined),
      openai: openai.detail || (openai.healthy ? 'ok' : undefined),
      groq: groq.detail || (groq.healthy ? 'ok' : undefined),
    },
    priority: ['gemini', 'openai', 'groq'] as const,
  };
}

export function listConfiguredAiProvidersSync() {
  return {
    gemini: configured('gemini'),
    openai: configured('openai'),
    groq: configured('groq'),
    priority: ['gemini', 'openai', 'groq'] as const,
  };
}
