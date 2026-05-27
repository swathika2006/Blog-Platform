/* auth.js — Authentication logic */

const TOKEN_KEY = 'blog_token';
const USER_KEY = 'blog_user';

// ===== STORAGE HELPERS =====
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function isAuthenticated() {
  return !!getToken();
}

function storeAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ===== CLIENT-SIDE VALIDATION =====
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function setFieldError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) input.classList.toggle('error', !!message);
  if (error) error.textContent = message || '';
}

function clearFormErrors(...errorIds) {
  errorIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
  // Also clear input error classes
  document.querySelectorAll('.form-input.error').forEach((el) => el.classList.remove('error'));
}

// ===== LOGIN =====
async function handleLogin(e) {
  e.preventDefault();
  clearFormErrors('login-email-error', 'login-password-error');
  const banner = document.getElementById('login-error-banner');
  banner.classList.add('hidden');

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  let valid = true;
  if (!validateEmail(email)) {
    setFieldError('login-email', 'login-email-error', 'Please enter a valid email address.');
    valid = false;
  }
  if (password.length < 1) {
    setFieldError('login-password', 'login-password-error', 'Password is required.');
    valid = false;
  }
  if (!valid) return;

  // Show spinner
  const submitBtn = document.getElementById('btn-login-submit');
  const label = document.getElementById('login-submit-label');
  const spinner = document.getElementById('login-spinner');
  submitBtn.disabled = true;
  label.textContent = 'Signing in...';
  spinner.classList.remove('hidden');

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    storeAuth(data.token, data.user);
    hideAllModals();
    updateNav(true, data.user);
    showToast(`Welcome back, ${data.user.username}! 👋`, 'success');

    // Clear form
    document.getElementById('form-login').reset();

    // Emit auth event
    window.dispatchEvent(new CustomEvent('auth:login', { detail: data.user }));
  } catch (err) {
    banner.textContent = err.message || 'Login failed. Please try again.';
    banner.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    label.textContent = 'Sign In';
    spinner.classList.add('hidden');
  }
}

// ===== REGISTER =====
async function handleRegister(e) {
  e.preventDefault();
  clearFormErrors('reg-username-error', 'reg-email-error', 'reg-password-error');
  const banner = document.getElementById('register-error-banner');
  banner.classList.add('hidden');

  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  let valid = true;
  if (username.length < 3 || username.length > 30) {
    setFieldError('reg-username', 'reg-username-error', 'Username must be 3–30 characters.');
    valid = false;
  }
  if (!validateEmail(email)) {
    setFieldError('reg-email', 'reg-email-error', 'Please enter a valid email address.');
    valid = false;
  }
  if (password.length < 8) {
    setFieldError('reg-password', 'reg-password-error', 'Password must be at least 8 characters.');
    valid = false;
  }
  if (!valid) return;

  const submitBtn = document.getElementById('btn-register-submit');
  const label = document.getElementById('register-submit-label');
  const spinner = document.getElementById('register-spinner');
  submitBtn.disabled = true;
  label.textContent = 'Creating account...';
  spinner.classList.remove('hidden');

  try {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });

    storeAuth(data.token, data.user);
    hideAllModals();
    updateNav(true, data.user);
    showToast(`Account created! Welcome to DevLog, ${data.user.username}! 🎉`, 'success');

    document.getElementById('form-register').reset();
    window.dispatchEvent(new CustomEvent('auth:login', { detail: data.user }));
  } catch (err) {
    banner.textContent = err.message || 'Registration failed. Please try again.';
    banner.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    label.textContent = 'Create Account';
    spinner.classList.add('hidden');
  }
}

// ===== LOGOUT =====
function handleLogout() {
  const user = getUser();
  clearAuth();
  updateNav(false);
  showView('view-feed');
  showToast('You have been signed out. See you soon! 👋', 'info');
  window.dispatchEvent(new Event('auth:logout'));

  // Navigate to feed and reload posts
  window.location.hash = '#feed';
}

// ===== SETUP =====
function setupAuth() {
  // Form submissions
  document.getElementById('form-login').addEventListener('submit', handleLogin);
  document.getElementById('form-register').addEventListener('submit', handleRegister);

  // Modal open/close buttons
  document.getElementById('btn-open-login').addEventListener('click', () => showModal('modal-login'));
  document.getElementById('btn-open-register').addEventListener('click', () => showModal('modal-register'));
  document.getElementById('btn-close-login').addEventListener('click', () => hideModal('modal-login'));
  document.getElementById('btn-close-register').addEventListener('click', () => hideModal('modal-register'));

  // Switch between modals
  document.getElementById('btn-switch-to-register').addEventListener('click', () => {
    hideModal('modal-login');
    showModal('modal-register');
  });
  document.getElementById('btn-switch-to-login').addEventListener('click', () => {
    hideModal('modal-register');
    showModal('modal-login');
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', handleLogout);
  document.getElementById('btn-dashboard-dropdown').addEventListener('click', () => {
    dropdown?.classList.remove('open');
    window.location.hash = '#dashboard';
  });

  // Password toggles
  setupPasswordToggle('toggle-login-pw', 'login-password');
  setupPasswordToggle('toggle-reg-pw', 'reg-password');

  // Password strength
  document.getElementById('reg-password').addEventListener('input', (e) => {
    updatePasswordStrength(e.target.value);
  });

  // Restore session on load
  const user = getUser();
  if (user && getToken()) {
    updateNav(true, user);
  }
}

// Expose
window.isAuthenticated = isAuthenticated;
window.getUser = getUser;
window.getToken = getToken;
window.handleLogout = handleLogout;
window.setupAuth = setupAuth;
