export type User = {
  id: string;
  email: string;
  displayName?: string;
  createdAt: string;
};

export type RegisterInput = {
  email: string;
  password: string;
  captchaId: string;
  captchaAnswer: string;
};

export type CaptchaResponse = {
  captchaId: string;
  image: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthResponse = {
  user: User;
};

export type ApiError = {
  error: string;
  details?: unknown;
};

// 开发时用相对路径走 Vite 代理，无跨域；生产可通过 VITE_API_BASE 指定后端地址
const API_BASE =
  typeof import.meta.env.VITE_API_BASE === 'string' && import.meta.env.VITE_API_BASE
    ? `${import.meta.env.VITE_API_BASE.replace(/\/$/, '')}/api/auth`
    : '/api/auth';

async function apiFetch<T = unknown>(
  path: string,
  options?: Omit<RequestInit, 'body'> & { body?: unknown }
): Promise<T> {
  const { body, ...rest } = options ?? {};
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(rest.headers as HeadersInit) },
    ...rest,
    body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({ error: 'unknown_error' }));
    throw new Error(err.error || 'request_failed');
  }

  return res.json();
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/register', { method: 'POST', body: input });
  },

  async login(input: LoginInput): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/login', { method: 'POST', body: input });
  },

  async logout(): Promise<{ ok: true }> {
    return apiFetch<{ ok: true }>('/logout', { method: 'POST' });
  },

  async me(): Promise<{ user: User | null }> {
    return apiFetch<{ user: User | null }>('/me');
  },

  async refresh(): Promise<{ ok: true }> {
    return apiFetch<{ ok: true }>('/refresh', { method: 'POST' });
  },

  async updateProfile(input: { displayName: string }): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/me', { method: 'PATCH', body: input });
  },

  async getCaptcha(): Promise<CaptchaResponse> {
    return apiFetch<CaptchaResponse>('/captcha');
  },

  async checkEmail(email: string): Promise<{ taken: boolean }> {
    const params = new URLSearchParams({ email: email.trim() });
    const res = await fetch(`${API_BASE}/check-email?${params}`, { credentials: 'include' });
    if (!res.ok) return { taken: false };
    return res.json();
  },
};
