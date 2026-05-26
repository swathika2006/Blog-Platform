/* comments.js — Comment rendering and submission */

let currentPostId = null;

function renderCommentItem(comment) {
  const currentUser = getUser();
  const isOwner = currentUser && currentUser.id === comment.user.id;
  const letter = comment.user.username.charAt(0).toUpperCase();

  return `
    <div class="comment-item" id="comment-${comment.id}">
      <div class="comment-header">
        <div class="comment-author-info">
          <div class="comment-avatar">${letter}</div>
          <span class="comment-author-name">${escapeHtml(comment.user.username)}</span>
          <span class="comment-date">${formatRelativeDate(comment.createdAt)}</span>
        </div>
        ${isOwner ? `<button class="comment-delete-btn" data-id="${comment.id}" title="Delete comment">✕</button>` : ''}
      </div>
      <div class="comment-body">${escapeHtml(comment.content)}</div>
    </div>
  `;
}

async function renderComments(postId) {
  currentPostId = postId;
  const section = document.getElementById('comments-section');

  section.innerHTML = `
    <div class="comments-header">
      <h2 class="comments-title">Discussion</h2>
      <span class="comments-count-badge" id="comments-count">Loading...</span>
    </div>
    <div id="comment-form-area"></div>
    <div class="comments-list" id="comments-list">
      <div class="skeleton" style="padding:16px">
        <div class="skeleton-line md"></div>
        <div class="skeleton-line full" style="margin-top:8px"></div>
      </div>
    </div>
  `;

  // Render form area
  renderCommentFormArea(postId);

  try {
    const data = await apiFetch(`/comments/${postId}`);
    const comments = data.comments || [];

    const countBadge = document.getElementById('comments-count');
    if (countBadge) countBadge.textContent = `${comments.length}`;

    const list = document.getElementById('comments-list');
    if (!list) return;

    if (comments.length === 0) {
      list.innerHTML = `<div class="comments-empty">
        <span style="font-size:1.5rem">💬</span>
        <p style="margin-top:8px">No comments yet. Start the discussion!</p>
      </div>`;
    } else {
      list.innerHTML = comments.map(renderCommentItem).join('');
      bindCommentDeleteBtns(list);
    }
  } catch (err) {
    const list = document.getElementById('comments-list');
    if (list) list.innerHTML = `<div class="comments-empty">Failed to load comments.</div>`;
  }
}

function renderCommentFormArea(postId) {
  const area = document.getElementById('comment-form-area');
  if (!area) return;

  if (isAuthenticated()) {
    const user = getUser();
    const letter = user.username.charAt(0).toUpperCase();

    area.innerHTML = `
      <div class="comment-form-wrapper">
        <div class="comment-form-header">
          <div class="comment-avatar">${letter}</div>
          <span class="comment-form-label">Leave a comment as <strong>${escapeHtml(user.username)}</strong></span>
        </div>
        <form id="comment-form" novalidate>
          <textarea
            id="comment-input"
            class="comment-textarea"
            placeholder="Share your thoughts..."
            rows="3"
            maxlength="2000"
          ></textarea>
          <div class="comment-form-footer">
            <button type="submit" class="btn btn-primary btn-sm" id="btn-submit-comment">
              <span id="comment-submit-label">Post Comment</span>
              <span class="btn-spinner hidden" id="comment-spinner"></span>
            </button>
          </div>
        </form>
      </div>
    `;

    document.getElementById('comment-form').addEventListener('submit', (e) => {
      handleCommentSubmit(e, postId);
    });
  } else {
    area.innerHTML = `
      <div class="comment-login-prompt">
        <span>💬</span> Want to join the discussion?
        <button class="link-btn" id="comment-login-btn">Sign in</button> or
        <button class="link-btn" id="comment-register-btn">create an account</button>.
      </div>
    `;
    document.getElementById('comment-login-btn')?.addEventListener('click', () => showModal('modal-login'));
    document.getElementById('comment-register-btn')?.addEventListener('click', () => showModal('modal-register'));
  }
}

async function handleCommentSubmit(e, postId) {
  e.preventDefault();
  const input = document.getElementById('comment-input');
  const content = input.value.trim();

  if (!content || content.length < 2) {
    input.classList.add('error');
    input.focus();
    showToast('Comment must be at least 2 characters.', 'error');
    setTimeout(() => input.classList.remove('error'), 2000);
    return;
  }

  const submitBtn = document.getElementById('btn-submit-comment');
  const label = document.getElementById('comment-submit-label');
  const spinner = document.getElementById('comment-spinner');

  submitBtn.disabled = true;
  label.textContent = 'Posting...';
  spinner.classList.remove('hidden');

  try {
    const data = await apiFetch('/comments', {
      method: 'POST',
      body: JSON.stringify({ postId: parseInt(postId), content }),
    });

    const comment = data.comment;
    input.value = '';

    // Inject new comment into list
    const list = document.getElementById('comments-list');
    if (list) {
      // Remove empty state if present
      const emptyEl = list.querySelector('.comments-empty');
      if (emptyEl) emptyEl.remove();

      const div = document.createElement('div');
      div.innerHTML = renderCommentItem(comment);
      const item = div.firstElementChild;
      list.appendChild(item);

      // Bind delete on new item
      const delBtn = item.querySelector('.comment-delete-btn');
      if (delBtn) bindSingleCommentDelete(delBtn);

      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Update count
    const countBadge = document.getElementById('comments-count');
    if (countBadge) {
      const current = parseInt(countBadge.textContent) || 0;
      countBadge.textContent = `${current + 1}`;
    }

    showToast('Comment posted! 💬', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to post comment.', 'error');
  } finally {
    submitBtn.disabled = false;
    label.textContent = 'Post Comment';
    spinner.classList.add('hidden');
  }
}

function bindCommentDeleteBtns(container) {
  container.querySelectorAll('.comment-delete-btn').forEach(bindSingleCommentDelete);
}

function bindSingleCommentDelete(btn) {
  btn.addEventListener('click', async () => {
    const commentId = btn.dataset.id;
    if (!confirm('Delete this comment?')) return;

    try {
      await apiFetch(`/comments/${commentId}`, { method: 'DELETE' });
      const item = document.getElementById(`comment-${commentId}`);
      if (item) {
        item.style.opacity = '0';
        item.style.transform = 'scale(0.95)';
        item.style.transition = 'all 0.2s ease';
        setTimeout(() => item.remove(), 200);
      }

      const countBadge = document.getElementById('comments-count');
      if (countBadge) {
        const current = parseInt(countBadge.textContent) || 1;
        countBadge.textContent = `${Math.max(0, current - 1)}`;
      }

      showToast('Comment deleted.', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to delete comment.', 'error');
    }
  });
}

// Helper: XSS prevention
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Expose
window.renderComments = renderComments;
window.escapeHtml = escapeHtml;
