const BASE = '/api';

async function request(url, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  };

  // Don't set Content-Type for FormData (let browser set boundary)
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const res = await fetch(`${BASE}${url}`, config);

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return res.json();
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
  logout: () => request('/auth/logout', { method: 'POST' }),
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

// ─── AI ──────────────────────────────────────────────
export const ai = {
  chat: (messages) =>
    request('/ai/chat', {
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
