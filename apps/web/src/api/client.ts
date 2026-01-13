import type { ApiResponse } from '@habit-tracker/shared';

const API_BASE = '/api';

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
}

export function getTokens() {
  if (!accessToken) {
    accessToken = localStorage.getItem('accessToken');
    refreshToken = localStorage.getItem('refreshToken');
  }
  return { accessToken, refreshToken };
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken: rt } = getTokens();
  if (!rt) return false;

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });

    if (!response.ok) {
      clearTokens();
      return false;
    }

    const data = await response.json();
    if (data.success && data.data) {
      setTokens(data.data.accessToken, data.data.refreshToken);
      return true;
    }

    clearTokens();
    return false;
  } catch {
    clearTokens();
    return false;
  }
}

export async function api<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const { accessToken: at } = getTokens();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (at) {
    headers['Authorization'] = `Bearer ${at}`;
  }

  let response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Try to refresh token on 401
  if (response.status === 401 && refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const { accessToken: newAt } = getTokens();
      headers['Authorization'] = `Bearer ${newAt}`;
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });
    }
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return {
      success: false,
      error: `Server error: ${response.status} ${response.statusText}`,
    } as ApiResponse<T>;
  }

  try {
    const data = JSON.parse(text);
    return data;
  } catch (e) {
    return {
      success: false,
      error: `Invalid JSON response: ${text.substring(0, 100)}`,
    } as ApiResponse<T>;
  }
}

export const authApi = {
  register: (email: string, password: string, name: string) =>
    api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string) =>
    api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => {
    const { refreshToken: rt } = getTokens();
    return api('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: rt }),
    });
  },

  me: () => api('/auth/me'),
};

export const habitsApi = {
  list: (includeArchived = false) =>
    api(`/habits${includeArchived ? '?includeArchived=true' : ''}`),

  get: (id: string) => api(`/habits/${id}`),

  create: (data: { name: string; description?: string; color?: string; frequency: string; customDays?: number[]; targetPerWeek?: number }) =>
    api('/habits', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Record<string, unknown>) =>
    api(`/habits/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    api(`/habits/${id}`, { method: 'DELETE' }),

  toggle: (id: string, date: string, note?: string) =>
    api(`/habits/${id}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ date, note }),
    }),

  completions: (id: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    return api(`/habits/${id}/completions${query ? `?${query}` : ''}`);
  },
};

export const analyticsApi = {
  overview: () => api('/analytics/overview'),

  calendar: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    return api(`/analytics/calendar${query ? `?${query}` : ''}`);
  },

  habit: (id: string) => api(`/analytics/habit/${id}`),
};
