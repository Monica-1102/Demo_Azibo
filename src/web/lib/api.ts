// Small API client. Same origin (/api); the session lives in an httpOnly cookie.
export interface FieldError {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public errors: FieldError[] = []) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      // Required by the API on every change (CSRF protection).
      'x-azibo-csrf': '1',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login' && typeof window !== 'undefined') {
      window.location.href = '/login/';
    }
    const msg = typeof data?.message === 'string' ? data.message : `Request failed (${res.status})`;
    throw new ApiError(res.status, msg, Array.isArray(data?.errors) ? data.errors : []);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
};

/** One-line text for a failed request, including the first field messages. */
export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    const details = e.errors.slice(0, 5).map((x) => x.message);
    return details.length ? `${e.message} ${details.join('; ')}` : e.message;
  }
  return e instanceof Error ? e.message : 'Something went wrong.';
}
