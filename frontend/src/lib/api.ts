function resolveApiUrl(): string {
  const raw = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  // Must be absolute URL in production (Vercel). Relative paths hit the frontend host and 404.
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:4000';
  }
  console.error(
    '[api] VITE_API_URL is missing or invalid. Set it to your Render backend URL (e.g. https://your-api.onrender.com) in Vercel Environment Variables, then redeploy.',
  );
  return '';
}

const API_URL = resolveApiUrl();

const TOKEN_KEY = 'erp_token';
const DEFAULT_TIMEOUT_MS = 20_000;

/** In-flight GET dedupe — parallel identical requests share one network call. */
const inflightGets = new Map<string, Promise<unknown>>();

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  if (!API_URL) {
    throw new Error(
      'API URL is not configured. Set VITE_API_URL to your backend URL in Vercel and redeploy.',
    );
  }

  const method = (options.method || 'GET').toUpperCase();
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const dedupeKey = method === 'GET' && !options.body ? `${method}:${url}` : '';

  if (dedupeKey) {
    const existing = inflightGets.get(dedupeKey);
    if (existing) return existing as Promise<T>;
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const { timeoutMs: customTimeout, ...fetchOptions } = options;
  const timeoutMs = customTimeout ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const externalSignal = fetchOptions.signal;
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const run = (async () => {
    let res: Response;
    try {
      res = await fetch(url, { ...fetchOptions, headers, signal: controller.signal });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw new Error(
        'Cannot reach the API server. Check that the backend is running and VITE_API_URL is correct.',
      );
    } finally {
      clearTimeout(timer);
      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const rawError = (data as { error?: unknown }).error;
      let message: string;
      if (typeof rawError === 'string') {
        message = rawError;
      } else if (rawError && typeof rawError === 'object') {
        message = JSON.stringify(rawError);
      } else if (res.status === 404) {
        message = `API not found (${url}). Check VITE_API_URL and backend routes.`;
      } else {
        message = res.statusText || 'Request failed';
      }
      throw new Error(message);
    }
    return data as T;
  })();

  if (dedupeKey) {
    inflightGets.set(dedupeKey, run);
    run.finally(() => {
      if (inflightGets.get(dedupeKey) === run) inflightGets.delete(dedupeKey);
    });
  }

  return run;
}

export { API_URL };
