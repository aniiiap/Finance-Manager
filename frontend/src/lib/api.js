/**
 * Empty / unset VITE_API_URL => same-origin `/api` (Vite proxy in dev, Express static in prod).
 * Set VITE_API_URL only when frontend and API are on different hosts.
 */
const raw = import.meta.env.VITE_API_URL;
export const API_BASE_URL =
  raw === undefined || raw === null || String(raw).trim() === ''
    ? ''
    : String(raw).replace(/\/$/, '');

let onUnauthorized = null;

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...(options.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...options.headers,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    if (typeof onUnauthorized === 'function') onUnauthorized();
  }

  return res;
}
