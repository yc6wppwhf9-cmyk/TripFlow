async function login(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Login failed');
  localStorage.setItem('tripflow_token', data.token);
  localStorage.setItem('tripflow_user', JSON.stringify(data.user));
  return data.user;
}

function checkAuth() {
  const token = localStorage.getItem('tripflow_token');
  const user  = JSON.parse(localStorage.getItem('tripflow_user'));

  const roleHome = {
    EMPLOYEE: '/employee.html',
    MANAGER:  '/manager.html',
    VENDOR:   '/vendor.html',
    ADMIN:    '/admin.html',
    HR:       '/hr.html'
  };

  if (!token || !user) {
    const path = window.location.pathname;
    if (path !== '/index.html' && path !== '/') {
      window.location.href = '/index.html';
    }
    return null;
  }

  const path = window.location.pathname;

  // Redirect already-logged-in users away from the login page
  if (path === '/index.html' || path === '/') {
    window.location.href = roleHome[user.role] || '/employee.html';
    return user;
  }

  // Page access control — maps each page to the roles that may view it
  const pageAccess = {
    '/employee.html': ['EMPLOYEE', 'MANAGER', 'ADMIN'],
    '/manager.html':  ['MANAGER', 'ADMIN'],
    '/hr.html':       ['HR', 'ADMIN'],
    '/admin.html':    ['ADMIN'],
    '/vendor.html':   ['VENDOR', 'ADMIN'],
    '/request.html':  ['EMPLOYEE', 'MANAGER', 'ADMIN'],
    '/detail.html':   ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN', 'VENDOR'],
  };

  const allowed = pageAccess[path];
  if (allowed && !allowed.includes(user.role)) {
    // User is on a page they don't have access to — send them home
    window.location.href = roleHome[user.role] || '/employee.html';
    return null;
  }

  return user;
}

function logout() {
  localStorage.removeItem('tripflow_token');
  localStorage.removeItem('tripflow_user');
  window.location.href = '/index.html';
}

function updateUserInfo() {
  const user = JSON.parse(localStorage.getItem('tripflow_user'));
  if (user) {
    const userNameEl = document.getElementById('user-name');
    if (userNameEl) userNameEl.textContent = user.name;
    const userRoleEl = document.getElementById('user-role');
    if (userRoleEl) userRoleEl.textContent = user.role;
  }
}
