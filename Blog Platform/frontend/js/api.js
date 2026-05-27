/* api.js — Centralized fetch wrapper */
const IS_PROD = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const API_BASE = IS_PROD
  ? 'https://blog-platform-pool.onrender.com/api'
  : 'http://localhost:3001/api';

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('blog_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, config);

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const error = new Error(data.error || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

window.apiFetch = apiFetch;
