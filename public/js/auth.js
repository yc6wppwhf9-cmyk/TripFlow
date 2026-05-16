function checkAuth() {
  const token = localStorage.getItem('tripflow_token');
  const user = JSON.parse(localStorage.getItem('tripflow_user'));
  
  if (!token || !user) {
    if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
      window.location.href = '/index.html';
    }
    return null;
  }

  // Role based redirection
  const rolePages = {
    'EMPLOYEE': '/employee.html',
    'MANAGER': '/manager.html',
    'VENDOR': '/vendor.html',
    'ADMIN': '/admin.html'
  };

  if (window.location.pathname === '/index.html' || window.location.pathname === '/') {
    window.location.href = rolePages[user.role];
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
