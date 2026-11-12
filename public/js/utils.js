import { state } from './state.js';

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

export function formatDateTime(isoString) {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(dateInput) {
  if (!dateInput) return 'N/A';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return escapeHtml(dateInput);
  return date.toLocaleDateString();
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function calculateAge(dobStr) {
  const dob = new Date(dobStr);
  if (Number.isNaN(dob.getTime())) return 'N/A';
  const diff = Date.now() - dob.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  if (type === 'warning') icon = 'alert-triangle';
  if (type === 'danger') icon = 'alert-octagon';

  const iconEl = document.createElement('i');
  iconEl.setAttribute('data-lucide', icon);

  const textEl = document.createElement('span');
  textEl.textContent = String(message ?? '');

  toast.appendChild(iconEl);
  toast.appendChild(textEl);
  container.appendChild(toast);
  refreshIcons();

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

export function renderNotifications() {
  const list = document.getElementById('notification-list');
  const dot = document.querySelector('.badge-dot');
  if (state.notifications.length === 0) {
    list.innerHTML = '<div class="empty-state">No notifications.</div>';
    if (dot) dot.classList.add('hidden');
    return;
  }

  if (dot) dot.classList.remove('hidden');
  list.innerHTML = state.notifications
    .map(
      (n) => `
      <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); font-size: 0.85rem;">
        <p style="color: var(--text-primary); font-weight: 500;">${escapeHtml(n.text)}</p>
        <span style="color: var(--text-muted); font-size: 0.75rem;">${escapeHtml(n.time)}</span>
      </div>
    `
    )
    .join('');
}

export function addNotification(text) {
  state.notifications.unshift({ id: Date.now(), text, time: 'Just now' });
  renderNotifications();
  showToast(text, 'primary');
}

export function createModal(innerHtml) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = innerHtml;

  modal.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => modal.remove());
  });

  document.body.appendChild(modal);
  refreshIcons();
  return modal;
}

