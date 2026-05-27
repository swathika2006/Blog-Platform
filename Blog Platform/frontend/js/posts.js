/* posts.js — Post feed, single post view, dashboard CRUD */

let currentPage = 1;
let totalPages = 1;
let pendingDeleteId = null;
let editingPostId = null;

// ===== FEED =====
async function renderFeed(page = 1) {
  currentPage = page;
  showView('view-feed');

  const list = document.getElementById('posts-list');
  const emptyState = document.getElementById('feed-empty');
  const pagination = document.getElementById('feed-pagination');

  renderSkeletons(list, 4);
  emptyState.classList.add('hidden');
  pagination.classList.add('hidden');

  try {
    const data = await apiFetch(`/posts?page=${page}&limit=8`);
    const posts = data.posts || [];
    totalPages = data.pagination?.totalPages || 1;

    if (posts.length === 0) {
      list.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    list.innerHTML = posts.map(renderPostCard).join('');

    // Bind card clicks
    list.querySelectorAll('.post-card').forEach((card) => {
      card.addEventListener('click', () => {
        const slug = card.dataset.slug;
        if (slug) window.location.hash = `#post/${slug}`;
      });
    });

    // Pagination
    if (totalPages > 1) {
      pagination.classList.remove('hidden');
      document.getElementById('page-indicator').textContent = `Page ${currentPage} of ${totalPages}`;
      document.getElementById('btn-prev-page').disabled = currentPage <= 1;
      document.getElementById('btn-next-page').disabled = currentPage >= totalPages;
    }
  } catch (err) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Failed to load posts</h3>
        <p>${err.message || 'Please make sure the server is running.'}</p>
        <button class="btn btn-primary" onclick="renderFeed()">Try Again</button>
      </div>
    `;
  }
}

function renderPostCard(post) {
  const snippet = post.content.slice(0, 160).trim() + (post.content.length > 160 ? '...' : '');
  const letter = post.user.username.charAt(0).toUpperCase();
  const commentCount = post._count?.comments ?? 0;

  return `
    <article class="post-card" data-slug="${post.slug}" data-id="${post.id}" tabindex="0" role="button"
      aria-label="Read post: ${escapeHtml(post.title)}">
      <div class="post-card-header">
        <h2 class="post-card-title">${escapeHtml(post.title)}</h2>
      </div>
      <div class="post-card-meta">
        <span class="post-card-author">
          <span class="mini-avatar">${letter}</span>
          ${escapeHtml(post.user.username)}
        </span>
        <span class="post-card-meta-divider">·</span>
        <span>${formatDate(post.createdAt)}</span>
        <span class="post-card-meta-divider">·</span>
        <span>${readingTime(post.content)}</span>
      </div>
      <p class="post-card-snippet">${escapeHtml(snippet)}</p>
      <div class="post-card-footer">
        <div class="post-card-stats">
          <span class="post-card-stat">💬 ${commentCount} comment${commentCount !== 1 ? 's' : ''}</span>
        </div>
        <span class="post-card-read-more">Read more →</span>
      </div>
    </article>
  `;
}

// ===== SINGLE POST VIEW =====
async function renderPost(slug) {
  showView('view-post');

  const container = document.getElementById('post-container');
  const commentsSection = document.getElementById('comments-section');

  container.innerHTML = `
    <div class="skeleton" style="padding:24px 0">
      <div class="skeleton-line lg" style="height:32px;width:80%"></div>
      <div class="skeleton-line md" style="margin-top:16px"></div>
      <div class="skeleton-line full" style="margin-top:32px"></div>
      <div class="skeleton-line full"></div>
      <div class="skeleton-line w-80"></div>
    </div>
  `;
  commentsSection.innerHTML = '';

  try {
    const data = await apiFetch(`/posts/${slug}`);
    const post = data.post;
    const currentUser = getUser();
    const isAuthor = currentUser && currentUser.id === post.user.id;
    const letter = post.user.username.charAt(0).toUpperCase();

    container.innerHTML = `
      <button class="post-back-btn" id="post-back-btn">← Back to Feed</button>
      <article>
        <header class="post-header">
          <span class="post-category-badge">Article</span>
          <h1 class="post-full-title">${escapeHtml(post.title)}</h1>
          <div class="post-full-meta">
            <div class="post-author-info">
              <div class="post-author-avatar">${letter}</div>
              <div>
                <div class="post-author-name">${escapeHtml(post.user.username)}</div>
                <div class="post-date">${formatDate(post.createdAt)}${post.updatedAt !== post.createdAt ? ' · Updated ' + formatRelativeDate(post.updatedAt) : ''}</div>
              </div>
            </div>
            <div class="post-meta-right">
              <span style="font-size:0.82rem;color:var(--text-muted)">${readingTime(post.content)}</span>
              ${isAuthor ? `
                <div class="post-action-btns">
                  <button class="btn btn-ghost btn-sm" id="btn-edit-post" data-id="${post.id}">Edit</button>
                  <button class="btn btn-danger btn-sm" id="btn-delete-post" data-id="${post.id}">Delete</button>
                </div>
              ` : ''}
            </div>
          </div>
        </header>
        <div class="post-body" id="post-body-content">${renderPostContent(post.content)}</div>
      </article>
    `;

    // Back button
    document.getElementById('post-back-btn').addEventListener('click', () => {
      window.location.hash = '#feed';
    });

    // Edit/delete buttons
    if (isAuthor) {
      document.getElementById('btn-edit-post').addEventListener('click', () => {
        window.location.hash = '#dashboard';
        setTimeout(() => openEditor(post), 200);
      });

      document.getElementById('btn-delete-post').addEventListener('click', () => {
        pendingDeleteId = post.id;
        document.getElementById('confirm-delete-subtitle').textContent =
          `"${post.title}" will be permanently deleted.`;
        showModal('modal-confirm-delete');
      });
    }

    // Render comments
    renderComments(post.id);
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">😕</div>
        <h3>Post not found</h3>
        <p>${err.message}</p>
        <button class="btn btn-primary" onclick="window.location.hash='#feed'">Go Home</button>
      </div>
    `;
  }
}

