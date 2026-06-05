const API_URL = '/api';

/* ── Mobile nav hamburger ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links  = document.querySelector('.nav-links');
  if (!toggle || !links) return;
  const close = () => { links.classList.remove('open'); toggle.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
  const open  = () => { links.classList.add('open');    toggle.classList.add('open');    toggle.setAttribute('aria-expanded', 'true'); };
  toggle.addEventListener('click', () => links.classList.contains('open') ? close() : open());
  links.addEventListener('click', e => { if (e.target.closest('a')) close(); });
  document.addEventListener('click', e => { if (!toggle.contains(e.target) && !links.contains(e.target)) close(); });
});

/* ── Toast notification ──────────────────────────────────── */
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  const text = document.createElement('span');
  text.textContent = message;
  toast.append(icon, text);
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 320);
  }, duration);
}

/* ── Skeleton table rows ─────────────────────────────────── */
function showTableSkeleton(tbodyId, cols, rows = 5) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = Array(rows).fill(0).map(() =>
    `<tr>${Array(cols).fill(0).map(() =>
      `<td><div class="skeleton" style="height:14px;"></div></td>`).join('')}</tr>`
  ).join('');
}

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('tripflow_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  } else if (config.body instanceof FormData) {
    // Let the browser set the content type for multipart/form-data
    delete headers['Content-Type'];
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('tripflow_token');
      window.location.href = '/index.html';
    }
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}
