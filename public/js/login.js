checkAuth();

/* ── Tab switching ── */
function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-register').classList.toggle('active', !isLogin);
  document.getElementById('tab-login').setAttribute('aria-selected', String(isLogin));
  document.getElementById('tab-register').setAttribute('aria-selected', String(!isLogin));
  document.getElementById('section-login').classList.toggle('active', isLogin);
  document.getElementById('section-register').classList.toggle('active', !isLogin);
}

/* ── Forgot password ── */
document.getElementById('forgot-pw-link').addEventListener('click', e => {
  e.preventDefault();
  showMsg('login-msg', 'Contact your HR Travel administrator to reset your password.', 'info');
});

/* ── Toggle password visibility (login) ── */
const toggleBtn = document.getElementById('toggle-pw');
const pwField   = document.getElementById('password');
const pwIcon    = toggleBtn.querySelector('.material-symbols-outlined');
toggleBtn.addEventListener('click', () => {
  const hidden = pwField.type === 'password';
  pwField.type       = hidden ? 'text' : 'password';
  pwIcon.textContent = hidden ? 'visibility_off' : 'visibility';
});

/* ── Toggle password visibility (register) ── */
const toggleRegBtn  = document.getElementById('toggle-reg-pw');
const regPwField    = document.getElementById('reg-password');
const regPwIcon     = toggleRegBtn.querySelector('.material-symbols-outlined');
toggleRegBtn.addEventListener('click', () => {
  const hidden = regPwField.type === 'password';
  regPwField.type    = hidden ? 'text' : 'password';
  regPwIcon.textContent = hidden ? 'visibility_off' : 'visibility';
});

/* ── Message helper ── */
function showMsg(id, text, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'block';
  const styles = {
    error: { bg: '#ffebee', color: '#c62828' },
    success: { bg: '#e8f5e9', color: '#2e7d32' },
    info:  { bg: '#e3f2fd', color: '#0d47a1' }
  };
  const s = styles[type] || styles.info;
  el.style.background = s.bg;
  el.style.color      = s.color;
  el.textContent      = text;
}

function hideMsg(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

/* ── Sign In ── */
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn      = document.getElementById('sign-in-btn');

  hideMsg('login-msg');
  btn.disabled  = true;
  btn.innerHTML = '<span class="material-symbols-outlined spinning">progress_activity</span> Signing in...';

  try {
    const user = await login(email, password);
    const routes = {
      ADMIN: 'admin.html', MANAGER: 'manager.html',
      VENDOR: 'vendor.html', HR: 'hr.html', EMPLOYEE: 'employee.html'
    };
    window.location.href = routes[user.role] || 'employee.html';
  } catch (err) {
    showMsg('login-msg', err.message || 'Invalid credentials. Please try again.', 'error');
    btn.disabled  = false;
    btn.innerHTML = '<span class="material-symbols-outlined">login</span> Sign In';
  }
});

/* ── Register ── */
document.getElementById('register-form').addEventListener('submit', async e => {
  e.preventDefault();
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const phone    = document.getElementById('reg-phone').value.trim();
  const dept     = document.getElementById('reg-dept').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;
  const btn      = document.getElementById('register-btn');

  hideMsg('register-msg');

  if (password !== confirm) {
    showMsg('register-msg', 'Passwords do not match.', 'error');
    return;
  }
  if (password.length < 8) {
    showMsg('register-msg', 'Password must be at least 8 characters.', 'error');
    return;
  }

  btn.disabled  = true;
  btn.innerHTML = '<span class="material-symbols-outlined spinning">progress_activity</span> Creating account...';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone: phone || undefined, department: dept || 'General' })
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('API server is not running. Start the app with npm run dev and open http://localhost:3000.');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    showMsg('register-msg', 'Account created! You can now sign in.', 'success');
    document.getElementById('register-form').reset();

    setTimeout(() => {
      switchTab('login');
      document.getElementById('email').value = email;
      hideMsg('register-msg');
    }, 1800);

  } catch (err) {
    showMsg('register-msg', err.message || 'Registration failed. Please try again.', 'error');
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<span class="material-symbols-outlined">person_add</span> Create Account';
  }
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