function renderPostContent(content) {
  // Simple paragraph splitting for readable output
  return content
    .split(/\n\n+/)
    .map((para) => `<p>${escapeHtml(para.trim())}</p>`)
    .join('');
}

// ===== DASHBOARD =====
async function renderDashboard() {
  const user = getUser();
  if (!user) {
    showModal('modal-login');
    showView('view-feed');
    return;
  }

  showView('view-dashboard');

  const welcome = document.getElementById('dashboard-welcome');
  if (welcome) welcome.textContent = `Manage your posts, ${user.username}.`;

  await loadUserPosts(user.id);
}

async function loadUserPosts(userId) {
  const list = document.getElementById('dashboard-posts-list');
  const emptyState = document.getElementById('dashboard-empty');

  renderSkeletons(list, 3);
  emptyState.classList.add('hidden');

  try {
    const data = await apiFetch(`/posts/user/${userId}`);
    const posts = data.posts || [];

    if (posts.length === 0) {
      list.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    list.innerHTML = posts.map(renderDashboardPostItem).join('');
    bindDashboardPostActions();
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><p>Failed to load your posts.</p></div>`;
  }
}

function renderDashboardPostItem(post) {
  const commentCount = post._count?.comments ?? 0;
  return `
    <div class="dashboard-post-item" data-id="${post.id}" data-slug="${post.slug}">
      <div class="dashboard-post-info">
        <div class="dashboard-post-title" data-action="view" data-slug="${post.slug}">
          ${escapeHtml(post.title)}
        </div>
        <div class="dashboard-post-meta">
          <span>${formatDate(post.createdAt)}</span>
          <span>💬 ${commentCount}</span>
          <span>${readingTime(post.content)}</span>
        </div>
      </div>
      <div class="dashboard-post-actions">
        <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${post.id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-action="delete" data-id="${post.id}" data-title="${escapeHtml(post.title)}">Delete</button>
      </div>
    </div>
  `;
}

function bindDashboardPostActions() {
  const list = document.getElementById('dashboard-posts-list');

  list.querySelectorAll('[data-action="view"]').forEach((el) => {
    el.addEventListener('click', () => {
      window.location.hash = `#post/${el.dataset.slug}`;
    });
  });

  list.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const postId = btn.dataset.id;
      // Fetch full post to populate editor
      try {
        const data = await apiFetch(`/posts/${btn.closest('.dashboard-post-item').dataset.slug}`);
        openEditor(data.post);
      } catch {
        showToast('Failed to load post for editing.', 'error');
      }
    });
  });

  list.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      pendingDeleteId = btn.dataset.id;
      document.getElementById('confirm-delete-subtitle').textContent =
        `"${btn.dataset.title}" will be permanently deleted.`;
      showModal('modal-confirm-delete');
    });
  });
}

// ===== EDITOR =====
function openEditor(post = null) {
  editingPostId = post ? post.id : null;
  const card = document.getElementById('editor-card');
  const title = document.getElementById('editor-title');
  const submitLabel = document.getElementById('submit-post-label');
  const titleInput = document.getElementById('post-title-input');
  const contentInput = document.getElementById('post-content-input');

  if (post) {
    title.textContent = 'Edit Post';
    submitLabel.textContent = 'Save Changes';
    titleInput.value = post.title;
    contentInput.value = post.content;
  } else {
    title.textContent = 'New Post';
    submitLabel.textContent = 'Publish Post';
    titleInput.value = '';
    contentInput.value = '';
  }

  // Clear errors
  document.getElementById('post-title-error').textContent = '';
  document.getElementById('post-content-error').textContent = '';

  card.classList.remove('hidden');
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => titleInput.focus(), 100);
}

