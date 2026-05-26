/* ui.js — Toast notifications, modals, nav, skeletons */

// ===== TOAST =====
let toastTimer;

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  const dismiss = () => {
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
    setTimeout(() => toast.remove(), 400); // safety
  };

  toast.addEventListener('click', dismiss);

  setTimeout(dismiss, 3200);
}

// ===== MODALS =====
function showModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Focus first input
  setTimeout(() => {
    const firstInput = modal.querySelector('input:not([type="hidden"])');
    if (firstInput) firstInput.focus();
  }, 100);
}

function hideModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

function hideAllModals() {
  document.querySelectorAll('.modal-overlay').forEach((m) => {
    m.classList.add('hidden');
  });
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    hideAllModals();
  }
});

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideAllModals();
});

// ===== NAV STATE =====
function updateNav(isAuthenticated, user = null) {
  const guestNav = document.getElementById('nav-guest');
  const authNav = document.getElementById('nav-auth');
  const newPostFeedBtn = document.getElementById('btn-new-post-feed');

  if (isAuthenticated && user) {
    guestNav.classList.add('hidden');
    authNav.classList.remove('hidden');
    if (newPostFeedBtn) newPostFeedBtn.classList.remove('hidden');

    // Update avatar
    const letter = document.getElementById('nav-avatar-letter');
    if (letter) letter.textContent = user.username.charAt(0).toUpperCase();

    // Update dropdown
    const uname = document.getElementById('nav-dropdown-username');
    const email = document.getElementById('nav-dropdown-email');
    if (uname) uname.textContent = user.username;
    if (email) email.textContent = user.email;
  } else {
    guestNav.classList.remove('hidden');
    authNav.classList.add('hidden');
    if (newPostFeedBtn) newPostFeedBtn.classList.add('hidden');
  }
}

// ===== USER DROPDOWN =====
const avatarBtn = document.getElementById('nav-avatar-btn');
const dropdown = document.getElementById('nav-dropdown');

if (avatarBtn && dropdown) {
  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
  });
}

// ===== SKELETON LOADERS =====
function renderSkeletons(container, count = 3) {
  container.innerHTML = Array.from({ length: count }, () => `
    <div class="skeleton">
      <div class="skeleton-line lg"></div>
      <div class="skeleton-line md" style="margin-top:8px;"></div>
      <div class="skeleton-line full" style="margin-top:16px;"></div>
      <div class="skeleton-line w-80"></div>
      <div class="skeleton-line w-60"></div>
    </div>
  `).join('');
}

// ===== VIEWS =====
function showView(viewId) {
  document.querySelectorAll('.view').forEach((v) => v.classList.add('hidden'));
  const view = document.getElementById(viewId);
  if (view) {
    view.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ===== PASSWORD STRENGTH =====
function updatePasswordStrength(password) {
  const fill = document.getElementById('strength-fill');
  const label = document.getElementById('strength-label');
  if (!fill || !label) return;

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { pct: '0%', cls: '', text: 'Enter a password' },
    { pct: '25%', cls: 'weak', text: 'Weak' },
    { pct: '50%', cls: 'fair', text: 'Fair' },
    { pct: '75%', cls: 'good', text: 'Good' },
    { pct: '100%', cls: 'strong', text: 'Strong' },
  ];

  const level = levels[Math.min(score, 4)];
  fill.style.width = level.pct;
  fill.className = `strength-fill ${level.cls}`;
  label.textContent = level.text;
  label.style.color = level.cls === 'strong' ? 'var(--success)'
    : level.cls === 'good' ? 'var(--accent)'
    : level.cls === 'fair' ? 'var(--warning)'
    : level.cls === 'weak' ? 'var(--danger)'
    : 'var(--text-muted)';
}

// ===== NAV SCROLL =====
window.addEventListener('scroll', () => {
  const header = document.getElementById('nav-header');
  if (header) {
    header.classList.toggle('scrolled', window.scrollY > 10);
  }
});

// ===== PASSWORD VISIBILITY TOGGLE =====
function setupPasswordToggle(btnId, inputId) {
  const btn = document.getElementById(btnId);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.textContent = isPassword ? '🙈' : '👁';
  });
}

// ===== MOBILE NAV =====
const mobileToggle = document.getElementById('nav-mobile-toggle');
const navLinks = document.getElementById('nav-links');

if (mobileToggle && navLinks) {
  mobileToggle.addEventListener('click', () => {
    navLinks.classList.toggle('mobile-open');
  });

  // Close on nav link click
  navLinks.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' || e.target.classList.contains('btn')) {
      navLinks.classList.remove('mobile-open');
    }
  });
}

// ===== DATE FORMATTING =====
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatRelativeDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

// ===== READING TIME =====
function readingTime(content) {
  const words = content.trim().split(/\s+/).length;
  const mins = Math.ceil(words / 200);
  return `${mins} min read`;
}

// Expose
window.showToast = showToast;
window.showModal = showModal;
window.hideModal = hideModal;
window.hideAllModals = hideAllModals;
window.updateNav = updateNav;
window.renderSkeletons = renderSkeletons;
window.showView = showView;
window.updatePasswordStrength = updatePasswordStrength;
window.setupPasswordToggle = setupPasswordToggle;
window.formatDate = formatDate;
window.formatRelativeDate = formatRelativeDate;
window.readingTime = readingTime;
