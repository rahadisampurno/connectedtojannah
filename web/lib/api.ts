'use client';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002/v1';
const tokenKey = 'ctj_access_token';

export type SessionUser = { id:string;email:string;displayName:string;avatar:string;joinedAt:string;emailVerified:boolean;onboardingCompleted:boolean;timezone:string;language:string };
export type Session = { accessToken:string;expiresIn:number;user:SessionUser;devVerificationToken?:string };
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields?: { field: string; messages: string[] }[]
  ) {
    super(message);
  }
}

export const setSession = (session: Session) => sessionStorage.setItem(tokenKey, session.accessToken);
export const clearSession = () => sessionStorage.removeItem(tokenKey);

async function parse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fieldList: { field: string; messages: string[] }[] = Array.isArray(payload.fields) ? payload.fields : [];
    const fieldMessages = fieldList.flatMap((f) => f.messages).filter(Boolean);
    const message = fieldMessages.length > 0 ? fieldMessages.join('. ') : (payload.message ?? 'Permintaan belum berhasil. Coba kembali.');
    throw new ApiError(message, response.status, fieldList);
  }
  return payload as T;
}

export async function authenticate(mode: 'login' | 'register', body: Record<string, unknown>) {
  const response = await fetch(`${API_URL}/auth/${mode}`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const session = await parse<Session>(response); setSession(session); return session;
}

let refreshingPromise: Promise<Session> | null = null;

export async function refreshSession(): Promise<Session> {
  if (!refreshingPromise) {
    refreshingPromise = (async () => {
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
        const session = await parse<Session>(response);
        setSession(session);
        return session;
      } finally {
        refreshingPromise = null;
      }
    })();
  }
  return refreshingPromise;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = sessionStorage.getItem(tokenKey);
  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: 'include', headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...init.headers, ...(token ? { authorization: `Bearer ${token}` } : {}) } });
  if (response.status === 401 && retry) { try { await refreshSession(); return apiFetch<T>(path, init, false); } catch (error) { clearSession(); throw error; } }
  return parse<T>(response);
}

export async function logout() { await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' }); clearSession(); }