function closeEditor() {
  editingPostId = null;
  document.getElementById('editor-card').classList.add('hidden');
  document.getElementById('editor-form').reset();
}

async function handleEditorSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('post-title-input').value.trim();
  const content = document.getElementById('post-content-input').value.trim();

  let valid = true;
  document.getElementById('post-title-error').textContent = '';
  document.getElementById('post-content-error').textContent = '';

  if (title.length < 5) {
    document.getElementById('post-title-error').textContent = 'Title must be at least 5 characters.';
    valid = false;
  }
  if (content.length < 20) {
    document.getElementById('post-content-error').textContent = 'Content must be at least 20 characters.';
    valid = false;
  }
  if (!valid) return;

  const submitBtn = document.getElementById('btn-submit-post');
  const spinner = document.getElementById('submit-post-spinner');
  const label = document.getElementById('submit-post-label');

  submitBtn.disabled = true;
  spinner.classList.remove('hidden');

  try {
    let data;
    if (editingPostId) {
      data = await apiFetch(`/posts/${editingPostId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, content }),
      });
      showToast('Post updated successfully! ✏️', 'success');
    } else {
      data = await apiFetch('/posts', {
        method: 'POST',
        body: JSON.stringify({ title, content }),
      });
      showToast('Post published! 🚀', 'success');
    }

    closeEditor();
    await loadUserPosts(getUser().id);

    // If post was just created, optionally navigate to it
    if (!editingPostId && data.post?.slug) {
      setTimeout(() => {
        if (confirm('Post published! View it now?')) {
          window.location.hash = `#post/${data.post.slug}`;
        }
      }, 300);
    }
  } catch (err) {
    showToast(err.message || 'Failed to save post.', 'error');
  } finally {
    submitBtn.disabled = false;
    spinner.classList.add('hidden');
  }
}

async function handleConfirmDelete() {
  if (!pendingDeleteId) return;

  const deleteBtn = document.getElementById('btn-confirm-delete');
  const label = document.getElementById('delete-label');
  const spinner = document.getElementById('delete-spinner');

  deleteBtn.disabled = true;
  label.textContent = 'Deleting...';
  spinner.classList.remove('hidden');

  try {
    await apiFetch(`/posts/${pendingDeleteId}`, { method: 'DELETE' });
    hideModal('modal-confirm-delete');
    showToast('Post deleted.', 'info');

    // Remove from dashboard list if visible
    const item = document.querySelector(`[data-id="${pendingDeleteId}"]`);
    if (item) {
      item.style.opacity = '0';
      item.style.transform = 'translateX(-10px)';
      item.style.transition = 'all 0.2s ease';
      setTimeout(() => item.remove(), 200);
    }

    // If we're viewing a post, go back to feed
    if (!document.getElementById('view-dashboard').classList.contains('hidden')) {
      await loadUserPosts(getUser().id);
    } else {
      window.location.hash = '#feed';
    }

    pendingDeleteId = null;
  } catch (err) {
    showToast(err.message || 'Failed to delete post.', 'error');
  } finally {
    deleteBtn.disabled = false;
    label.textContent = 'Delete Post';
    spinner.classList.add('hidden');
  }
}

// ===== SETUP =====
function setupPosts() {
  // Dashboard "New Post" button
  document.getElementById('btn-new-post').addEventListener('click', () => openEditor());
  document.getElementById('btn-new-post-feed').addEventListener('click', () => {
    window.location.hash = '#dashboard';
    setTimeout(() => openEditor(), 200);
  });
  document.getElementById('btn-empty-write')?.addEventListener('click', () => {
    window.location.hash = '#dashboard';
  });

  // Editor close/cancel
  document.getElementById('btn-close-editor').addEventListener('click', closeEditor);
  document.getElementById('btn-cancel-editor').addEventListener('click', closeEditor);

  // Editor form submit
  document.getElementById('editor-form').addEventListener('submit', handleEditorSubmit);

  // Confirm delete modal
  document.getElementById('btn-confirm-delete').addEventListener('click', handleConfirmDelete);
  document.getElementById('btn-cancel-delete').addEventListener('click', () => {
    hideModal('modal-confirm-delete');
    pendingDeleteId = null;
  });

  // Pagination
  document.getElementById('btn-prev-page').addEventListener('click', () => {
    if (currentPage > 1) renderFeed(currentPage - 1);
  });
  document.getElementById('btn-next-page').addEventListener('click', () => {
    if (currentPage < totalPages) renderFeed(currentPage + 1);
  });

  // Re-render dashboard after login/logout
  window.addEventListener('auth:login', () => {
    if (!document.getElementById('view-dashboard').classList.contains('hidden')) {
      renderDashboard();
    }
  });
  window.addEventListener('auth:logout', () => {
    renderFeed();
  });
}

// Expose
window.renderFeed = renderFeed;
window.renderPost = renderPost;
window.renderDashboard = renderDashboard;
window.openEditor = openEditor;
window.setupPosts = setupPosts;
