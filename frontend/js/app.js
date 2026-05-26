/* app.js — Hash router + application initialization */

// ===== HASH ROUTER =====
function parseRoute(hash) {
  const h = hash.replace(/^#\/?/, '');
  if (!h || h === 'feed') return { view: 'feed', param: null };
  const postMatch = h.match(/^post\/(.+)$/);
  if (postMatch) return { view: 'post', param: postMatch[1] };
  if (h === 'dashboard') return { view: 'dashboard', param: null };
  return { view: 'feed', param: null };
}

async function navigate(hash) {
  const { view, param } = parseRoute(hash);

  switch (view) {
    case 'feed':
      renderFeed(1);
      break;
    case 'post':
      if (param) renderPost(param);
      else renderFeed(1);
      break;
    case 'dashboard':
      if (isAuthenticated()) {
        renderDashboard();
      } else {
        showModal('modal-login');
        window.location.hash = '#feed';
      }
      break;
    default:
      renderFeed(1);
  }
}

// ===== INIT =====
function init() {
  // Setup all modules
  setupAuth();
  setupPosts();

  // Nav links
  document.getElementById('nav-home-link').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = '#feed';
  });

  document.getElementById('nav-feed-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = '#feed';
  });

  document.getElementById('nav-dashboard-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = '#dashboard';
  });

  document.getElementById('nav-logo').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = '#feed';
  });

  // Hash change listener
  window.addEventListener('hashchange', () => {
    navigate(window.location.hash);
  });

  // Initial route
  navigate(window.location.hash || '#feed');
}

// Boot on DOM ready
document.addEventListener('DOMContentLoaded', init);
