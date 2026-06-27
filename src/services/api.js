import * as localDb from './localDb.js';

export const BASE = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname.endsWith('.github.io') 
    ? 'http://localhost:3001/api' 
    : '/api');

let isLocalMode = false;

if (typeof window !== 'undefined') {
  const savedMode = localStorage.getItem('trading_journal_local_mode');
  if (savedMode === 'local') {
    isLocalMode = true;
  } else if (!savedMode) {
    localStorage.setItem('trading_journal_local_mode', 'cloud');
  }
}

export const getMode = () => isLocalMode ? 'local' : 'cloud';

async function request(url, options = {}) {
  if (isLocalMode) {
    return localDb.handleRequest(url, options);
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Attach token from localStorage if present
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Set up AbortController for a 5-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  const config = {
    ...options,
    headers,
    credentials: 'include',
    signal: controller.signal,
  };

  // Don't set Content-Type for FormData (let browser set boundary)
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  try {
    const res = await fetch(`${BASE}${url}`, config);
    clearTimeout(timeoutId);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Request failed: ${res.status}`);
    }

    return res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    
    // Catch network failures and timeouts to swap automatically to Local Mode
    const isNetworkError = err.name === 'AbortError' || 
      err.message === 'Failed to fetch' || 
      err.message.includes('fetch failed') ||
      err.message.includes('NetworkError');

    if (isNetworkError) {
      console.warn('Backend server is offline. Switching to Browser Local Database (Serverless Mode).');
      isLocalMode = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('trading_journal_local_mode', 'local');
      }
      return localDb.handleRequest(url, options);
    }
    throw err;
  }
}

// ─── Auth ────────────────────────────────────────────
export const auth = {
  register: (email, password, displayName) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    }),
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request('/auth/me'),
  updateProfile: (data) =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  changePassword: (currentPassword, newPassword) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  generateShowcase: () => request('/auth/share-dashboard', { method: 'POST' }),
  revokeShowcase: () => request('/auth/share-dashboard', { method: 'DELETE' }),
  forgotPassword: (email) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (email, code, newPassword) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    }),
};

// ─── Trades ──────────────────────────────────────────
export const trades = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/trades${qs ? `?${qs}` : ''}`);
  },
  create: (formData) =>
    request('/trades', {
      method: 'POST',
      body: formData, // FormData for file uploads
    }),
  update: (id, formData) =>
    request(`/trades/${id}`, {
      method: 'PUT',
      body: formData,
    }),
  delete: (id) =>
    request(`/trades/${id}`, { method: 'DELETE' }),
  import: (tradesArr) =>
    request('/trades/import', {
      method: 'POST',
      body: JSON.stringify({ trades: tradesArr }),
    }),
  analytics: () => request('/trades/analytics'),
  export: () => request('/trades/export'),
  share: (id) => request(`/trades/${id}/share`, { method: 'POST' }),
  unshare: (id) => request(`/trades/${id}/share`, { method: 'DELETE' }),
  getShared: (token) => request(`/public/trades/${token}`),
};

// ─── Journal ─────────────────────────────────────────
export const journal = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/journal${qs ? `?${qs}` : ''}`);
  },
  getByDate: (date) => request(`/journal/${date}`),
  save: (entry) =>
    request('/journal', {
      method: 'POST',
      body: JSON.stringify(entry),
    }),
  delete: (id) =>
    request(`/journal/${id}`, { method: 'DELETE' }),
};

export const ai = {
  chat: (messages) => {
    const key = localStorage.getItem('nvidia_api_key') || '';
    return request('/ai/chat', {
      method: 'POST',
      headers: {
        'x-nvidia-api-key': key
      },
      body: JSON.stringify({ messages }),
    });
  }
};

// ─── News ────────────────────────────────────────────
export const news = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/news${qs ? `?${qs}` : ''}`);
  },
  analyze: (event, messages) => {
    const key = localStorage.getItem('nvidia_api_key') || '';
    return request('/news/analyze', {
      method: 'POST',
      headers: {
        'x-nvidia-api-key': key
      },
      body: JSON.stringify({ event, messages }),
    });
  }
};

