import { state } from './state.js';
import { apiRequest } from './api.js';
import { refreshIcons, renderNotifications, showToast } from './utils.js';
import { getDefaultRouteForRole, navigate, renderSidebar } from './router.js';

function showAuthScreen() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app-shell').classList.add('hidden');
}

function showAppShell() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');

  document.getElementById('profile-name').textContent = state.user.name || '';
  document.getElementById('profile-role').textContent = state.user.role || '';
  document.getElementById('user-avatar-char').textContent = (state.user.name || 'U').charAt(0);

  renderSidebar();
}

async function checkAuth() {
  try {
    const { ok, data } = await apiRequest('/api/auth/me');
    if (ok && data && data.loggedIn) {
      state.user = data.user;
      showAppShell();
      const route = window.location.hash.substring(1) || getDefaultRouteForRole(state.user.role);
      await navigate(route);
    } else {
      showAuthScreen();
    }
  } catch {
    showAuthScreen();
  }
}

function initEventListeners() {
  document.getElementById('toggle-theme').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    document.body.classList.toggle('light-mode');
    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('theme-icon').setAttribute('data-lucide', isDark ? 'moon' : 'sun');
    refreshIcons();
  });

  document.getElementById('toggle-sidebar').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
  });

  const notifBtn = document.getElementById('btn-notifications');
  const notifPanel = document.getElementById('notification-panel');
  notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notifPanel.classList.toggle('hidden');
    renderNotifications();
  });

  document.addEventListener('click', () => {
    notifPanel.classList.add('hidden');
  });

  document.getElementById('clear-notifications').addEventListener('click', () => {
    state.notifications = [];
    renderNotifications();
  });

  // Footer navigation links
  document.querySelectorAll('.footer-nav-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const route = e.currentTarget.getAttribute('data-route');
      if (route) {
        window.location.hash = route;
        navigate(route);
      }
    });
  });

  // Auth form toggles
  document.getElementById('go-to-register').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('forgot-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
  });

  document.getElementById('go-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('forgot-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
  });

  document.getElementById('go-to-forgot').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('forgot-form').classList.remove('hidden');
    document.getElementById('forgot-step-1').classList.remove('hidden');
    document.getElementById('forgot-step-2').classList.add('hidden');
  });

  document.getElementById('go-to-login-from-forgot').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('forgot-form').classList.add('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
  });

  // Forgot Password: Request Code
  document.getElementById('btn-send-reset-code').addEventListener('click', async () => {
    const email = document.getElementById('forgot-email').value;
    if (!email || !email.trim()) {
      showToast('Please enter your account email address.', 'warning');
      return;
    }

    try {
      const { ok, data } = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });
      if (ok) {
        showToast(
          (data && data.message) || 'If an account with that email exists, a password reset code has been sent.',
          'success'
        );
        document.getElementById('forgot-code').value = '';
        document.getElementById('forgot-step-2').classList.remove('hidden');
      } else {
        showToast((data && data.error) || 'Failed to send reset code.', 'danger');
      }
    } catch {
      showToast('Network error requesting reset code.', 'danger');
    }
  });

  // Forgot Password: Submit Reset Form
  document.getElementById('forgot-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    const resetCode = document.getElementById('forgot-code').value;
    const newPassword = document.getElementById('forgot-new-password').value;

    try {
      const { ok, data } = await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: { email, resetCode, newPassword },
      });
      if (ok) {
        showToast('Password reset successfully! Please log in.', 'success');
        document.getElementById('login-email').value = email;
        document.getElementById('login-password').value = '';
        document.getElementById('forgot-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
      } else {
        showToast((data && data.error) || 'Password reset failed.', 'danger');
      }
    } catch {
      showToast('Network error resetting password.', 'danger');
    }
  });

  // Login action
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const { ok, data } = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (ok && data) {
        state.user = data;
        showAppShell();
        await navigate(getDefaultRouteForRole(state.user.role));
        showToast('Login successful', 'success');
      } else {
        showToast((data && data.error) || 'Login failed', 'danger');
      }
    } catch {
      showToast('Network error: unable to reach server', 'danger');
    }
  });

  // Register action (Patient self-registration only)
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('reg-first-name').value;
    const lastName = document.getElementById('reg-last-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const phone = document.getElementById('reg-phone').value;

    try {
      const { ok, data } = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: { email, password, firstName, lastName, phone },
      });
      if (ok) {
        showToast('Account created. Please log in.', 'success');
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
      } else {
        showToast((data && data.error) || 'Registration failed', 'danger');
      }
    } catch {
      showToast('Network error: unable to reach server', 'danger');
    }
  });

  // Logout action
  document.getElementById('btn-logout').addEventListener('click', async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
      state.user = null;
      showToast('Logged out successfully', 'success');
      showAuthScreen();
    } catch {
      showToast('Logout failed', 'danger');
    }
  });
}

window.addEventListener('hashchange', () => {
  const route = window.location.hash.substring(1);
  if (route && route !== state.currentRoute && state.user) {
    navigate(route);
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  initEventListeners();
  await checkAuth();
  refreshIcons();
});

