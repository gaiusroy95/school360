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

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_URL) {
    throw new Error(
      'API URL is not configured. Set VITE_API_URL to your backend URL in Vercel and redeploy.',
    );
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new Error(
      'Cannot reach the API server. Check that the backend is running and VITE_API_URL is correct.',
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { error?: string }).error ||
      (res.status === 404
        ? `API not found (${url}). Check VITE_API_URL and backend routes.`
        : res.statusText) ||
      'Request failed';
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
  return data as T;
}

export { API_URL };
