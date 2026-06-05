checkAuth();

document.getElementById('forgot-pw-link').addEventListener('click', e => {
  e.preventDefault();
  const box = document.getElementById('error-msg');
  box.style.display    = 'block';
  box.style.background = '#e3f2fd';
  box.style.color      = '#0d47a1';
  box.textContent      = 'Contact your HR Travel administrator to reset your password.';
});

const toggleBtn = document.getElementById('toggle-pw');
const pwField   = document.getElementById('password');
const pwIcon    = toggleBtn.querySelector('.material-symbols-outlined');
toggleBtn.addEventListener('click', () => {
  const hidden = pwField.type === 'password';
  pwField.type     = hidden ? 'text' : 'password';
  pwIcon.textContent = hidden ? 'visibility_off' : 'visibility';
});

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const box      = document.getElementById('error-msg');
  const btn      = document.getElementById('sign-in-btn');

  box.style.display = 'none';
  btn.disabled  = true;
  btn.innerHTML = '<span class="material-symbols-outlined spinning">progress_activity</span> Signing in…';

  try {
    const data = await login(email, password);
    const routes = {
      ADMIN: 'admin.html', MANAGER: 'manager.html',
      VENDOR: 'vendor.html', HR: 'hr.html', EMPLOYEE: 'employee.html'
    };
    window.location.href = routes[data.role] || 'employee.html';
  } catch (err) {
    box.style.display    = 'block';
    box.style.background = '#ffebee';
    box.style.color      = '#c62828';
    box.textContent      = err.message || 'Invalid credentials. Please try again.';
    btn.disabled  = false;
    btn.innerHTML = '<span class="material-symbols-outlined">login</span> Sign In';
  }
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
