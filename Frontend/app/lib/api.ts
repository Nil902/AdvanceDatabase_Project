// Thin client for the Laravel API (routes/api.php, prefix /api/v1).
// The Vite dev server proxies /api → http://localhost:8000 (see vite.config.ts).
//
// Auth: login (routes/login.tsx) stores a Sanctum token under `auth_token` and
// the serialized user under `auth_user`. Every authenticated request sends it
// as `Authorization: Bearer <token>`; a 401 clears the session and bounces to
// the login screen.

const API_HOST = typeof window !== 'undefined' && window.location.port === '3000'
  ? `${window.location.protocol}//${window.location.hostname}`
  : '';
const BASE = `${API_HOST}/api/v1`;

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser<T = unknown>(): T | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setStoredUser(user: unknown) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  // Plain object → JSON-encoded; FormData/string passed through untouched.
  body?: unknown;
  // Appended as a query string; undefined/null/'' values are skipped.
  query?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = path.startsWith('/') ? `${BASE}${path}` : `${BASE}/${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function apiFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, headers, ...rest } = options;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const isRawBody = typeof body === 'string' || isFormData;
  const token = getToken();

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(body !== undefined && !isRawBody ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers as Record<string, string>),
  };

  const res = await fetch(buildUrl(path, query), {
    ...rest,
    headers: finalHeaders,
    body: body === undefined ? undefined : isRawBody ? (body as BodyInit) : JSON.stringify(body),
  });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new ApiError('Your session has expired. Please sign in again.', 401);
  }

  const contentType = res.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await res.json().catch(() => null)
    : await res.text();

  if (!res.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, payload);
  }

  return payload as T;
}

export const api = {
  get: <T = unknown>(path: string, query?: RequestOptions['query']) =>
    apiFetch<T>(path, { method: 'GET', query }),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body }),
  put: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body }),
  del: <T = unknown>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

// Shape Laravel returns for `Resource::collection($paginator)`.
export interface Paginated<T> {
  data: T[];
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
}