// ─── Notion Workspace ────────────────────────────────
export const notion = {
  list: () => request('/notion'),
  get: (id) => request(`/notion/${id}`),
  create: (data) =>
    request('/notion', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    request(`/notion/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) => request(`/notion/${id}`, { method: 'DELETE' }),
  aiChat: (id, messages, content) =>
    request(`/notion/${id}/ai`, {
      method: 'POST',
      body: JSON.stringify({ messages, content }),
    }),
  readLink: (url) =>
    request('/notion/read-link', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
};

// ─── Stoic Mindset ───────────────────────────────────
export const stoic = {
  getQuotes: () => request('/stoic/quotes'),
  getReframes: () => request('/stoic/reframes'),
  createReframe: (data) =>
    request('/stoic/reframes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteReframe: (id) => request(`/stoic/reframes/${id}`, { method: 'DELETE' }),
  chat: (messages) =>
    request('/stoic/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    }),
  analyzeSituation: (situation) =>
    request('/stoic/analyze-situation', {
      method: 'POST',
      body: JSON.stringify({ situation }),
    }),
};

// ─── Tradovate Connection ────────────────────────────
export const tradovate = {
  connect: (username, password, appId, appSecret, accountType) =>
    request('/tradovate/connect', {
      method: 'POST',
      body: JSON.stringify({ username, password, appId, appSecret, accountType }),
    }),
  disconnect: () =>
    request('/tradovate/disconnect', { method: 'POST' }),
  status: () => request('/tradovate/status'),
  syncTrades: () =>
    request('/tradovate/sync-trades', { method: 'POST' }),
  chat: (messages) =>
    request('/tradovate/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    }),
};

// ─── TradingView MCP ─────────────────────────────────
export const tradingview = {
  analyze: (symbol, timeframe = '1D', indicators = []) =>
    request('/tradingview/analyze', {
      method: 'POST',
      body: JSON.stringify({ symbol, timeframe, indicators }),
    }),
  symbols: () => request('/tradingview/symbols'),
  status: () => request('/tradingview/status'),
};

// ─── MT5 Connection ──────────────────────────────────
export const mt5 = {
  connect: (accountNumber, password, serverName, accountType) =>
    request('/mt5/connect', {
      method: 'POST',
      body: JSON.stringify({ accountNumber, password, serverName, accountType }),
    }),
  disconnect: () =>
    request('/mt5/disconnect', { method: 'POST' }),
  status: () => request('/mt5/status'),
  syncTrades: () =>
    request('/mt5/sync-trades', { method: 'POST' }),
};

// ─── Backup ──────────────────────────────────────────
export const backup = {
  export: () => request('/backup/export'),
  import: (data) =>
    request('/backup/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── Accounts ────────────────────────────────────────
export const accounts = {
  list: () => request('/accounts'),
  create: (data) =>
    request('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    request(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    request(`/accounts/${id}`, { method: 'DELETE' }),
};

// ─── Achievements ────────────────────────────────────
export const achievements = {
  list: () => request('/achievements'),
  create: (formData) =>
    request('/achievements', {
      method: 'POST',
      body: formData, // FormData for certificate upload
    }),
  update: (id, formData) =>
    request(`/achievements/${id}`, {
      method: 'PUT',
      body: formData,
    }),
  delete: (id) =>
    request(`/achievements/${id}`, { method: 'DELETE' }),
};

// ─── Trading Rules ───────────────────────────────────
export const rules = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/rules${qs ? `?${qs}` : ''}`);
  },
  create: (data) =>
    request('/rules', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    request(`/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    request(`/rules/${id}`, { method: 'DELETE' }),
};

// ─── Showcase Public Api ─────────────────────────────
export const publicApi = {
  getDashboard: (token) => request(`/public/dashboard/${token}`),
  aiChat: (token, messages) =>
    request(`/public/dashboard/ai/chat/${token}`, {
      method: 'POST',
      body: JSON.stringify({ messages }),
    }),
};
