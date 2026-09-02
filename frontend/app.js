// ==========================================================================
// DentalFlow SPA Client-Side State and Router
// ==========================================================================

const state = {
  user: null, // Logged in user info
  currentRoute: 'dashboard',
  patients: [],
  dentists: [],
  treatments: [],
  appointments: [],
  leads: [],
  followups: [],
  notifications: [
    { id: 1, text: "Welcome to DentalFlow! Database seeded successfully.", time: "Just now" }
  ]
};

// Initializer
document.addEventListener('DOMContentLoaded', async () => {
  initEventListeners();
  await checkAuth();
  lucide.createIcons();
});

// Check Auth status with API
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.loggedIn) {
      state.user = data.user;
      showAppShell();
      // Navigate to current hash or default dashboard
      const route = window.location.hash.substring(1) || getDefaultRouteForRole(state.user.role);
      navigate(route);
    } else {
      showAuthScreen();
    }
  } catch (err) {
    showAuthScreen();
  }
}

function getDefaultRouteForRole(role) {
  if (role === 'patient') return 'portal';
  return 'dashboard';
}

function showAuthScreen() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app-shell').classList.add('hidden');
}

function showAppShell() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  
  // Set User details
  document.getElementById('profile-name').textContent = state.user.name;
  document.getElementById('profile-role').textContent = state.user.role;
  document.getElementById('user-avatar-char').textContent = state.user.name.charAt(0);
  
  renderSidebar();
}

// Render dynamic Sidebar links based on role
function renderSidebar() {
  const menuList = document.getElementById('menu-items');
  menuList.innerHTML = '';

  let menu = [];
  if (state.user.role === 'admin') {
    menu = [
      { key: 'dashboard', label: 'Dashboard', icon: 'layout' },
      {
        category: 'USER MANAGEMENT',
        items: [
          { key: 'users', label: 'Users', icon: 'users' },
          { key: 'users-dentist', label: 'Dentists', icon: 'user-check' },
          { key: 'users-staff', label: 'Staff', icon: 'user-cog' }
        ]
      },
      {
        category: 'CLINIC',
        items: [
          { key: 'patients', label: 'Patients', icon: 'smile' },
          { key: 'packages', label: 'Services', icon: 'tag' },
          { key: 'schedules', label: 'Schedules', icon: 'clock' }
        ]
      },
      {
        category: 'OPERATIONS',
        items: [
          { key: 'appointments', label: 'Appointments', icon: 'calendar' }
        ]
      },
      {
        category: 'FINANCE',
        items: [
          { key: 'billing', label: 'Billing', icon: 'file-text' },
          { key: 'payments', label: 'Payments', icon: 'credit-card' }
        ]
      },
      {
        category: 'REPORTS',
        items: [
          { key: 'analytics', label: 'Analytics', icon: 'bar-chart' },
          { key: 'reports', label: 'Reports', icon: 'file' }
        ]
      },
      {
        category: 'SETTINGS',
        items: [
          { key: 'settings', label: 'Clinic Settings', icon: 'settings' }
        ]
      }
    ];
  } else if (state.user.role === 'staff') {
    menu = [
      { key: 'dashboard', label: 'Dashboard', icon: 'layout' },
      {
        category: 'OPERATIONS',
        items: [
          { key: 'appointments', label: 'Appointments', icon: 'calendar' },
          { key: 'appointments', label: 'Calendar', icon: 'calendar' },
          { key: 'patients', label: 'Patients', icon: 'smile' },
          { key: 'portal', label: 'Bookings', icon: 'external-link' }
        ]
      },
      {
        category: 'CRM',
        items: [
          { key: 'followups', label: 'Calls', icon: 'phone-call' },
          { key: 'leads', label: 'Leads', icon: 'zap' },
          { key: 'followups', label: 'Follow-ups', icon: 'check-square' }
        ]
      },
      {
        category: 'FINANCE',
        items: [
          { key: 'billing', label: 'Billing', icon: 'file-text' },
          { key: 'payments', label: 'Payments', icon: 'credit-card' }
        ]
      }
    ];
  } else if (state.user.role === 'dentist') {
    menu = [
      { key: 'dashboard', label: 'Dashboard', icon: 'layout' },
      {
        category: 'MY CLINIC',
        items: [
          { key: 'appointments', label: 'My Appointments', icon: 'calendar' },
          { key: 'patients', label: 'My Patients', icon: 'smile' }
        ]
      },
      {
        category: 'CLINICAL',
        items: [
          { key: 'patients', label: 'Patient Records', icon: 'folder-open' },
          { key: 'plans-list', label: 'Treatment Plans', icon: 'clipboard' },
          { key: 'packages', label: 'Treatments', icon: 'tag' },
          { key: 'chart', label: 'Dental Chart', icon: 'activity' },
          { key: 'documents', label: 'Documents', icon: 'file-text' }
        ]
      }
    ];
  } else if (state.user.role === 'patient') {
    menu = [
      { key: 'dashboard', label: 'Dashboard', icon: 'layout' },
      {
        category: 'MY ACCOUNT',
        items: [
          { key: 'profile', label: 'My Profile', icon: 'user' }
        ]
      },
      {
        category: 'MY CARE',
        items: [
          { key: 'appointments', label: 'My Appointments', icon: 'calendar' },
          { key: 'my-treatments', label: 'My Treatments', icon: 'tag' },
          { key: 'my-treatment-plan', label: 'My Treatment Plan', icon: 'clipboard' },
          { key: 'my-medical-records', label: 'My Medical Records', icon: 'file-text' }
        ]
      },
      {
        category: 'FINANCE',
        items: [
          { key: 'billing', label: 'My Invoices', icon: 'file-text' },
          { key: 'payments', label: 'My Payments', icon: 'credit-card' }
        ]
      },
      { key: 'portal', label: 'Book Appointment', icon: 'calendar-check' }
    ];
  }

  menu.forEach(cat => {
    if (cat.category) {
      // Add Category Header
      const headerLi = document.createElement('li');
      headerLi.className = 'sidebar-category-header';
      headerLi.textContent = cat.category;
      menuList.appendChild(headerLi);

      // Add Category Items
      cat.items.forEach(item => {
        const itemLi = document.createElement('li');
        itemLi.innerHTML = `
          <a href="#${item.key}" class="menu-link ${state.currentRoute === item.key ? 'active' : ''}" data-route="${item.key}">
            <i data-lucide="${item.icon}"></i>
            <span>${item.label}</span>
          </a>
        `;
        menuList.appendChild(itemLi);
      });
    } else {
      // Top-level direct link
      const itemLi = document.createElement('li');
      itemLi.innerHTML = `
        <a href="#${cat.key}" class="menu-link ${state.currentRoute === cat.key ? 'active' : ''}" data-route="${cat.key}">
          <i data-lucide="${cat.icon}"></i>
          <span>${cat.label}</span>
        </a>
      `;
      menuList.appendChild(itemLi);
    }
  });

  // Bind click handlers to hash navigation
  document.querySelectorAll('.menu-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const route = e.currentTarget.getAttribute('data-route');
      window.location.hash = route;
      navigate(route);
    });
  });

  lucide.createIcons();
}

// SPA Routing Orchestrator
async function navigate(route) {
  state.currentRoute = route;
  
  // Highlight active menu item
  document.querySelectorAll('.menu-link').forEach(link => {
    if (link.getAttribute('data-route') === route) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  const workspace = document.getElementById('workspace-view');
  const viewTitle = document.getElementById('view-title');
  workspace.innerHTML = '<div class="loader">Loading view...</div>';

  try {
    switch (route) {
      case 'dashboard':
        viewTitle.textContent = 'Dashboard Analytics';
        await renderDashboardView(workspace);
        break;
      case 'patients':
        viewTitle.textContent = 'Patient Database';
        await renderPatientsView(workspace);
        break;
      case 'appointments':
        viewTitle.textContent = 'Clinic Scheduler';
        await renderAppointmentsView(workspace);
        break;
      case 'billing':
        viewTitle.textContent = 'Financial Management';
        await renderBillingView(workspace);
        break;
      case 'leads':
        viewTitle.textContent = 'CRM Lead Pipeline';
        await renderLeadsView(workspace);
        break;
      case 'portal':
        viewTitle.textContent = 'Online Booking Portal';
        await renderPatientBookingPortal(workspace);
        break;
      case 'my-treatment-plan':
        viewTitle.textContent = 'My Treatment Plans';
        await renderPatientTreatmentPlansPortal(workspace);
        break;
      case 'my-medical-records':
      case 'myrecords':
        viewTitle.textContent = 'My Medical Records';
        await renderPatientRecordsPortal(workspace);
        break;
      case 'followups':
        viewTitle.textContent = 'CRM Follow-ups';
        await renderFollowupsView(workspace);
        break;
      case 'prescriptions':
        viewTitle.textContent = 'Prescription Hub';
        await renderPrescriptionsView(workspace);
        break;
      case 'packages':
        viewTitle.textContent = 'Packages & Services';
        await renderPackagesView(workspace);
        break;
      case 'stock':
        viewTitle.textContent = 'Medical Stock & Inventory';
        await renderStockView(workspace);
        break;
      case 'users':
        viewTitle.textContent = 'Staff & User Accounts';
        await renderUsersView(workspace);
        break;
      case 'users-dentist':
        viewTitle.textContent = 'Dentist Accounts';
        await renderUsersView(workspace, 'dentist');
        break;
      case 'users-staff':
        viewTitle.textContent = 'Clinic Staff Accounts';
        await renderUsersView(workspace, 'staff');
        break;
      case 'schedules':
        viewTitle.textContent = 'Dentist Schedules';
        await renderSchedulesView(workspace);
        break;
      case 'payments':
        viewTitle.textContent = 'Payments Received';
        await renderPaymentsView(workspace);
        break;
      case 'analytics':
        viewTitle.textContent = 'Dashboard Analytics';
        await renderDashboardView(workspace);
        break;
      case 'reports':
        viewTitle.textContent = 'Financial & Patient Reports';
        await renderReportsView(workspace);
        break;
      case 'settings':
        viewTitle.textContent = 'Clinic Settings';
        await renderClinicSettingsView(workspace);
        break;
      case 'plans-list':
        viewTitle.textContent = 'Treatment Plans';
        await renderPlansListView(workspace);
        break;
      case 'my-treatments':
        viewTitle.textContent = 'My Treatments Catalog';
        await renderMyTreatmentsView(workspace);
        break;
      case 'profile':
        viewTitle.textContent = 'My Account Profile';
        await renderPatientProfileView(workspace);
        break;
      case 'chart':
        viewTitle.textContent = 'Active Dental Odontogram';
        workspace.innerHTML = `
          <div style="background:var(--bg-secondary); padding:32px; border-radius:var(--radius-md); border:1px solid var(--border-color); text-align:center;">
            <h3>Odontogram Charting</h3>
            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:20px;">Odontogram tracking is managed directly inside each patient's 360 profile file.</p>
            <button class="btn btn-primary" onclick="window.location.hash='patients'; navigate('patients');">Select Patient File</button>
          </div>
        `;
        break;
      case 'documents':
        viewTitle.textContent = 'Clinical Documents';
        workspace.innerHTML = `
          <div style="background:var(--bg-secondary); padding:32px; border-radius:var(--radius-md); border:1px solid var(--border-color); text-align:center;">
            <h3>Clinical Documents Hub</h3>
            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:20px;">Upload, download, and review patient X-rays or medical records directly in their Patient 360 file.</p>
            <button class="btn btn-primary" onclick="window.location.hash='patients'; navigate('patients');">Select Patient File</button>
          </div>
        `;
        break;
      default:
        // Check for specific profile sub-views e.g. #patient-360-4
        if (route.startsWith('patient-360-')) {
          const id = route.split('-')[2];
          viewTitle.textContent = `Patient File #360`;
          await renderPatient360View(workspace, id);
        } else if (route.startsWith('invoice-')) {
          const id = route.split('-')[1];
          viewTitle.textContent = `Invoice Detail`;
          await renderInvoiceView(workspace, id);
        } else {
          viewTitle.textContent = 'Dashboard';
          await renderDashboardView(workspace);
        }
    }
  } catch (err) {
    workspace.innerHTML = `<div class="toast danger">Error loading view: ${err.message}</div>`;
  }
  lucide.createIcons();
}

// Hash-based history synchronizer
window.addEventListener('hashchange', () => {
  const route = window.location.hash.substring(1);
  if (route && route !== state.currentRoute) {
    navigate(route);
  }
});

// Event Listeners setup
function initEventListeners() {
  // Theme Toggle
  const toggleTheme = document.getElementById('toggle-theme');
  toggleTheme.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    document.body.classList.toggle('light-mode');
    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('theme-icon').setAttribute('data-lucide', isDark ? 'moon' : 'sun');
    lucide.createIcons();
  });

  // Mobile Toggle Sidebar
  document.getElementById('toggle-sidebar').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
  });

  // Notifications bell toggle
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

  // Auth Toggle links
  document.getElementById('go-to-register').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
  });
  document.getElementById('go-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
  });

  // Login action
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        state.user = data;
        showAppShell();
        navigate(getDefaultRouteForRole(state.user.role));
        showToast('Login successful', 'success');
      } else {
        showToast(data.error || 'Login failed', 'danger');
      }
    } catch (err) {
      showToast('Network error login', 'danger');
    }
  });

  // Register action
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('reg-first-name').value;
    const lastName = document.getElementById('reg-last-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const phone = document.getElementById('reg-phone').value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, firstName, lastName, phone })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Account created. Please log in.', 'success');
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
      } else {
        showToast(data.error || 'Registration failed', 'danger');
      }
    } catch (err) {
      showToast('Network error registering', 'danger');
    }
  });

  // Logout action
  document.getElementById('btn-logout').addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      state.user = null;
      showToast('Logged out successfully', 'success');
      showAuthScreen();
    } catch (err) {
      showToast('Logout failed', 'danger');
    }
  });
}

// Global UI Toast Alert trigger
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  if (type === 'warning') icon = 'alert-triangle';
  if (type === 'danger') icon = 'alert-octagon';
  
  toast.innerHTML = `
    <i data-lucide="${icon}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// Notification Drawer items renderer
function renderNotifications() {
  const list = document.getElementById('notification-list');
  if (state.notifications.length === 0) {
    list.innerHTML = '<div class="empty-state">No notifications.</div>';
    document.querySelector('.badge-dot').classList.add('hidden');
    return;
  }
  
  document.querySelector('.badge-dot').classList.remove('hidden');
  list.innerHTML = state.notifications.map(n => `
    <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); font-size: 0.85rem;">
      <p style="color: var(--text-primary); font-weight: 500;">${n.text}</p>
      <span style="color: var(--text-muted); font-size: 0.75rem;">${n.time}</span>
    </div>
  `).join('');
}

function addNotification(text) {
  state.notifications.unshift({ id: Date.now(), text, time: "Just now" });
  renderNotifications();
  showToast(text, 'primary');
}

// ==========================================================================
// 1. BUSINESS DASHBOARD VIEW
// ==========================================================================
async function renderDashboardView(container) {
  const res = await fetch('/api/dashboard/stats');
  const stats = await res.json();

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card primary">
        <div class="stat-info">
          <p>Total Patients</p>
          <h3>${stats.patientsCount}</h3>
        </div>
        <div class="stat-icon"><i data-lucide="users"></i></div>
      </div>
      <div class="stat-card success">
        <div class="stat-info">
          <p>Revenue (Generated)</p>
          <h3>$${((stats && stats.revenue) || 0).toLocaleString()}</h3>
        </div>
        <div class="stat-icon"><i data-lucide="dollar-sign"></i></div>
      </div>
      <div class="stat-card primary">
        <div class="stat-info">
          <p>Collected Payments</p>
          <h3>$${((stats && stats.collected) || 0).toLocaleString()}</h3>
        </div>
        <div class="stat-icon"><i data-lucide="wallet"></i></div>
      </div>
      <div class="stat-card danger">
        <div class="stat-info">
          <p>Outstanding Balances</p>
          <h3>$${((stats && stats.outstanding) || 0).toLocaleString()}</h3>
        </div>
        <div class="stat-icon"><i data-lucide="alert-circle"></i></div>
      </div>
    </div>

    <div class="dashboard-charts">
      <div class="chart-card">
        <h3>Revenue Distribution (Last 6 Months)</h3>
        <div class="chart-container">
          <canvas id="revenue-chart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>Treatment Popularity</h3>
        <div class="chart-container">
          <canvas id="popularity-chart"></canvas>
        </div>
      </div>
    </div>
  `;

  // Draw Revenue Chart
  const ctxRev = document.getElementById('revenue-chart').getContext('2d');
  new Chart(ctxRev, {
    type: 'line',
    data: {
      labels: stats.monthlyEarnings.map(m => m.month),
      datasets: [{
        label: 'Monthly Payments Collected ($)',
        data: stats.monthlyEarnings.map(m => m.total),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  // Draw Treatment Popularity Doughnut Chart
  const ctxPop = document.getElementById('popularity-chart').getContext('2d');
  new Chart(ctxPop, {
    type: 'doughnut',
    data: {
      labels: stats.treatmentsPopularity.map(t => t.name),
      datasets: [{
        data: stats.treatmentsPopularity.map(t => t.count),
        backgroundColor: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

// ==========================================================================
// 2. PATIENTS VIEWS & PATIENT 360 PROFILE
// ==========================================================================
async function renderPatientsView(container) {
  const dentistFilterHtml = state.user.role === 'dentist' ? `
    <label style="display:flex; align-items:center; gap:6px; font-size:0.85rem; font-weight:600; cursor:pointer; color:var(--text-primary); margin-left:16px;">
      <input type="checkbox" id="chk-my-patients-only" checked style="width:16px; height:16px; margin:0; cursor:pointer;">
      <span>My Patients Only</span>
    </label>
  ` : '';

  container.innerHTML = `
    <div class="view-header-actions">
      <div style="display:flex; align-items:center; gap:16px; flex:1; flex-wrap:wrap;">
        <div class="search-input-wrapper" style="flex:1; max-width:400px; min-width:200px;">
          <i data-lucide="search"></i>
          <input type="text" id="patient-search" placeholder="Search by name, phone or email...">
        </div>
        ${dentistFilterHtml}
      </div>
      ${state.user.role !== 'dentist' ? `<button class="btn btn-primary" id="btn-add-patient"><i data-lucide="user-plus"></i>Add Patient</button>` : ''}
    </div>

    <div class="table-card">
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Patient Name</th>
              <th>Date of Birth</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Medical Allergies</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="patients-table-body">
            <tr><td colspan="6" style="text-align:center;">Loading patients...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Bind Search events
  const searchInput = document.getElementById('patient-search');
  searchInput.addEventListener('input', debounce(() => fetchPatients(searchInput.value), 300));
  
  const myPatChk = document.getElementById('chk-my-patients-only');
  if (myPatChk) {
    myPatChk.addEventListener('change', () => fetchPatients(searchInput.value));
  }

  // Add patient trigger
  if (state.user.role !== 'dentist') {
    document.getElementById('btn-add-patient').addEventListener('click', openAddPatientModal);
  }

  // Load patient lists
  await fetchPatients();
}

async function fetchPatients(query = '') {
  const myPatChk = document.getElementById('chk-my-patients-only');
  const assignedOnly = myPatChk && myPatChk.checked;
  
  let url = '/api/patients';
  const params = [];
  if (query) params.push(`q=${encodeURIComponent(query)}`);
  if (assignedOnly) params.push(`assignedOnly=true`);
  
  if (params.length) {
    url += '?' + params.join('&');
  }

  const res = await fetch(url);
  const patients = await res.json();
  
  const tbody = document.getElementById('patients-table-body');
  if (patients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No patients found.</td></tr>';
    return;
  }

  tbody.innerHTML = patients.map(p => `
    <tr>
      <td><strong>${p.first_name} ${p.last_name}</strong></td>
      <td>${p.date_of_birth ? p.date_of_birth : 'N/A'}</td>
      <td>${p.phone ? p.phone : 'N/A'}</td>
      <td>${p.email ? p.email : 'N/A'}</td>
      <td><span class="badge ${p.medical_allergies && p.medical_allergies.toLowerCase() !== 'none' ? 'danger' : 'success'}">${p.medical_allergies ? p.medical_allergies : 'None'}</span></td>
      <td>
        <button class="btn btn-secondary btn-icon" onclick="window.location.hash='patient-360-${p.id}'; navigate('patient-360-${p.id}');" title="Open Patient 360 File">
          <i data-lucide="eye" style="width:16px;height:16px;"></i>
        </button>
      </td>
    </tr>
  `).join('');
  
  lucide.createIcons();
}

// Add Patient Modal Controller
function openAddPatientModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3>Create Patient Profile</h3>
        <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
      </div>
      <form id="add-patient-form">
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>First Name*</label>
              <input type="text" id="p-first-name" required placeholder="John">
            </div>
            <div class="form-group">
              <label>Last Name*</label>
              <input type="text" id="p-last-name" required placeholder="Doe">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Date of Birth</label>
              <input type="date" id="p-dob">
            </div>
            <div class="form-group">
              <label>Gender</label>
              <select id="p-gender">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Phone Number</label>
              <input type="tel" id="p-phone" placeholder="555-0155">
            </div>
            <div class="form-group">
              <label>Email Address</label>
              <input type="email" id="p-email" placeholder="john@email.com">
            </div>
          </div>
          <div class="form-group">
            <label>Address</label>
            <input type="text" id="p-address" placeholder="123 Main St, Seattle">
          </div>
          <div class="form-group">
            <label>Medical Allergies</label>
            <input type="text" id="p-allergies" placeholder="Penicillin, Latex, None...">
          </div>
          <div class="form-group">
            <label>Internal Medical Notes</label>
            <textarea id="p-notes" placeholder="Note down any dental anxiety, medical complications etc." rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Profile</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  lucide.createIcons();

  document.getElementById('add-patient-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      firstName: document.getElementById('p-first-name').value,
      lastName: document.getElementById('p-last-name').value,
      dateOfBirth: document.getElementById('p-dob').value,
      gender: document.getElementById('p-gender').value,
      phone: document.getElementById('p-phone').value,
      email: document.getElementById('p-email').value,
      address: document.getElementById('p-address').value,
      allergies: document.getElementById('p-allergies').value,
      notes: document.getElementById('p-notes').value
    };

    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      showToast('Patient profile created successfully', 'success');
      modal.remove();
      fetchPatients();
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to create patient', 'danger');
    }
  });
}

// --------------------------------------------------------------------------
// Patient 360 Profile Dashboard Render
// --------------------------------------------------------------------------
async function renderPatient360View(container, patientId) {
  const res = await fetch(`/api/patients/${patientId}`);
  if (!res.ok) {
    container.innerHTML = '<div class="toast danger">Patient file not found.</div>';
    return;
  }
  const data = await res.json();
  const p = data.patient;

  // Calculate stats matching the screenshot mockup
  const timelineEventsCount = data.appointments.length + data.treatmentPlans.length;
  let totalPaid = 0;
  let totalOutstanding = 0;
  data.invoices.forEach(inv => {
    totalPaid += inv.amount_paid;
    totalOutstanding += (inv.total_amount - inv.amount_paid);
  });

  const balanceText = totalOutstanding > 0 ? `$${totalOutstanding.toLocaleString()}` : '$0';
  const openBalanceBadge = totalOutstanding > 0 
    ? `<span class="badge danger">Open Balance: $${totalOutstanding.toLocaleString()}</span>` 
    : `<span class="badge success" style="background-color: #ecfdf5; color: #047857;">No open balance</span>`;

  container.innerHTML = `
    <!-- Top Filter Bar matching Clinova OS screenshot -->
    <div style="background:var(--bg-secondary); padding:16px 24px; border-radius:var(--radius-md); border:1px solid var(--border-color); margin-bottom:24px; display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
      <div style="flex:1; min-width:180px; display:flex; flex-direction:column; gap:4px;">
        <label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">Status</label>
        <select style="padding:8px 12px; border-radius:var(--radius-sm); border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-primary); font-size:0.85rem;">
          <option>All Statuses</option>
        </select>
      </div>
      <div style="flex:1; min-width:150px; display:flex; flex-direction:column; gap:4px;">
        <label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">From Date</label>
        <input type="text" placeholder="dd/mm/yyyy" style="padding:8px 12px; border-radius:var(--radius-sm); border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-primary); font-size:0.85rem;">
      </div>
      <div style="flex:1; min-width:150px; display:flex; flex-direction:column; gap:4px;">
        <label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">To Date</label>
        <input type="text" placeholder="dd/mm/yyyy" style="padding:8px 12px; border-radius:var(--radius-sm); border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-primary); font-size:0.85rem;">
      </div>
    </div>

    <!-- Unified Medical File Banner -->
    <div style="background:var(--bg-secondary); border-radius:var(--radius-md); border:1px solid var(--border-color); padding:24px; margin-bottom:24px; box-shadow:var(--shadow-sm);">
      <p style="font-size:0.75rem; color:#06b6d4; font-weight:700; text-transform:uppercase; margin-bottom:12px; letter-spacing:0.05em;">Unified Medical File</p>
      
      <div style="display:flex; align-items:center; gap:20px; flex-wrap:wrap; margin-bottom:24px;">
        <div class="patient-avatar-large" style="margin:0; width:72px; height:72px; font-size:1.8rem; background-color:#e0f7fa; color:#006064;">
          ${p.first_name.charAt(0)}${p.last_name.charAt(0)}
        </div>
        <div style="flex:1;">
          <h2 style="font-size:1.6rem; font-weight:700; margin-bottom:4px;">${p.first_name} ${p.last_name}</h2>
          <div style="display:flex; gap:16px; font-size:0.85rem; color:var(--text-secondary); margin-bottom:8px; flex-wrap:wrap;">
            <span><strong>MRN-</strong>20260823-${p.id}</span>
            <span><strong>Phone:</strong> ${p.phone ? p.phone : 'N/A'}</span>
            <span><strong>Latest Visit:</strong> ${data.appointments.length > 0 ? formatDateTime(data.appointments[0].start_time).split(',')[0] : '2026-08-23'}</span>
          </div>
          <div style="display:flex; gap:8px;">
            <span class="badge primary" style="background-color:#e0e7ff; color:#4338ca;">Medical client</span>
            <span class="badge success" style="background-color:#ecfdf5; color:#047857;">${timelineEventsCount} clinical events</span>
            ${openBalanceBadge}
          </div>
        </div>
      </div>

      <!-- Metrics Row -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:16px; border-top:1px solid var(--border-color); padding-top:20px; text-align:center;">
        <div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">Timeline results</p>
          <strong style="font-size:1.25rem; color:var(--text-primary);">${timelineEventsCount}</strong>
        </div>
        <div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">Total paid</p>
          <strong style="font-size:1.25rem; color:var(--text-primary);">$${totalPaid.toLocaleString()}</strong>
        </div>
        <div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">Balance</p>
          <strong style="font-size:1.25rem; color:var(--text-primary);">${balanceText}</strong>
        </div>
        <div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">Avg. sales</p>
          <strong style="font-size:1.25rem; color:var(--text-primary);">$${(totalPaid / (data.invoices.length || 1)).toLocaleString(undefined, {maximumFractionDigits: 0})}</strong>
        </div>
        <div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">Remaining sessions</p>
          <strong style="font-size:1.25rem; color:var(--text-primary);">0</strong>
        </div>
        <div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">Alerts</p>
          <strong style="font-size:1.25rem; color:var(--danger-color);">${p.medical_allergies && p.medical_allergies.toLowerCase() !== 'none' ? '1' : '0'}</strong>
        </div>
      </div>
    </div>

    <!-- Triple Card Column Details Section -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:24px; margin-bottom:32px;">
      <!-- Patient details -->
      <div style="background:var(--bg-secondary); border-radius:var(--radius-md); border:1px solid var(--border-color); padding:20px; box-shadow:var(--shadow-sm);">
        <h4 style="font-size:0.9rem; font-weight:600; margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">Patient details</h4>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:0.85rem;">
          <div>
            <span style="color:var(--text-muted); display:block; font-size:0.75rem;">MRN</span>
            <strong>MRN-20260823-${p.id}</strong>
          </div>
          <div>
            <span style="color:var(--text-muted); display:block; font-size:0.75rem;">Age</span>
            <strong>${p.date_of_birth ? calculateAge(p.date_of_birth) : '16'}</strong>
          </div>
          <div>
            <span style="color:var(--text-muted); display:block; font-size:0.75rem;">Gender</span>
            <strong>${p.gender ? p.gender : 'N/A'}</strong>
          </div>
          <div>
            <span style="color:var(--text-muted); display:block; font-size:0.75rem;">Weight</span>
            <strong>Not recorded</strong>
          </div>
        </div>
      </div>

      <!-- Next action -->
      <div style="background:var(--bg-secondary); border-radius:var(--radius-md); border:1px solid var(--border-color); padding:20px; box-shadow:var(--shadow-sm);">
        <h4 style="font-size:0.9rem; font-weight:600; margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">Next action</h4>
        <p style="font-size:0.9rem; color:#059669; font-weight:700; margin-bottom:6px;">File is healthy</p>
        <p style="font-size:0.8rem; color:var(--text-secondary);">No critical alerts right now. The file is ready for follow-up or a new visit.</p>
      </div>

      <!-- Financial file -->
      <div style="background:var(--bg-secondary); border-radius:var(--radius-md); border:1px solid var(--border-color); padding:20px; box-shadow:var(--shadow-sm);">
        <h4 style="font-size:0.9rem; font-weight:600; margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">Financial file</h4>
        <div style="font-size:0.85rem; display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; justify-content:space-between;">
            <span style="color:var(--text-secondary);">Paid</span>
            <strong>$${totalPaid.toLocaleString()}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; border-top:1px solid var(--border-color); padding-top:8px;">
            <span style="color:var(--text-secondary);">Outstanding</span>
            <strong style="color:var(--danger-color);">$${totalOutstanding.toLocaleString()}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- Treatment Plans & Invoices lists (Standard medical history layout) -->
    <div class="patient-main-records" style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:24px;">
      <div class="tabs-navigation">
        <button class="tab-btn active" data-tab="tab-plans">Treatment Plans</button>
        <button class="tab-btn" data-tab="tab-appts">Appointments</button>
        <button class="tab-btn" data-tab="tab-bills">Invoices</button>
        <button class="tab-btn" data-tab="tab-notes">Clinical Notes</button>
      </div>

      <!-- Treatment Plans -->
      <div class="tab-content-panel active" id="tab-plans">
        <div class="view-header-actions" style="margin-bottom:16px;">
          <h4>Procedures & Care Plans</h4>
          ${state.user.role !== 'patient' ? `<button class="btn btn-primary" id="btn-create-plan"><i data-lucide="plus-circle"></i>New Plan</button>` : ''}
        </div>
        <div id="plans-list-container">
          ${renderPlansAccordion(data.treatmentPlans)}
        </div>
      </div>

      <!-- Appointments -->
      <div class="tab-content-panel" id="tab-appts">
        <h4>Appointment History</h4>
        <div class="table-card" style="margin-top:16px;">
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Dentist</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${data.appointments.length === 0 ? '<tr><td colspan="4" style="text-align:center;">No appointments found.</td></tr>' : data.appointments.map(a => `
                  <tr>
                    <td><strong>${formatDateTime(a.start_time)}</strong></td>
                    <td>Dr. ${a.dentist_first} ${a.dentist_last}</td>
                    <td><span class="badge ${a.status === 'completed' ? 'success' : 'primary'}">${a.status}</span></td>
                    <td>${a.notes || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Invoices -->
      <div class="tab-content-panel" id="tab-bills">
        <h4>Invoice Records</h4>
        <div class="table-card" style="margin-top:16px;">
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${data.invoices.length === 0 ? '<tr><td colspan="6" style="text-align:center;">No invoice records.</td></tr>' : data.invoices.map(i => `
                  <tr>
                    <td><strong>INV-10${i.id}</strong></td>
                    <td>${i.due_date}</td>
                    <td>$${i.total_amount.toFixed(2)}</td>
                    <td>$${i.amount_paid.toFixed(2)}</td>
                    <td><span class="badge ${i.status === 'paid' ? 'success' : 'danger'}">${i.status}</span></td>
                    <td>
                      <button class="btn btn-secondary btn-icon" onclick="window.location.hash='invoice-${i.id}'; navigate('invoice-${i.id}');">
                        <i data-lucide="eye" style="width:14px;height:14px;"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Clinical Notes -->
      <div class="tab-content-panel" id="tab-notes">
        <div class="view-header-actions" style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
          <h4>Clinical History Notes</h4>
          ${state.user.role !== 'patient' ? `<button class="btn btn-secondary" id="btn-edit-medical-notes" style="display:flex; align-items:center; gap:6px;"><i data-lucide="edit-3" style="width:14px;height:14px;"></i>Edit Medical Notes</button>` : ''}
        </div>
        
        <div style="margin-bottom:16px;">
          <strong style="font-size:0.85rem; color:var(--text-secondary); display:block; margin-bottom:4px;">Medical Allergies:</strong>
          <span class="badge ${p.medical_allergies && p.medical_allergies.toLowerCase() !== 'none' ? 'danger' : 'success'}">${p.medical_allergies || 'None'}</span>
        </div>

        <strong style="font-size:0.85rem; color:var(--text-secondary); display:block; margin-bottom:4px;">Internal Diagnostic Logs:</strong>
        <div style="background:var(--bg-primary); padding:16px; border-radius:var(--radius-md); font-size:0.9rem;">
          ${p.notes ? p.notes.replace(/\n/g, '<br>') : 'No diagnosis notes logged yet.'}
        </div>
      </div>
    </div>
  `;

  // Bind events
  if (state.user.role !== 'patient') {
    document.getElementById('btn-create-plan').addEventListener('click', () => openCreatePlanModal(p.id));
    document.getElementById('btn-edit-medical-notes').addEventListener('click', () => openEditMedicalNotesModal(p));
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content-panel').forEach(panel => panel.classList.remove('active'));
      e.target.classList.add('active');
      document.getElementById(e.target.getAttribute('data-tab')).classList.add('active');
    });
  });

  lucide.createIcons();
}

function openEditMedicalNotesModal(patient) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container" style="width:600px;">
      <div class="modal-header">
        <h3>Edit Medical Notes — ${patient.first_name} ${patient.last_name}</h3>
        <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
      </div>
      <form id="edit-medical-notes-form">
        <div class="modal-body">
          <div class="form-group">
            <label>Medical Allergies</label>
            <input type="text" id="edit-p-allergies" value="${patient.medical_allergies || 'None'}" placeholder="e.g. Penicillin, Latex, None" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
          </div>
          
          <div class="form-group" style="position:relative;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label>Internal Diagnostic Notes</label>
              <button class="btn btn-secondary" type="button" id="btn-ai-optimize-notes" style="padding:4px 8px; font-size:0.75rem; background-color:rgba(79, 70, 229, 0.05); color:#4f46e5; border:1px dashed #4f46e5; display:flex; align-items:center; gap:4px;">
                <i data-lucide="sparkles" style="width:12px;height:12px;"></i>Optimize with AI
              </button>
            </div>
            <textarea id="edit-p-notes" rows="8" style="width:100%; font-family:inherit; padding:12px; border-radius:var(--radius-sm); border:1px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary);" placeholder="Type diagnosis notes here...">${patient.notes || ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  lucide.createIcons();

  // AI Optimize click handler
  document.getElementById('btn-ai-optimize-notes').addEventListener('click', async () => {
    const notesTextarea = document.getElementById('edit-p-notes');
    const allergiesInput = document.getElementById('edit-p-allergies');
    const rawNotes = notesTextarea.value;

    if (!rawNotes || rawNotes.trim() === '') {
      showToast('Please type some clinical notes to optimize.', 'warning');
      return;
    }

    const btn = document.getElementById('btn-ai-optimize-notes');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader-spinner" style="border-color:#4f46e5; border-top-color:transparent;"></span>Optimizing...';

    try {
      const optimizeRes = await fetch('/api/ai/optimize-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: rawNotes })
      });
      const data = await optimizeRes.json();
      if (optimizeRes.ok && data) {
        if (data.formattedNotes) {
          const cleanText = data.formattedNotes.replace(/<p>/g, '').replace(/<\/p>/g, '\n\n').replace(/<br\s*\/?>/g, '\n').replace(/<li>/g, '• ').replace(/<\/li>/g, '\n').replace(/<ul>/g, '').replace(/<\/ul>/g, '').trim();
          notesTextarea.value = cleanText;
        }
        if (data.allergies && data.allergies.toLowerCase() !== 'none') {
          allergiesInput.value = data.allergies;
          showToast('AI successfully optimized notes and extracted allergies!', 'success');
        } else {
          showToast('AI successfully optimized notes!', 'success');
        }
      } else {
        showToast(data.error || 'AI optimization failed.', 'danger');
      }
    } catch (err) {
      showToast('Network error querying AI helper.', 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
      lucide.createIcons();
    }
  });

  // Submit form handler
  document.getElementById('edit-medical-notes-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      firstName: patient.first_name,
      lastName: patient.last_name,
      email: patient.email,
      phone: patient.phone,
      dateOfBirth: patient.date_of_birth,
      gender: patient.gender,
      address: patient.address,
      allergies: document.getElementById('edit-p-allergies').value,
      notes: document.getElementById('edit-p-notes').value
    };

    try {
      const updateRes = await fetch(`/api/patients/${patient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (updateRes.ok) {
        showToast('Medical record updated successfully', 'success');
        modal.remove();
        navigate(`patient-360-${patient.id}`);
      } else {
        const err = await updateRes.json();
        showToast(err.error || 'Failed to update medical record', 'danger');
      }
    } catch (err) {
      showToast('Network error updating medical record.', 'danger');
    }
  });
}

function calculateAge(dobStr) {
  const dob = new Date(dobStr);
  const diff = Date.now() - dob.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function renderPlansAccordion(plans) {
  if (plans.length === 0) return '<div class="empty-state">No treatment plans created yet.</div>';

  return plans.map(plan => `
    <div class="stat-card" style="display:block; margin-top:16px; padding:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
        <div>
          <h4 style="font-size:1.05rem;">${plan.title}</h4>
          <span style="font-size:0.8rem; color:var(--text-muted);">Assigned Dentist: Dr. ${plan.dentist_first} ${plan.dentist_last} | Plan Cost: $${plan.total_cost.toFixed(2)}</span>
        </div>
        <span class="badge ${plan.status === 'active' ? 'primary' : 'success'}">${plan.status}</span>
      </div>
      <div class="table-responsive">
        <table style="background: transparent;">
          <thead>
            <tr>
              <th>Procedure</th>
              <th>Tooth #</th>
              <th>Price</th>
              <th>Status</th>
              ${state.user.role !== 'patient' ? '<th>Action</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${plan.items.map(item => `
              <tr>
                <td><strong>${item.treatment_name}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${item.notes ? item.notes : ''}</span></td>
                <td>${item.tooth_number ? item.tooth_number : 'General'}</td>
                <td>$${item.cost.toFixed(2)}</td>
                <td>
                  <span class="badge ${item.status === 'completed' ? 'success' : 'warning'}">${item.status}</span>
                </td>
                ${state.user.role !== 'patient' ? `
                  <td>
                    ${item.status === 'pending' ? `
                      <button class="btn btn-primary" style="padding:6px 12px; font-size:0.75rem;" onclick="completePlanItem(${item.id}, ${plan.patient_id})">
                        <i data-lucide="check" style="width:12px;height:12px;"></i> Complete
                      </button>
                    ` : '<i data-lucide="check-circle" style="color:var(--success-color); width:20px;height:20px;"></i>'}
                  </td>
                ` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `).join('');
}

// Function to trigger procedure completion and issue invoice
async function completePlanItem(itemId, patientId) {
  const res = await fetch(`/api/plans/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'completed' })
  });

  if (res.ok) {
    showToast('Procedure marked as completed. Unpaid invoice generated.', 'success');
    addNotification('Procedure completed. Patient balance updated.');
    // Re-render Patient 360
    navigate(`patient-360-${patientId}`);
  } else {
    showToast('Failed to update treatment status', 'danger');
  }
}

// Create Treatment Plan Modal & Catalog integration
async function openCreatePlanModal(patientId) {
  // Fetch treatments catalog
  const res = await fetch('/api/treatments');
  const treatments = await res.json();
  
  // Fetch dentists
  const resDentist = await fetch('/api/dentists');
  const dentists = await resDentist.json();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container" style="width: 700px;">
      <div class="modal-header">
        <h3>Build Dental Treatment Plan</h3>
        <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label>Plan Title*</label>
            <input type="text" id="tp-title" required placeholder="e.g. Inlay Restoration & Root Canal">
          </div>
          <div class="form-group">
            <label>Responsible Dentist*</label>
            <select id="tp-dentist">
              ${dentists.map(d => `<option value="${d.id}">Dr. ${d.first_name} ${d.last_name}</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="background: rgba(79, 70, 229, 0.05); border: 1px dashed #4f46e5; border-radius: var(--radius-md); padding: 12px; margin-top: 12px; margin-bottom: 16px;">
          <label style="font-size: 0.8rem; font-weight: 700; color: #4f46e5; display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <i data-lucide="sparkles" style="width: 14px; height: 14px;"></i>AI Smart Suggestion Assistant
          </label>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="ai-symptoms-input" placeholder="Describe symptoms, e.g. pain in molar 19, patient needs a porcelain crown." style="flex: 1; font-size: 0.85rem; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-primary); color: var(--text-primary);">
            <button class="btn btn-primary" type="button" id="btn-ai-suggest-plan" style="padding: 8px 16px; background-color: #4f46e5; display: flex; align-items: center; gap: 6px;">
              <i data-lucide="wand-2" style="width: 14px; height: 14px;"></i>Suggest
            </button>
          </div>
        </div>

        <div style="border-top:1px solid var(--border-color); padding-top:16px; margin-top:8px;">
          <h4 style="font-size:0.95rem; margin-bottom:12px;">Add Dental Procedures</h4>
          <div class="form-row">
            <div class="form-group">
              <label>Select Procedure</label>
              <select id="item-procedure">
                ${treatments.map(t => `<option value="${t.id}" data-cost="${t.base_cost}">${t.name} ($${t.base_cost})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Tooth Number(s) (Optional)</label>
              <input type="text" id="item-tooth" placeholder="e.g. 14, 18, General">
            </div>
          </div>
          <div class="form-group">
            <label>Clinical Notes for this Procedure</label>
            <input type="text" id="item-notes" placeholder="e.g. Deep cavity extraction required.">
          </div>
          <button class="btn btn-secondary" type="button" id="btn-add-item-to-plan">Add to List</button>
        </div>

        <div class="plan-items-list" id="added-plan-items">
          <p style="text-align:center; color:var(--text-muted); font-size:0.85rem; padding:16px;">No procedures added to the plan yet.</p>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button type="button" class="btn btn-primary" id="btn-submit-treatment-plan">Create Plan</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  lucide.createIcons();

  const selectedItems = [];
  const itemsContainer = document.getElementById('added-plan-items');

  // AI Suggestion Handler
  document.getElementById('btn-ai-suggest-plan').addEventListener('click', async () => {
    const input = document.getElementById('ai-symptoms-input');
    const symptoms = input.value;
    if (!symptoms || symptoms.trim() === '') {
      showToast('Please type the symptoms or care description.', 'warning');
      return;
    }

    const btn = document.getElementById('btn-ai-suggest-plan');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader-spinner" style="border-color: #ffffff; border-top-color: transparent;"></span>Suggesting...';

    try {
      const suggestRes = await fetch('/api/ai/suggest-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms })
      });
      const data = await suggestRes.json();
      if (suggestRes.ok && Array.isArray(data)) {
        if (data.length === 0) {
          showToast('AI suggested no matching treatments from the catalog.', 'info');
        } else {
          data.forEach(sug => {
            const treat = treatments.find(t => String(t.id) === String(sug.treatmentId));
            if (treat) {
              selectedItems.push({
                treatmentId: sug.treatmentId,
                name: treat.name,
                cost: sug.cost || treat.base_cost,
                toothNumber: sug.toothNumber || '',
                notes: sug.notes || ''
              });
            }
          });
          renderAddedItems();
          showToast(`AI successfully added ${data.length} procedures!`, 'success');
          input.value = '';
        }
      } else {
        showToast(data.error || 'AI suggestion failed.', 'danger');
      }
    } catch (err) {
      showToast('Network error querying AI helper.', 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
      lucide.createIcons();
    }
  });

  // Trigger Add procedure to list
  document.getElementById('btn-add-item-to-plan').addEventListener('click', () => {
    const select = document.getElementById('item-procedure');
    const selectedOption = select.options[select.selectedIndex];
    const treatmentId = select.value;
    const name = selectedOption.text;
    const cost = parseFloat(selectedOption.getAttribute('data-cost'));
    const toothNumber = document.getElementById('item-tooth').value;
    const notes = document.getElementById('item-notes').value;

    selectedItems.push({ treatmentId, name, cost, toothNumber, notes });
    
    // Clear inputs
    document.getElementById('item-tooth').value = '';
    document.getElementById('item-notes').value = '';

    renderAddedItems();
  });

  function renderAddedItems() {
    if (selectedItems.length === 0) {
      itemsContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:0.85rem; padding:16px;">No procedures added to the plan yet.</p>';
      return;
    }
    
    itemsContainer.innerHTML = selectedItems.map((item, idx) => `
      <div class="plan-item-row">
        <div>
          <strong>${item.name}</strong><br>
          <span style="font-size:0.75rem; color:var(--text-secondary);">Tooth: ${item.toothNumber || 'General'} | Notes: ${item.notes || 'None'}</span>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <span>$${item.cost.toFixed(2)}</span>
          <button class="btn-icon" style="color:var(--danger-color);" onclick="removeItemFromPlanList(${idx})"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
        </div>
      </div>
    `).join('');
    
    // Bind onclick helper to window object for easy deletion
    window.removeItemFromPlanList = (idx) => {
      selectedItems.splice(idx, 1);
      renderAddedItems();
    };

    lucide.createIcons();
  }

  // Create Plan endpoint integration
  document.getElementById('btn-submit-treatment-plan').addEventListener('click', async () => {
    const title = document.getElementById('tp-title').value;
    const dentistId = document.getElementById('tp-dentist').value;

    if (!title || selectedItems.length === 0) {
      showToast('Plan title and at least one procedure are required.', 'warning');
      return;
    }

    const payload = {
      patientId,
      dentistId,
      title,
      items: selectedItems
    };

    const submitRes = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (submitRes.ok) {
      showToast('Treatment plan built successfully', 'success');
      modal.remove();
      // Reload Patient File
      navigate(`patient-360-${patientId}`);
    } else {
      const err = await submitRes.json();
      showToast(err.error || 'Failed to submit treatment plan', 'danger');
    }
  });
}

// ==========================================================================
// 3. INTERACTIVE APPOINTMENTS SCHEDULER (Monthly Grid view)
// ==========================================================================
async function renderAppointmentsView(container) {
  // Fetch lists
  const resDentists = await fetch('/api/dentists');
  const dentists = await resDentists.json();
  state.dentists = dentists;

  const dentistFilterHtml = state.user.role === 'dentist' ? `
    <label style="display:flex; align-items:center; gap:6px; font-size:0.85rem; font-weight:600; cursor:pointer; color:var(--text-primary); margin-left:16px;">
      <input type="checkbox" id="chk-my-appts-only" checked style="width:16px; height:16px; margin:0; cursor:pointer;">
      <span>Show My Appointments Only</span>
    </label>
  ` : '';

  container.innerHTML = `
    <div class="view-header-actions">
      <div>
        <h4 id="calendar-month-year" style="font-size:1.2rem; font-weight:600;">August 2026</h4>
      </div>
      <button class="btn btn-primary" id="btn-add-appt"><i data-lucide="calendar-plus"></i>Book Appointment</button>
    </div>

    <div class="calendar-view">
      <div class="calendar-header">
        <div style="display:flex; gap:10px; align-items:center;">
          <button class="btn btn-secondary" id="btn-cal-prev"><i data-lucide="chevron-left"></i></button>
          <button class="btn btn-secondary" id="btn-cal-today">Today</button>
          <button class="btn btn-secondary" id="btn-cal-next"><i data-lucide="chevron-right"></i></button>
          ${dentistFilterHtml}
        </div>
        <div class="legend" style="display:flex; gap:15px; font-size:0.8rem; color:var(--text-secondary);">
          <span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background-color:#eab308;margin-right:4px;"></span>Pending</span>
          <span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background-color:#3b82f6;margin-right:4px;"></span>Scheduled</span>
          <span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background-color:#10b981;margin-right:4px;"></span>Completed</span>
          <span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background-color:#ef4444;margin-right:4px;"></span>Cancelled</span>
        </div>
      </div>
      
      <div class="calendar-grid" id="calendar-days-container"></div>
    </div>
  `;

  document.getElementById('btn-add-appt').addEventListener('click', openBookApptModal);
  
  // Set initial month
  let currentDate = new Date(2026, 7, 23); // August 23, 2026 (matching system date)
  
  document.getElementById('btn-cal-prev').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    drawCalendar(currentDate);
  });
  document.getElementById('btn-cal-next').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    drawCalendar(currentDate);
  });
  document.getElementById('btn-cal-today').addEventListener('click', () => {
    currentDate = new Date(2026, 7, 23);
    drawCalendar(currentDate);
  });

  const chk = document.getElementById('chk-my-appts-only');
  if (chk) {
    chk.addEventListener('change', () => {
      drawCalendar(currentDate);
    });
  }

  await drawCalendar(currentDate);
}

async function drawCalendar(date) {
  const container = document.getElementById('calendar-days-container');
  const monthYearLabel = document.getElementById('calendar-month-year');
  
  const year = date.getFullYear();
  const month = date.getMonth();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  monthYearLabel.textContent = `${monthNames[month]} ${year}`;

  // Fetch appointments for display
  const res = await fetch('/api/appointments');
  let appts = await res.json();

  const chk = document.getElementById('chk-my-appts-only');
  if (chk && chk.checked && state.user.role === 'dentist') {
    appts = appts.filter(a => String(a.dentist_id) === String(state.user.relatedId));
  }

  // Create grid headers
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let gridHTML = dayHeaders.map(day => `<div class="calendar-day-header">${day}</div>`).join('');

  // Start mapping dates
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Blank slots for previous month
  for (let i = 0; i < firstDayIndex; i++) {
    gridHTML += `<div class="calendar-cell empty" style="min-height: 100px; background: var(--bg-primary); opacity: 0.5;"></div>`;
  }

  // Draw day cells
  for (let day = 1; day <= totalDays; day++) {
    const isToday = (day === 23 && month === 7 && year === 2026); // Mocked center date
    const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Filter appointments for this date
    const dayAppts = appts.filter(a => a.start_time.startsWith(cellDateStr));

    const apptBadges = dayAppts.map(a => {
      let color = '#3b82f6'; // Scheduled default
      if (a.status === 'pending') color = '#eab308';
      if (a.status === 'completed') color = '#10b981';
      if (a.status === 'cancelled') color = '#ef4444';
      if (a.status === 'no-show') color = '#f59e0b';
      
      const patName = `${a.patient_first} ${a.patient_last}`;
      return `
        <div class="calendar-appt-badge" style="background-color: ${color};" onclick="event.stopPropagation(); openEditApptModal(${a.id})" title="${formatTime(a.start_time)}: ${patName}">
          ${formatTime(a.start_time)}: ${patName}
        </div>
      `;
    }).join('');

    gridHTML += `
      <div class="calendar-cell ${isToday ? 'today' : ''}" style="cursor: pointer;" onclick="openBookApptModalForDate('${cellDateStr}')">
        <div class="calendar-cell-header">${day}</div>
        ${apptBadges}
      </div>
    `;
  }

  container.innerHTML = gridHTML;
  lucide.createIcons();
}

// Book Appointment Modal
async function openBookApptModal() {
  await openBookApptModalForDate('');
}

async function openBookApptModalForDate(dateStr) {
  // Fetch Patients database
  const resPat = await fetch('/api/patients');
  const patients = await resPat.json();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3>Book Clinic Appointment</h3>
        <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
      </div>
      <form id="book-appt-form">
        <div class="modal-body">
          <div class="form-group">
            <label>Select Patient*</label>
            <select id="appt-patient" required>
              ${patients.map(p => `<option value="${p.id}">${p.first_name} ${p.last_name} (${p.phone})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Responsible Dentist*</label>
            <select id="appt-dentist" required>
              ${state.dentists.map(d => `<option value="${d.id}">Dr. ${d.first_name} ${d.last_name}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Appointment Date*</label>
              <input type="date" id="appt-date" required value="${dateStr ? dateStr : '2026-08-24'}">
            </div>
            <div class="form-group">
              <label>Time Slot*</label>
              <select id="appt-time" required>
                <option value="09:00">09:00 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="11:00">11:00 AM</option>
                <option value="13:00">01:00 PM</option>
                <option value="14:00">02:00 PM</option>
                <option value="15:00">03:00 PM</option>
                <option value="16:00">04:00 PM</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Booking Reason / Clinical Notes</label>
            <input type="text" id="appt-notes" placeholder="e.g. Scaling & prophylaxis consultation">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Schedule Appointment</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  lucide.createIcons();

  document.getElementById('book-appt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('appt-date').value;
    const time = document.getElementById('appt-time').value;
    
    // Generate ISO timestamps
    const startTimeStr = `${date}T${time}:00`;
    const startObj = new Date(startTimeStr);
    const endObj = new Date(startObj);
    endObj.setHours(startObj.getHours() + 1); // 1-hour appointment standard

    const payload = {
      patientId: document.getElementById('appt-patient').value,
      dentistId: document.getElementById('appt-dentist').value,
      startTime: startObj.toISOString(),
      endTime: endObj.toISOString(),
      notes: document.getElementById('appt-notes').value
    };

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast('Appointment scheduled successfully.', 'success');
      modal.remove();
      navigate('appointments');
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to schedule appointment', 'danger');
    }
  });
}

// Edit / Status Appointment dialog
async function openEditApptModal(apptId) {
  // Fetch detailed appointment
  const res = await fetch('/api/appointments');
  const appts = await res.json();
  const a = appts.find(item => item.id === apptId);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3>Manage Appointment status</h3>
        <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
      </div>
      <form id="edit-appt-form">
        <div class="modal-body">
          <p style="margin-bottom:16px;"><strong>Patient:</strong> ${a.patient_first} ${a.patient_last}</p>
          <p style="margin-bottom:16px;"><strong>Scheduled Time:</strong> ${formatDateTime(a.start_time)}</p>
          <div class="form-group">
            <label>Update Status</label>
            <select id="edit-appt-status">
              <option value="pending" ${a.status === 'pending' ? 'selected' : ''}>Pending Approval</option>
              <option value="scheduled" ${a.status === 'scheduled' ? 'selected' : ''}>Scheduled / Accepted</option>
              <option value="completed" ${a.status === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="cancelled" ${a.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
              <option value="no-show" ${a.status === 'no-show' ? 'selected' : ''}>No-Show</option>
            </select>
          </div>
          <div class="form-group">
            <label>Modify Session Notes</label>
            <input type="text" id="edit-appt-notes" value="${a.notes || ''}">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  lucide.createIcons();

  document.getElementById('edit-appt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      status: document.getElementById('edit-appt-status').value,
      notes: document.getElementById('edit-appt-notes').value
    };

    const updateRes = await fetch(`/api/appointments/${apptId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (updateRes.ok) {
      showToast('Appointment updated successfully', 'success');
      modal.remove();
      navigate('appointments');
    } else {
      showToast('Failed to update status', 'danger');
    }
  });
}

// ==========================================================================
// 4. BILLING & INVOICES (Payments collection module)
// ==========================================================================
async function renderBillingView(container) {
  const res = await fetch('/api/invoices');
  const invoices = await res.json();

  container.innerHTML = `
    <div class="table-card" style="margin-top: 10px;">
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Invoice ID</th>
              <th>Patient Name</th>
              <th>Due Date</th>
              <th>Treatment Plan</th>
              <th>Billed Amount</th>
              <th>Amount Paid</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${invoices.length === 0 ? '<tr><td colspan="8" style="text-align:center;">No bills found.</td></tr>' : invoices.map(i => `
              <tr>
                <td><strong>INV-10${i.id}</strong></td>
                <td>${i.first_name} ${i.last_name}</td>
                <td>${i.due_date}</td>
                <td>${i.plan_title ? i.plan_title : 'General Care'}</td>
                <td>$${i.total_amount.toFixed(2)}</td>
                <td>$${i.amount_paid.toFixed(2)}</td>
                <td><span class="badge ${i.status === 'paid' ? 'success' : i.status === 'unpaid' ? 'danger' : 'warning'}">${i.status}</span></td>
                <td>
                  <button class="btn btn-secondary btn-icon" onclick="window.location.hash='invoice-${i.id}'; navigate('invoice-${i.id}');" title="Collect Payment/View Invoice">
                    <i data-lucide="eye" style="width:16px;height:16px;"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  lucide.createIcons();
}

async function renderInvoiceView(container, invoiceId) {
  const res = await fetch(`/api/invoices/${invoiceId}`);
  if (!res.ok) {
    container.innerHTML = '<div class="toast danger">Invoice not found.</div>';
    return;
  }
  const data = await res.json();
  const i = data.invoice;
  const balance = i.total_amount - i.amount_paid;

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:32px;">
      <!-- Invoice Sheet Card -->
      <div class="stat-card" style="flex:2; display:block; padding:40px; background:#fff; color:#000;">
        <div style="display:flex; justify-content:space-between; margin-bottom:40px;">
          <div>
            <h2 style="font-size:1.8rem; color:#4f46e5;">DentalFlow</h2>
            <p style="font-size:0.85rem; color:#6b7280;">123 Premium Dental Blvd, Suite A<br>Seattle, WA 98101 | (555) 0100</p>
          </div>
          <div style="text-align:right;">
            <h2 style="font-size:1.5rem; font-weight:600;">INVOICE</h2>
            <p style="font-size:0.9rem; font-weight:500;">INV-10${i.id}</p>
            <p style="font-size:0.8rem; color:#6b7280; margin-top:4px;">Date: ${new Date(i.created_at).toLocaleDateString()}<br>Due: ${i.due_date}</p>
          </div>
        </div>

        <div style="margin-bottom:30px;">
          <h4 style="font-size:0.8rem; color:#9ca3af; text-transform:uppercase; margin-bottom:8px;">Billed To:</h4>
          <p style="font-weight:600; font-size:1.05rem;">${i.first_name} ${i.last_name}</p>
          <p style="font-size:0.85rem; color:#4b5563;">${i.phone ? i.phone : ''}<br>${i.email ? i.email : ''}<br>${i.address ? i.address : ''}</p>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:30px;">
          <thead>
            <tr style="border-bottom:2px solid #e5e7eb; text-align:left;">
              <th style="padding:12px 0; background:transparent; color:#374151;">Description</th>
              <th style="padding:12px 0; background:transparent; color:#374151; text-align:right;">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #f3f4f6;">
              <td style="padding:12px 0;">Dental Treatment plan - Completed items: ${i.plan_title ? i.plan_title : 'General Care'}</td>
              <td style="padding:12px 0; text-align:right;">$${i.total_amount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div style="display:flex; justify-content:flex-end;">
          <div style="width:250px; font-size:0.9rem;">
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f3f4f6;">
              <span>Subtotal:</span>
              <span>$${i.total_amount.toFixed(2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f3f4f6;">
              <span>Discount:</span>
              <span>$0.00</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:8px 0; font-weight:600; font-size:1.05rem;">
              <span>Grand Total:</span>
              <span>$${i.total_amount.toFixed(2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:8px 0; color:#10b981; font-weight:500;">
              <span>Total Paid:</span>
              <span>$${i.amount_paid.toFixed(2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:8px 0; color:#ef4444; font-weight:600; border-top:2px solid #e5e7eb; margin-top:8px;">
              <span>Balance Due:</span>
              <span>$${balance.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Left Collect Payment Form (Only for Staff/Admin) -->
      ${state.user.role !== 'patient' && balance > 0 ? `
        <div class="stat-card" style="flex:1; display:block; padding:24px;">
          <h3>Collect Bill Payment</h3>
          <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:16px;">Log manual card, cash or insurance payment details below.</p>
          <form id="record-payment-form">
            <div class="form-group">
              <label>Amount to Collect ($)*</label>
              <input type="number" id="pay-amount" required step="0.01" max="${balance}" value="${balance}">
            </div>
            <div class="form-group">
              <label>Payment Method*</label>
              <select id="pay-method" required>
                <option value="card">Credit/Debit Card</option>
                <option value="cash">Cash Payment</option>
                <option value="insurance">Insurance Claim</option>
              </select>
            </div>
            <div class="form-group">
              <label>Transaction Reference ID</label>
              <input type="text" id="pay-ref" placeholder="TX-778899">
            </div>
            <button type="submit" class="btn btn-primary btn-block">Process Payment</button>
          </form>
        </div>
      ` : ''}
    </div>
  `;

  // Process payment listener
  if (state.user.role !== 'patient' && balance > 0) {
    document.getElementById('record-payment-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        amount: parseFloat(document.getElementById('pay-amount').value),
        paymentMethod: document.getElementById('pay-method').value,
        transactionRef: document.getElementById('pay-ref').value
      };

      const payRes = await fetch(`/api/invoices/${invoiceId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (payRes.ok) {
        showToast('Payment processed and balance updated.', 'success');
        addNotification('Payment collected. Invoice status updated.');
        navigate(`invoice-${invoiceId}`);
      } else {
        const err = await payRes.json();
        showToast(err.error || 'Failed to process payment', 'danger');
      }
    });
  }
}

// ==========================================================================
// 5. CRM BOARD VIEW (Leads Kanban pipeline)
// ==========================================================================
async function renderLeadsView(container) {
  const res = await fetch('/api/leads');
  const leads = await res.json();
  
  const resFollow = await fetch('/api/followups');
  const followups = await resFollow.json();

  container.innerHTML = `
    <div class="view-header-actions" style="margin-bottom:20px;">
      <h4 style="font-size:1.1rem;">Sales Funnel & Call Lists</h4>
      <button class="btn btn-primary" id="btn-add-lead"><i data-lucide="plus"></i>Add Lead</button>
    </div>

    <!-- Kanban Board -->
    <div class="crm-board" style="margin-bottom:40px;">
      <div class="crm-column">
        <div class="crm-column-header"><span>New Leads</span> <span class="badge primary">${leads.filter(l=>l.status==='new').length}</span></div>
        <div class="crm-card-list" id="col-new">${renderLeadCards(leads, 'new')}</div>
      </div>
      <div class="crm-column">
        <div class="crm-column-header"><span>Contacted</span> <span class="badge warning">${leads.filter(l=>l.status==='contacted').length}</span></div>
        <div class="crm-card-list" id="col-contacted">${renderLeadCards(leads, 'contacted')}</div>
      </div>
      <div class="crm-column">
        <div class="crm-column-header"><span>Converted</span> <span class="badge success">${leads.filter(l=>l.status==='converted').length}</span></div>
        <div class="crm-card-list" id="col-converted">${renderLeadCards(leads, 'converted')}</div>
      </div>
      <div class="crm-column">
        <div class="crm-column-header"><span>Lost</span> <span class="badge danger">${leads.filter(l=>l.status==='lost').length}</span></div>
        <div class="crm-card-list" id="col-lost">${renderLeadCards(leads, 'lost')}</div>
      </div>
    </div>

    <!-- Follow Up Task List -->
    <div class="chart-card">
      <div style="display:flex; justify-content:space-between; margin-bottom:16px;">
        <h3>Follow-Up & Call Schedules</h3>
        <button class="btn btn-secondary" style="padding:6px 12px; font-size:0.8rem;" id="btn-add-followup">Schedule Follow-up</button>
      </div>
      <div class="table-card">
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Scheduled Date</th>
                <th>Recipient (Patient/Lead)</th>
                <th>Task Status</th>
                <th>Clinical/CRM Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${followups.length === 0 ? '<tr><td colspan="5" style="text-align:center;">No follow-up schedules created.</td></tr>' : followups.map(f => {
                const target = f.patient_id ? `${f.pat_first} ${f.pat_last} (Patient)` : `${f.lead_first} ${f.lead_last} (Lead)`;
                return `
                  <tr>
                    <td><strong>${f.scheduled_date}</strong></td>
                    <td>${target}</td>
                    <td><span class="badge ${f.status === 'completed' ? 'success' : 'warning'}">${f.status}</span></td>
                    <td>${f.notes ? f.notes : 'N/A'}</td>
                    <td>
                      ${f.status === 'pending' ? `
                        <button class="btn btn-primary" style="padding:6px 12px; font-size:0.75rem;" onclick="completeFollowup(${f.id})">
                          Mark Done
                        </button>
                      ` : '<span style="color:var(--success-color); font-weight:500;">Closed</span>'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-add-lead').addEventListener('click', openAddLeadModal);
  document.getElementById('btn-add-followup').addEventListener('click', () => openAddFollowupModal(leads));
  
  lucide.createIcons();
}

function renderLeadCards(leads, status) {
  const filtered = leads.filter(l => l.status === status);
  if (filtered.length === 0) return '<div class="empty-state" style="padding:16px 0;">Empty</div>';
  
  return filtered.map(l => `
    <div class="crm-card" onclick="openLeadDetailModal(${l.id})">
      <h4>${l.first_name} ${l.last_name}</h4>
      <p><i data-lucide="phone" style="width:12px;height:12px;vertical-align:middle;"></i> ${l.phone || 'No phone'}</p>
      <div class="crm-card-footer">
        <span>Source: ${l.source}</span>
      </div>
    </div>
  `).join('');
}

// Add Lead Dialog
function openAddLeadModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3>Create CRM Lead</h3>
        <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
      </div>
      <form id="add-lead-form">
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>First Name*</label>
              <input type="text" id="l-first-name" required placeholder="Alice">
            </div>
            <div class="form-group">
              <label>Last Name*</label>
              <input type="text" id="l-last-name" required placeholder="King">
            </div>
          </div>
          <div class="form-group">
            <label>Phone Number</label>
            <input type="tel" id="l-phone" placeholder="555-0188">
          </div>
          <div class="form-group">
            <label>Email Address</label>
            <input type="email" id="l-email" placeholder="alice@email.com">
          </div>
          <div class="form-group">
            <label>Lead Acquisition Source</label>
            <select id="l-source">
              <option value="web">Web Booking / Website</option>
              <option value="social">Social Media Ads</option>
              <option value="referral">Doctor / Patient Referral</option>
              <option value="walkin">Walk-in visit</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Lead</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  lucide.createIcons();

  document.getElementById('add-lead-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      firstName: document.getElementById('l-first-name').value,
      lastName: document.getElementById('l-last-name').value,
      phone: document.getElementById('l-phone').value,
      email: document.getElementById('l-email').value,
      source: document.getElementById('l-source').value
    };

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast('Lead created in Sales board.', 'success');
      modal.remove();
      navigate('leads');
    } else {
      showToast('Failed to create lead', 'danger');
    }
  });
}

// Manage Single Lead pipeline
async function openLeadDetailModal(leadId) {
  const res = await fetch('/api/leads');
  const leads = await res.json();
  const lead = leads.find(l => l.id === leadId);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3>Pipeline Lead Manager</h3>
        <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
      </div>
      <form id="edit-lead-form">
        <div class="modal-body">
          <p style="margin-bottom:16px;"><strong>Lead Name:</strong> ${lead.first_name} ${lead.last_name}</p>
          <p style="margin-bottom:16px;"><strong>Origin Source:</strong> ${lead.source}</p>
          <div class="form-group">
            <label>Update Sales Funnel Status</label>
            <select id="edit-lead-status">
              <option value="new" ${lead.status === 'new' ? 'selected' : ''}>New Lead</option>
              <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>Contacted</option>
              <option value="converted" ${lead.status === 'converted' ? 'selected' : ''}>Converted (Patient profile is auto created)</option>
              <option value="lost" ${lead.status === 'lost' ? 'selected' : ''}>Lost Lead</option>
            </select>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="edit-lead-email" value="${lead.email || ''}">
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="tel" id="edit-lead-phone" value="${lead.phone || ''}">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Update Pipeline</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  lucide.createIcons();

  document.getElementById('edit-lead-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      status: document.getElementById('edit-lead-status').value,
      email: document.getElementById('edit-lead-email').value,
      phone: document.getElementById('edit-lead-phone').value
    };

    const resUpdate = await fetch(`/api/leads/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (resUpdate.ok) {
      showToast('Lead pipeline status synced.', 'success');
      if (payload.status === 'converted') {
        addNotification(`Lead ${lead.first_name} ${lead.last_name} converted to Patient.`);
      }
      modal.remove();
      navigate('leads');
    } else {
      showToast('Failed to update lead status', 'danger');
    }
  });
}

// Complete Followup callback
async function completeFollowup(fid) {
  const res = await fetch(`/api/followups/${fid}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'completed', notes: 'Call finished successfully.' })
  });

  if (res.ok) {
    showToast('Follow-up task closed.', 'success');
    navigate('leads');
  } else {
    showToast('Failed to close task', 'danger');
  }
}

// Add Follow-up task dialog
function openAddFollowupModal(leads) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3>Schedule Follow-Up Task</h3>
        <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
      </div>
      <form id="add-follow-form">
        <div class="modal-body">
          <div class="form-group">
            <label>Link to Lead (Optional)</label>
            <select id="follow-lead">
              <option value="">-- No Link --</option>
              ${leads.map(l => `<option value="${l.id}">${l.first_name} ${l.last_name} (Lead)</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Scheduled Call Date*</label>
            <input type="date" id="follow-date" required value="2026-08-24">
          </div>
          <div class="form-group">
            <label>Task Instructions / Notes</label>
            <textarea id="follow-notes" rows="3" placeholder="e.g. Follow up on whitening cost estimate sent last week."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Schedule Call</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  lucide.createIcons();

  document.getElementById('add-follow-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      leadId: document.getElementById('follow-lead').value || null,
      scheduledDate: document.getElementById('follow-date').value,
      notes: document.getElementById('follow-notes').value
    };

    const res = await fetch('/api/followups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast('Follow-up task scheduled.', 'success');
      modal.remove();
      navigate('leads');
    } else {
      showToast('Failed to schedule call', 'danger');
    }
  });
}

// ==========================================================================
// 6. ONLINE PATIENT BOOKING PORTAL
// ==========================================================================
async function renderPatientBookingPortal(container) {
  // Fetch dentists
  const res = await fetch('/api/dentists');
  const dentists = await res.json();

  container.innerHTML = `
    <div class="stat-card" style="max-width:600px; margin: 0 auto; display:block; padding:32px;">
      <h3 style="margin-bottom:16px;">Book an Appointment</h3>
      <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:24px;">Select your preferred date, dentist, and appointment reason. A clinic agent will review your request.</p>
      
      <form id="portal-booking-form">
        <div class="form-group">
          <label>Preferred Dentist</label>
          <select id="pb-dentist" required>
            ${dentists.map(d => `<option value="${d.id}">Dr. ${d.first_name} ${d.last_name} (${d.specialization})</option>`).join('')}
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Preferred Date</label>
            <input type="date" id="pb-date" required value="2026-08-25">
          </div>
          <div class="form-group">
            <label>Preferred Time Slot</label>
            <select id="pb-time" required>
              <option value="09:00">09:00 AM</option>
              <option value="10:00">10:00 AM</option>
              <option value="11:00">11:00 AM</option>
              <option value="13:00">01:00 PM</option>
              <option value="14:00">02:00 PM</option>
              <option value="15:00">03:00 PM</option>
              <option value="16:00">04:00 PM</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Reason for Visit</label>
          <input type="text" id="pb-notes" placeholder="e.g. Regular teeth cleaning / Tooth pain consultation">
        </div>

        <button type="submit" class="btn btn-primary btn-block">Confirm Appointment Request</button>
      </form>
    </div>
  `;

  document.getElementById('portal-booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('pb-date').value;
    const time = document.getElementById('pb-time').value;

    const startObj = new Date(`${date}T${time}:00`);
    const endObj = new Date(startObj);
    endObj.setHours(startObj.getHours() + 1);

    const payload = {
      dentistId: document.getElementById('pb-dentist').value,
      startTime: startObj.toISOString(),
      endTime: endObj.toISOString(),
      notes: document.getElementById('pb-notes').value
    };

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast('Booking requested successfully. We will follow up shortly!', 'success');
      document.getElementById('pb-notes').value = '';
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to book slot', 'danger');
    }
  });
}

// Patient Treatment & medical Records portal sub-view
async function renderPatientRecordsPortal(container) {
  // Patients fetch their own 360 profile directly
  const patientId = state.user.relatedId;
  if (!patientId) {
    container.innerHTML = '<div class="toast danger">Patient record linkage missing. Please contact staff.</div>';
    return;
  }
  
  const res = await fetch(`/api/patients/${patientId}`);
  const data = await res.json();

  container.innerHTML = `
    <div style="max-width:800px; margin: 0 auto;">
      <h3 style="margin-bottom:24px;">My Medical Records</h3>
      
      <div class="stat-card" style="display:block;">
        <p style="font-weight:600; margin-bottom:8px;">Allergy Registry</p>
        <span class="badge ${data.patient.medical_allergies && data.patient.medical_allergies.toLowerCase() !== 'none' ? 'danger' : 'success'}">
          ${data.patient.medical_allergies ? data.patient.medical_allergies : 'None'}
        </span>
        <p style="font-weight:600; margin-top:20px; margin-bottom:8px;">Clinical Diagnostic Notes</p>
        <div style="background:var(--bg-primary); padding:16px; border-radius:var(--radius-md); font-size:0.9rem;">
          ${data.patient.notes ? data.patient.notes.replace(/\n/g, '<br>') : 'No clinical logs recorded.'}
        </div>
      </div>
    </div>
  `;
  lucide.createIcons();
}

async function renderPatientTreatmentPlansPortal(container) {
  const patientId = state.user.relatedId;
  if (!patientId) {
    container.innerHTML = '<div class="toast danger">Patient record linkage missing. Please contact staff.</div>';
    return;
  }
  
  const res = await fetch(`/api/patients/${patientId}`);
  const data = await res.json();

  container.innerHTML = `
    <div style="max-width:800px; margin: 0 auto;">
      <h3 style="margin-bottom:24px;">My Treatment Plans</h3>
      
      <!-- Treatment Plans -->
      <div class="stat-card" style="display:block;">
        ${renderPlansAccordion(data.treatmentPlans)}
      </div>
    </div>
  `;
  lucide.createIcons();
}

// ==========================================================================
// 7. USER & ROLE MANAGEMENT VIEW (ADMIN ONLY)
// ==========================================================================
async function renderUsersView(container, roleFilter = null) {
  container.innerHTML = `
    <div class="view-header-actions">
      <div class="search-input-wrapper">
        <i data-lucide="search"></i>
        <input type="text" id="user-search" placeholder="Search by name, email, or role...">
      </div>
      <button class="btn btn-primary" id="btn-add-user"><i data-lucide="user-plus"></i>Add User Account</button>
    </div>

    <div class="table-card">
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>User Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Specialization/License</th>
              <th>Date Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="users-table-body">
            <tr><td colspan="7" style="text-align:center;">Loading user accounts...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Bind events
  const searchInput = document.getElementById('user-search');
  searchInput.addEventListener('input', debounce(() => fetchUsersList(searchInput.value, roleFilter), 300));
  
  document.getElementById('btn-add-user').addEventListener('click', openAddUserModal);

  // Initial load
  await fetchUsersList('', roleFilter);
}

async function fetchUsersList(query = '', roleFilter = null) {
  try {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Failed to load user accounts.');
    let users = await res.json();

    if (roleFilter) {
      users = users.filter(u => u.role === roleFilter);
    }

    if (query) {
      const q = query.toLowerCase();
      users = users.filter(u => 
        (u.first_name && u.first_name.toLowerCase().includes(q)) ||
        (u.last_name && u.last_name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q)) ||
        (u.specialization && u.specialization.toLowerCase().includes(q))
      );
    }

    const tbody = document.getElementById('users-table-body');
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No user accounts found.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => {
      const roleBadge = u.role === 'admin' ? 'danger' : (u.role === 'dentist' ? 'primary' : (u.role === 'staff' ? 'warning' : 'success'));
      const specializationText = u.role === 'dentist' 
        ? `<strong>${u.specialization || 'General'}</strong><br><span style="font-size: 0.75rem; color: var(--text-muted);">${u.license_number || 'N/A'}</span>`
        : '<span style="color: var(--text-muted);">—</span>';
      
      const dateStr = u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A';

      // Safe JSON serialization for onclick handler
      const userJson = JSON.stringify(u).replace(/"/g, '&quot;');

      return `
        <tr>
          <td><strong>${u.first_name} ${u.last_name}</strong></td>
          <td>${u.email}</td>
          <td>${u.phone || 'N/A'}</td>
          <td><span class="badge ${roleBadge}">${u.role.toUpperCase()}</span></td>
          <td>${specializationText}</td>
          <td>${dateStr}</td>
          <td>
            <div style="display:flex; gap:8px;">
              ${u.role === 'dentist' && u.dentist_id ? `
                <button class="btn btn-secondary btn-icon" onclick="openDentistAvailabilityModal(${u.dentist_id}, '${u.first_name} ${u.last_name}')" title="Manage Shifts" style="background-color:rgba(79, 70, 229, 0.05); color:#4f46e5; border:1px solid rgba(79, 70, 229, 0.2);">
                  <i data-lucide="calendar" style="width:16px;height:16px;"></i>
                </button>
              ` : ''}
              <button class="btn btn-secondary btn-icon" onclick="openEditUserModalByData('${userJson}')" title="Edit User">
                <i data-lucide="edit-3" style="width:16px;height:16px;"></i>
              </button>
              <button class="btn btn-secondary btn-icon danger" onclick="deleteUserAccount(${u.id}, '${u.email}')" title="Delete User">
                <i data-lucide="trash-2" style="width:16px;height:16px;color:var(--danger-color);"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    
    lucide.createIcons();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// Global scope helpers for onclick handlers
window.openDentistAvailabilityModal = async function(dentistId, dentistName) {
  try {
    const res = await fetch(`/api/dentists/${dentistId}/availability`);
    const currentShifts = await res.json();
    
    const shiftMap = {};
    currentShifts.forEach(s => {
      shiftMap[s.day_of_week] = { start: s.start_hour, end: s.end_hour };
    });
    
    const days = [
      { idx: 0, name: 'Sunday' },
      { idx: 1, name: 'Monday' },
      { idx: 2, name: 'Tuesday' },
      { idx: 3, name: 'Wednesday' },
      { idx: 4, name: 'Thursday' },
      { idx: 5, name: 'Friday' },
      { idx: 6, name: 'Saturday' }
    ];
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-container" style="width: 550px;">
        <div class="modal-header">
          <h3>Manage Working Hours — Dr. ${dentistName}</h3>
          <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
        </div>
        <form id="dentist-availability-form">
          <div class="modal-body" style="max-height: 450px; overflow-y: auto;">
            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:16px;">Configure working days and shift hours for Dr. ${dentistName}. Unchecked days are marked as off-duty.</p>
            
            <div style="display:flex; flex-direction:column; gap:12px;">
              ${days.map(d => {
                const checked = shiftMap[d.idx] ? 'checked' : '';
                const start = shiftMap[d.idx] ? shiftMap[d.idx].start : '09:00';
                const end = shiftMap[d.idx] ? shiftMap[d.idx].end : '17:00';
                return `
                  <div style="display:flex; align-items:center; justify-content:space-between; padding:10px; background:var(--bg-primary); border-radius:var(--radius-sm); border:1px solid var(--border-color); gap:12px;">
                    <label style="display:flex; align-items:center; gap:8px; width:120px; font-weight:600; cursor:pointer;">
                      <input type="checkbox" id="avail-check-${d.idx}" ${checked} style="width:16px; height:16px;">
                      <span>${d.name}</span>
                    </label>
                    <div style="display:flex; align-items:center; gap:8px; flex:1; justify-content:flex-end;">
                      <input type="time" id="avail-start-${d.idx}" value="${start}" style="padding:6px; border:1px solid var(--border-color); border-radius:var(--radius-sm); background:var(--bg-secondary); color:var(--text-primary); font-size:0.85rem;">
                      <span style="color:var(--text-muted); font-size:0.8rem;">to</span>
                      <input type="time" id="avail-end-${d.idx}" value="${end}" style="padding:6px; border:1px solid var(--border-color); border-radius:var(--radius-sm); background:var(--bg-secondary); color:var(--text-primary); font-size:0.85rem;">
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Availability</button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    lucide.createIcons();
    
    document.getElementById('dentist-availability-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const shifts = [];
      days.forEach(d => {
        const check = document.getElementById(`avail-check-${d.idx}`);
        if (check.checked) {
          shifts.push({
            dayOfWeek: d.idx,
            startHour: document.getElementById(`avail-start-${d.idx}`).value,
            endHour: document.getElementById(`avail-end-${d.idx}`).value
          });
        }
      });
      
      try {
        const saveRes = await fetch(`/api/dentists/${dentistId}/availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shifts })
        });
        
        if (saveRes.ok) {
          showToast('Dentist availability updated successfully.', 'success');
          modal.remove();
        } else {
          const err = await saveRes.json();
          showToast(err.error || 'Failed to update availability.', 'danger');
        }
      } catch (err) {
        showToast('Network error updating availability.', 'danger');
      }
    });
  } catch (err) {
    showToast('Failed to fetch availability details.', 'danger');
  }
};

window.openEditUserModalByData = function(userJsonStr) {
  const user = JSON.parse(userJsonStr.replace(/&quot;/g, '"'));
  openEditUserModal(user);
};

window.deleteUserAccount = async function(userId, email) {
  if (confirm(`Are you sure you want to delete the user account for ${email}?`)) {
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'User account deleted successfully.', 'success');
        await fetchUsersList();
      } else {
        showToast(data.error || 'Failed to delete user account.', 'danger');
      }
    } catch (err) {
      showToast('Network error deleting user.', 'danger');
    }
  }
};

function openAddUserModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3>Create User Account</h3>
        <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
      </div>
      <form id="add-user-form">
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>First Name*</label>
              <input type="text" id="u-first-name" required placeholder="Jane">
            </div>
            <div class="form-group">
              <label>Last Name*</label>
              <input type="text" id="u-last-name" required placeholder="Smith">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Email Address*</label>
              <input type="email" id="u-email" required placeholder="jane.smith@dental.com">
            </div>
            <div class="form-group">
              <label>Phone Number</label>
              <input type="tel" id="u-phone" placeholder="555-0188">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Role*</label>
              <select id="u-role" required>
                <option value="staff">Staff / Receptionist</option>
                <option value="dentist">Dentist</option>
                <option value="admin">Administrator</option>
                <option value="patient">Patient</option>
              </select>
            </div>
            <div class="form-group">
              <label>Password*</label>
              <input type="password" id="u-password" required placeholder="••••••••">
            </div>
          </div>
          
          <!-- Dentist specific fields -->
          <div id="dentist-fields" class="hidden" style="border-top:1px dashed var(--border-color); padding-top:16px; margin-top:16px;">
            <p style="font-size:0.8rem; font-weight:600; color:#4f46e5; margin-bottom:12px;">Dentist Professional Profile</p>
            <div class="form-row">
              <div class="form-group">
                <label>Specialization</label>
                <input type="text" id="u-specialization" placeholder="e.g. Orthodontics, Cosmetic">
              </div>
              <div class="form-group">
                <label>License Number</label>
                <input type="text" id="u-license" placeholder="e.g. LIC-998877">
              </div>
            </div>
            <div class="form-group">
              <label>Calendar Color Identifier</label>
              <input type="color" id="u-color" value="#4f46e5" style="height:40px; padding:0; cursor:pointer;">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create User</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  lucide.createIcons();

  // Watch role selection to display dentist profile fields
  const roleSelect = document.getElementById('u-role');
  const dentistFields = document.getElementById('dentist-fields');
  roleSelect.addEventListener('change', () => {
    if (roleSelect.value === 'dentist') {
      dentistFields.classList.remove('hidden');
    } else {
      dentistFields.classList.add('hidden');
    }
  });

  document.getElementById('add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      firstName: document.getElementById('u-first-name').value,
      lastName: document.getElementById('u-last-name').value,
      email: document.getElementById('u-email').value,
      phone: document.getElementById('u-phone').value,
      role: roleSelect.value,
      password: document.getElementById('u-password').value,
      specialization: document.getElementById('u-specialization').value,
      licenseNumber: document.getElementById('u-license').value,
      colorCode: document.getElementById('u-color').value
    };

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('User account created successfully', 'success');
        modal.remove();
        await fetchUsersList();
      } else {
        showToast(data.error || 'Failed to create user account', 'danger');
      }
    } catch (err) {
      showToast('Network error creating user.', 'danger');
    }
  });
}

function openEditUserModal(user) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3>Edit User Account</h3>
        <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
      </div>
      <form id="edit-user-form">
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>First Name*</label>
              <input type="text" id="ue-first-name" required value="${user.first_name}">
            </div>
            <div class="form-group">
              <label>Last Name*</label>
              <input type="text" id="ue-last-name" required value="${user.last_name}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Email Address*</label>
              <input type="email" id="ue-email" required value="${user.email}">
            </div>
            <div class="form-group">
              <label>Phone Number</label>
              <input type="tel" id="ue-phone" value="${user.phone || ''}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Role*</label>
              <select id="ue-role" required>
                <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>Staff / Receptionist</option>
                <option value="dentist" ${user.role === 'dentist' ? 'selected' : ''}>Dentist</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrator</option>
                <option value="patient" ${user.role === 'patient' ? 'selected' : ''}>Patient</option>
              </select>
            </div>
            <div class="form-group">
              <label>New Password (Leave blank to keep current)</label>
              <input type="password" id="ue-password" placeholder="••••••••">
            </div>
          </div>
          
          <!-- Dentist specific fields -->
          <div id="dentist-fields-edit" class="${user.role === 'dentist' ? '' : 'hidden'}" style="border-top:1px dashed var(--border-color); padding-top:16px; margin-top:16px;">
            <p style="font-size:0.8rem; font-weight:600; color:#4f46e5; margin-bottom:12px;">Dentist Professional Profile</p>
            <div class="form-row">
              <div class="form-group">
                <label>Specialization</label>
                <input type="text" id="ue-specialization" value="${user.specialization || ''}" placeholder="e.g. Orthodontics, Cosmetic">
              </div>
              <div class="form-group">
                <label>License Number</label>
                <input type="text" id="ue-license" value="${user.license_number || ''}" placeholder="e.g. LIC-998877">
              </div>
            </div>
            <div class="form-group">
              <label>Calendar Color Identifier</label>
              <input type="color" id="ue-color" value="${user.color_code || '#4f46e5'}" style="height:40px; padding:0; cursor:pointer;">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Update User</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  lucide.createIcons();

  const roleSelect = document.getElementById('ue-role');
  const dentistFields = document.getElementById('dentist-fields-edit');
  roleSelect.addEventListener('change', () => {
    if (roleSelect.value === 'dentist') {
      dentistFields.classList.remove('hidden');
    } else {
      dentistFields.classList.add('hidden');
    }
  });

  document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      firstName: document.getElementById('ue-first-name').value,
      lastName: document.getElementById('ue-last-name').value,
      email: document.getElementById('ue-email').value,
      phone: document.getElementById('ue-phone').value,
      role: roleSelect.value,
      password: document.getElementById('ue-password').value || null,
      specialization: document.getElementById('ue-specialization').value,
      licenseNumber: document.getElementById('ue-license').value,
      colorCode: document.getElementById('ue-color').value
    };

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('User account updated successfully', 'success');
        modal.remove();
        await fetchUsersList();
      } else {
        showToast(data.error || 'Failed to update user account', 'danger');
      }
    } catch (err) {
      showToast('Network error updating user.', 'danger');
    }
  });
}

async function renderFollowupsView(container) {
  const res = await fetch('/api/followups');
  const followups = await res.json();

  const pending = followups.filter(f => f.status === 'pending');
  const completed = followups.filter(f => f.status === 'completed');

  container.innerHTML = `
    <div class="view-header-actions" style="margin-bottom:24px;">
      <h3 style="font-size:1.4rem;">CRM Call Follow-up Tasks</h3>
      <button class="btn btn-primary" id="btn-add-followup" style="display:flex; align-items:center; gap:6px;">
        <i data-lucide="plus-circle" style="width:16px;height:16px;"></i>Add Task
      </button>
    </div>

    <div class="grid-3-col" style="gap:24px; margin-bottom:24px;">
      <div class="stat-card">
        <div style="display:flex; align-items:center; gap:16px;">
          <div class="stat-icon-container warning"><i data-lucide="clock"></i></div>
          <div>
            <span class="stat-label">Pending Contacts</span>
            <span class="stat-value" style="font-size:1.6rem;">${pending.length}</span>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div style="display:flex; align-items:center; gap:16px;">
          <div class="stat-icon-container success"><i data-lucide="check-check"></i></div>
          <div>
            <span class="stat-label">Completed Contacts</span>
            <span class="stat-value" style="font-size:1.6rem;">${completed.length}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="table-card">
      <h4 style="padding:20px; font-weight:600; border-bottom:1px solid var(--border-color);">Scheduled Call Log</h4>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Contact Name</th>
              <th>Type</th>
              <th>Assigned To</th>
              <th>Scheduled Date</th>
              <th>Reason & Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${followups.length === 0 ? '<tr><td colspan="6" style="text-align:center;">No follow-up calls scheduled yet.</td></tr>' : followups.map(f => {
              const name = f.patient_id ? `${f.pat_first} ${f.pat_last}` : `${f.lead_first} ${f.lead_last}`;
              const type = f.patient_id ? '<span class="badge success">Patient</span>' : '<span class="badge primary">Lead</span>';
              const isCompleted = f.status === 'completed';
              return `
                <tr>
                  <td><strong>${name}</strong></td>
                  <td>${type}</td>
                  <td>Dr./Staff ${f.staff_first} ${f.staff_last}</td>
                  <td>${new Date(f.scheduled_date).toLocaleDateString()}</td>
                  <td>
                    <span class="badge ${isCompleted ? 'success' : 'warning'}">${f.status}</span>
                    <p style="margin:4px 0 0 0; font-size:0.8rem; color:var(--text-secondary);">${f.notes || 'No description logged.'}</p>
                  </td>
                  <td>
                    ${!isCompleted ? `
                      <button class="btn btn-secondary btn-icon" onclick="completeFollowup(${f.id})" title="Mark Completed">
                        <i data-lucide="check" style="width:14px;height:14px; color:var(--success-color);"></i>
                      </button>
                    ` : '<span style="color:var(--text-muted); font-size:0.85rem;">—</span>'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Bind add mockup followup button
  document.getElementById('btn-add-followup').addEventListener('click', () => openAddFollowupModal());
  lucide.createIcons();
}

async function completeFollowup(id) {
  try {
    const res = await fetch(`/api/followups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', notes: 'Completed call outreach successfully.' })
    });
    if (res.ok) {
      showToast('Outreach completed successfully', 'success');
      const workspace = document.getElementById('workspace-view');
      renderFollowupsView(workspace);
    }
  } catch (err) {
    showToast('Failed to complete followup.', 'danger');
  }
}

async function openAddFollowupModal() {
  const res = await fetch('/api/patients');
  const patients = await res.json();
  const resLeads = await fetch('/api/leads');
  const leads = await resLeads.json();
  const resUsers = await fetch('/api/users');
  const users = await resUsers.json();
  const staff = users.filter(u => u.role === 'admin' || u.role === 'staff' || u.role === 'dentist');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container" style="width:500px;">
      <div class="modal-header">
        <h3>Schedule Follow-up Outreach</h3>
        <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
      </div>
      <form id="add-followup-form">
        <div class="modal-body">
          <div class="form-group">
            <label>Select Patient OR Lead</label>
            <select id="fl-target" required style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
              <optgroup label="Patients">
                ${patients.map(p => `<option value="patient:${p.id}">${p.first_name} ${p.last_name}</option>`).join('')}
              </optgroup>
              <optgroup label="Hot Leads">
                ${leads.map(l => `<option value="lead:${l.id}">${l.first_name} ${l.last_name} (${l.phone})</option>`).join('')}
              </optgroup>
            </select>
          </div>
          <div class="form-group">
            <label>Assign To (Staff/Doctor)</label>
            <select id="fl-staff" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
              ${staff.map(u => `<option value="${u.id}">${u.first_name} ${u.last_name} (${u.role})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Scheduled Date</label>
            <input type="date" id="fl-date" required style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
          </div>
          <div class="form-group">
            <label>Call Outbound Notes</label>
            <input type="text" id="fl-notes" placeholder="e.g. Call to check on bleeding after molar extraction" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Schedule Call</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  lucide.createIcons();

  document.getElementById('add-followup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const target = document.getElementById('fl-target').value;
    const isPatient = target.startsWith('patient:');
    const targetId = parseInt(target.split(':')[1], 10);
    const assignedTo = document.getElementById('fl-staff').value;
    const scheduledDate = document.getElementById('fl-date').value;
    const notes = document.getElementById('fl-notes').value;

    const payload = {
      patientId: isPatient ? targetId : null,
      leadId: !isPatient ? targetId : null,
      assignedTo,
      scheduledDate,
      notes
    };

    try {
      const res = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Follow-up scheduled successfully', 'success');
        modal.remove();
        const workspace = document.getElementById('workspace-view');
        renderFollowupsView(workspace);
      }
    } catch (err) {
      showToast('Network error scheduling follow-up.', 'danger');
    }
  });
}

async function renderPrescriptionsView(container) {
  const res = await fetch('/api/prescriptions');
  const prescriptions = await res.json();

  container.innerHTML = `
    <div class="view-header-actions" style="margin-bottom:24px;">
      <h3 style="font-size:1.4rem;">Prescription Hub</h3>
      <button class="btn btn-primary" id="btn-write-prescription" style="display:flex; align-items:center; gap:6px;">
        <i data-lucide="plus-circle" style="width:16px;height:16px;"></i>Write Prescription
      </button>
    </div>

    <div class="table-card">
      <h4 style="padding:20px; font-weight:600; border-bottom:1px solid var(--border-color);">Prescribed Medications Registry</h4>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Patient Name</th>
              <th>Prescribed By</th>
              <th>Medication</th>
              <th>Dosage</th>
              <th>Usage Instructions</th>
              <th>Date Prescribed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${prescriptions.length === 0 ? '<tr><td colspan="7" style="text-align:center;">No prescriptions written yet.</td></tr>' : prescriptions.map(pr => `
              <tr>
                <td><strong>${pr.pat_first} ${pr.pat_last}</strong></td>
                <td>Dr. ${pr.dent_first} ${pr.dent_last}</td>
                <td><span style="font-weight:600; color:#4f46e5;">${pr.medication}</span></td>
                <td>${pr.dosage}</td>
                <td><span style="font-size:0.85rem; color:var(--text-secondary);">${pr.instructions || 'N/A'}</span></td>
                <td>${new Date(pr.created_at).toLocaleDateString()}</td>
                <td>
                  <button class="btn btn-secondary btn-icon" onclick="deletePrescription(${pr.id})" title="Delete/Revoke">
                    <i data-lucide="trash-2" style="width:14px;height:14px; color:var(--danger-color);"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-write-prescription').addEventListener('click', () => openWritePrescriptionModal());
  lucide.createIcons();
}

async function deletePrescription(id) {
  if (!confirm('Are you sure you want to revoke/delete this prescription?')) return;
  try {
    const res = await fetch(`/api/prescriptions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Prescription revoked successfully', 'success');
      const workspace = document.getElementById('workspace-view');
      renderPrescriptionsView(workspace);
    }
  } catch (err) {
    showToast('Failed to revoke prescription.', 'danger');
  }
}

async function openWritePrescriptionModal() {
  const res = await fetch('/api/patients');
  const patients = await res.json();
  const resDentists = await fetch('/api/dentists');
  const dentists = await resDentists.json();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container" style="width:500px;">
      <div class="modal-header">
        <h3>Write New Prescription</h3>
        <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
      </div>
      <form id="write-prescription-form">
        <div class="modal-body">
          <div class="form-group">
            <label>Select Patient*</label>
            <select id="pr-patient" required style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
              ${patients.map(p => `<option value="${p.id}">${p.first_name} ${p.last_name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Responsible Dentist*</label>
            <select id="pr-dentist" required style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
              ${dentists.map(d => `<option value="${d.id}">Dr. ${d.first_name} ${d.last_name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Medication Name*</label>
            <input type="text" id="pr-medication" required placeholder="e.g. Amoxicillin 500mg, Ibuprofen 400mg" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
          </div>
          <div class="form-group">
            <label>Dosage</label>
            <input type="text" id="pr-dosage" placeholder="e.g. 1 tablet 3 times a day" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
          </div>
          <div class="form-group">
            <label>Usage Directions</label>
            <input type="text" id="pr-instructions" placeholder="e.g. Take with water after food for 7 days" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save & Issue</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  lucide.createIcons();

  document.getElementById('write-prescription-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      patientId: document.getElementById('pr-patient').value,
      dentistId: document.getElementById('pr-dentist').value,
      medication: document.getElementById('pr-medication').value,
      dosage: document.getElementById('pr-dosage').value,
      instructions: document.getElementById('pr-instructions').value
    };

    try {
      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Prescription recorded successfully', 'success');
        modal.remove();
        const workspace = document.getElementById('workspace-view');
        renderPrescriptionsView(workspace);
      }
    } catch (err) {
      showToast('Network error prescribing medication.', 'danger');
    }
  });
}

async function renderPackagesView(container) {
  const res = await fetch('/api/treatments');
  const treatments = await res.json();

  container.innerHTML = `
    <div class="view-header-actions" style="margin-bottom:24px;">
      <h3 style="font-size:1.4rem;">Packages & Service Catalog</h3>
      ${state.user.role === 'admin' ? `
        <button class="btn btn-primary" id="btn-add-service" style="display:flex; align-items:center; gap:6px;">
          <i data-lucide="plus-circle" style="width:16px;height:16px;"></i>Add Procedure/Package
        </button>
      ` : ''}
    </div>

    <div class="table-card">
      <h4 style="padding:20px; font-weight:600; border-bottom:1px solid var(--border-color);">Clinic Services Directory</h4>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Procedure/Package Name</th>
              <th>Clinical Description</th>
              <th>Base Charge Cost</th>
              ${state.user.role === 'admin' ? '<th>Catalog Controls</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${treatments.length === 0 ? '<tr><td colspan="4" style="text-align:center;">No services loaded.</td></tr>' : treatments.map(t => `
              <tr>
                <td><strong>${t.name}</strong></td>
                <td><span style="font-size:0.85rem; color:var(--text-secondary);">${t.description || 'No description logged.'}</span></td>
                <td><strong style="color:#059669;">$${t.base_cost.toFixed(2)}</strong></td>
                ${state.user.role === 'admin' ? `
                  <td>
                    <button class="btn btn-secondary btn-icon" onclick="openEditServiceModal(${t.id}, '${t.name.replace(/'/g, "\\'")}', '${(t.description || '').replace(/'/g, "\\'")}', ${t.base_cost})" title="Edit Service">
                      <i data-lucide="edit-3" style="width:14px;height:14px; color:var(--primary-color);"></i>
                    </button>
                    <button class="btn btn-secondary btn-icon" onclick="deleteService(${t.id})" title="Delete Service">
                      <i data-lucide="trash-2" style="width:14px;height:14px; color:var(--danger-color);"></i>
                    </button>
                  </td>
                ` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (state.user.role === 'admin') {
    document.getElementById('btn-add-service').addEventListener('click', () => openAddServiceModal());
  }
  lucide.createIcons();
}

async function deleteService(id) {
  if (!confirm('Are you sure you want to remove this procedure from the catalog? This could impact existing plan drafts.')) return;
  try {
    const res = await fetch(`/api/treatments/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Catalog item removed successfully', 'success');
      const workspace = document.getElementById('workspace-view');
      renderPackagesView(workspace);
    }
  } catch (err) {
    showToast('Failed to delete catalog item.', 'danger');
  }
}

function openAddServiceModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container" style="width:500px;">
      <div class="modal-header">
        <h3>Add Service to Catalog</h3>
        <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
      </div>
      <form id="add-service-form">
        <div class="modal-body">
          <div class="form-group">
            <label>Service/Procedure Name*</label>
            <input type="text" id="srv-name" required placeholder="e.g. Dental Scaling & Polish" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
          </div>
          <div class="form-group">
            <label>Base Charge Cost ($)*</label>
            <input type="number" id="srv-cost" required step="0.01" placeholder="e.g. 150.00" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
          </div>
          <div class="form-group">
            <label>Service Description</label>
            <textarea id="srv-desc" rows="4" placeholder="Clinical specifics, duration, and warranty guidelines..." style="width:100%; font-family:inherit; padding:12px; border-radius:var(--radius-sm); border:1px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary);"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Service</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  lucide.createIcons();

  document.getElementById('add-service-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('srv-name').value,
      baseCost: parseFloat(document.getElementById('srv-cost').value),
      description: document.getElementById('srv-desc').value
    };

    try {
      const res = await fetch('/api/treatments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Service added to catalog successfully', 'success');
        modal.remove();
        const workspace = document.getElementById('workspace-view');
        renderPackagesView(workspace);
      }
    } catch (err) {
      showToast('Network error adding service to catalog.', 'danger');
    }
  });
}

function openEditServiceModal(id, name, desc, cost) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container" style="width:500px;">
      <div class="modal-header">
        <h3>Edit Service Item</h3>
        <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
      </div>
      <form id="edit-service-form">
        <div class="modal-body">
          <div class="form-group">
            <label>Service/Procedure Name*</label>
            <input type="text" id="edit-srv-name" required value="${name}" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
          </div>
          <div class="form-group">
            <label>Base Charge Cost ($)*</label>
            <input type="number" id="edit-srv-cost" required step="0.01" value="${cost}" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
          </div>
          <div class="form-group">
            <label>Service Description</label>
            <textarea id="edit-srv-desc" rows="4" style="width:100%; font-family:inherit; padding:12px; border-radius:var(--radius-sm); border:1px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary);">${desc}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Update Catalog</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  lucide.createIcons();

  document.getElementById('edit-service-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('edit-srv-name').value,
      baseCost: parseFloat(document.getElementById('edit-srv-cost').value),
      description: document.getElementById('edit-srv-desc').value
    };

    try {
      const res = await fetch(`/api/treatments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Service updated successfully', 'success');
        modal.remove();
        const workspace = document.getElementById('workspace-view');
        renderPackagesView(workspace);
      }
    } catch (err) {
      showToast('Network error updating catalog item.', 'danger');
    }
  });
}

async function renderStockView(container) {
  const res = await fetch('/api/stock');
  const stock = await res.json();

  const lowStock = stock.filter(item => item.quantity <= item.reorder_level);

  container.innerHTML = `
    <div class="view-header-actions" style="margin-bottom:24px;">
      <h3 style="font-size:1.4rem;">Medical Stock & Inventory</h3>
      ${state.user.role !== 'dentist' ? `
        <button class="btn btn-primary" id="btn-add-stock-item" style="display:flex; align-items:center; gap:6px;">
          <i data-lucide="plus-circle" style="width:16px;height:16px;"></i>Add Stock Item
        </button>
      ` : ''}
    </div>

    <div class="grid-3-col" style="gap:24px; margin-bottom:24px;">
      <div class="stat-card">
        <div style="display:flex; align-items:center; gap:16px;">
          <div class="stat-icon-container primary"><i data-lucide="package-open"></i></div>
          <div>
            <span class="stat-label">Total Unique Items</span>
            <span class="stat-value" style="font-size:1.6rem;">${stock.length}</span>
          </div>
        </div>
      </div>
      <div class="stat-card" style="${lowStock.length > 0 ? 'border:1px solid var(--danger-color); background:rgba(239, 68, 68, 0.03);' : ''}">
        <div style="display:flex; align-items:center; gap:16px;">
          <div class="stat-icon-container danger"><i data-lucide="alert-triangle"></i></div>
          <div>
            <span class="stat-label">Low Stock Alerts</span>
            <span class="stat-value" style="font-size:1.6rem; color:var(--danger-color);">${lowStock.length}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="table-card">
      <h4 style="padding:20px; font-weight:600; border-bottom:1px solid var(--border-color);">Clinic Supplies Tracker</h4>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Current Stock</th>
              <th>Reorder Limit</th>
              <th>Status</th>
              <th>Last Updated</th>
              ${state.user.role !== 'dentist' ? '<th>Inventory Controls</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${stock.length === 0 ? '<tr><td colspan="7" style="text-align:center;">No stock records found.</td></tr>' : stock.map(s => {
              const isLow = s.quantity <= s.reorder_level;
              return `
                <tr>
                  <td><strong>${s.item_name}</strong></td>
                  <td><span class="badge primary">${s.category}</span></td>
                  <td><strong style="font-size:1.05rem;">${s.quantity} ${s.unit}</strong></td>
                  <td>${s.reorder_level} ${s.unit}</td>
                  <td>
                    ${isLow ? '<span class="badge danger" style="animation: pulse 2s infinite;">LOW STOCK</span>' : '<span class="badge success">Adequate</span>'}
                  </td>
                  <td>${new Date(s.last_updated).toLocaleDateString()}</td>
                  ${state.user.role !== 'dentist' ? `
                    <td>
                      <button class="btn btn-secondary btn-icon" onclick="openEditStockModal(${s.id}, '${s.item_name.replace(/'/g, "\\'")}', '${s.category}', ${s.quantity}, '${s.unit}', ${s.reorder_level})" title="Update Levels">
                        <i data-lucide="refresh-cw" style="width:14px;height:14px; color:var(--primary-color);"></i>
                      </button>
                      <button class="btn btn-secondary btn-icon" onclick="deleteStockItem(${s.id})" title="Remove Item">
                        <i data-lucide="trash-2" style="width:14px;height:14px; color:var(--danger-color);"></i>
                      </button>
                    </td>
                  ` : ''}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (state.user.role !== 'dentist') {
    document.getElementById('btn-add-stock-item').addEventListener('click', () => openAddStockModal());
  }
  lucide.createIcons();
}

async function deleteStockItem(id) {
  if (!confirm('Are you sure you want to remove this item from the inventory registry?')) return;
  try {
    const res = await fetch(`/api/stock/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Inventory item removed successfully', 'success');
      const workspace = document.getElementById('workspace-view');
      renderStockView(workspace);
    }
  } catch (err) {
    showToast('Failed to delete inventory item.', 'danger');
  }
}

function openAddStockModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container" style="width:500px;">
      <div class="modal-header">
        <h3>Add Item to Inventory</h3>
        <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
      </div>
      <form id="add-stock-form">
        <div class="modal-body">
          <div class="form-group">
            <label>Item Name*</label>
            <input type="text" id="st-name" required placeholder="e.g. Latex Examination Gloves (M)" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
          </div>
          <div class="form-group">
            <label>Category</label>
            <select id="st-cat" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
              <option value="Consumables">Consumables (Gloves, Syringes)</option>
              <option value="Drugs">Drugs (Anesthetics, Gels)</option>
              <option value="Instruments">Instruments (Handles, Burs)</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Current Quantity*</label>
              <input type="number" id="st-qty" required value="10" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
            </div>
            <div class="form-group">
              <label>Unit Label</label>
              <input type="text" id="st-unit" value="pcs" placeholder="e.g. boxes, packs, pcs" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
            </div>
          </div>
          <div class="form-group">
            <label>Low Stock Reorder Limit*</label>
            <input type="number" id="st-limit" required value="5" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Item</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  lucide.createIcons();

  document.getElementById('add-stock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      itemName: document.getElementById('st-name').value,
      category: document.getElementById('st-cat').value,
      quantity: parseInt(document.getElementById('st-qty').value, 10),
      unit: document.getElementById('st-unit').value,
      reorderLevel: parseInt(document.getElementById('st-limit').value, 10)
    };

    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Inventory item added successfully', 'success');
        modal.remove();
        const workspace = document.getElementById('workspace-view');
        renderStockView(workspace);
      }
    } catch (err) {
      showToast('Network error adding stock item.', 'danger');
    }
  });
}

function openEditStockModal(id, name, cat, qty, unit, limit) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container" style="width:500px;">
      <div class="modal-header">
        <h3>Update Stock Levels</h3>
        <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
      </div>
      <form id="edit-stock-form">
        <div class="modal-body">
          <div class="form-group">
            <label>Item Name*</label>
            <input type="text" id="edit-st-name" required value="${name}" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
          </div>
          <div class="form-group">
            <label>Category</label>
            <select id="edit-st-cat" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
              <option value="Consumables" ${cat === 'Consumables' ? 'selected' : ''}>Consumables (Gloves, Syringes)</option>
              <option value="Drugs" ${cat === 'Drugs' ? 'selected' : ''}>Drugs (Anesthetics, Gels)</option>
              <option value="Instruments" ${cat === 'Instruments' ? 'selected' : ''}>Instruments (Handles, Burs)</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Current Quantity*</label>
              <input type="number" id="edit-st-qty" required value="${qty}" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
            </div>
            <div class="form-group">
              <label>Unit Label</label>
              <input type="text" id="edit-st-unit" value="${unit}" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
            </div>
          </div>
          <div class="form-group">
            <label>Low Stock Reorder Limit*</label>
            <input type="number" id="edit-st-limit" required value="${limit}" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button type="submit" class="btn btn-primary">Update Item</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  lucide.createIcons();

  document.getElementById('edit-stock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      itemName: document.getElementById('edit-st-name').value,
      category: document.getElementById('edit-st-cat').value,
      quantity: parseInt(document.getElementById('edit-st-qty').value, 10),
      unit: document.getElementById('edit-st-unit').value,
      reorderLevel: parseInt(document.getElementById('edit-st-limit').value, 10)
    };

    try {
      const res = await fetch(`/api/stock/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Stock level updated successfully', 'success');
        modal.remove();
        const workspace = document.getElementById('workspace-view');
        renderStockView(workspace);
      }
    } catch (err) {
      showToast('Network error updating stock item.', 'danger');
    }
  });
}

// ==========================================================================
// Utility Helper Functions
// ==========================================================================
function formatDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ==========================================================================
// 8. ROLE-BASED SYSTEM OPERATIONS & EXTRA SUB-VIEWS
// ==========================================================================
async function renderSchedulesView(container) {
  container.innerHTML = `
    <div style="background:var(--bg-secondary); padding:24px; border-radius:var(--radius-md); border:1px solid var(--border-color); box-shadow:var(--shadow-sm);">
      <h3 style="margin-bottom:12px;">Dentist Working Schedules</h3>
      <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:24px;">Configure weekly work shifts and hours for each clinic doctor.</p>
      
      <div class="table-card">
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Dentist Name</th>
                <th>Specialization</th>
                <th>Working Days & Hours</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="schedules-table-body">
              <tr><td colspan="4" style="text-align:center;">Loading dentist list...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  
  try {
    const res = await fetch('/api/dentists');
    const dentists = await res.json();
    const tbody = document.getElementById('schedules-table-body');
    
    if (dentists.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No dentists configured in system.</td></tr>';
      return;
    }
    
    const rows = await Promise.all(dentists.map(async d => {
      const resAvail = await fetch(`/api/dentists/${d.id}/availability`);
      const avail = await resAvail.json();
      
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const shiftText = avail.length > 0
        ? avail.map(s => `<strong>${days[s.day_of_week]}</strong> (${s.start_hour}-${s.end_hour})`).join(', ')
        : '<span style="color:var(--text-muted);">No shifts scheduled (Off-duty)</span>';
        
      return `
        <tr>
          <td><strong>Dr. ${d.first_name} ${d.last_name}</strong></td>
          <td>${d.specialization}</td>
          <td>${shiftText}</td>
          <td>
            <button class="btn btn-secondary btn-icon" onclick="openDentistAvailabilityModal(${d.id}, '${d.first_name} ${d.last_name}')" title="Configure Schedule">
              <i data-lucide="clock" style="width:16px;height:16px;"></i>
            </button>
          </td>
        </tr>
      `;
    }));
    
    tbody.innerHTML = rows.join('');
    lucide.createIcons();
  } catch (err) {
    showToast('Failed to load schedule list', 'danger');
  }
}

async function renderPaymentsView(container) {
  container.innerHTML = `
    <div style="background:var(--bg-secondary); padding:24px; border-radius:var(--radius-md); border:1px solid var(--border-color); box-shadow:var(--shadow-sm);">
      <h3 style="margin-bottom:12px;">Payment Transactions Log</h3>
      <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:24px;">History of all recorded transaction payments across clinic invoices.</p>
      
      <div class="table-card">
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Patient</th>
                <th>Procedure / Plan</th>
                <th>Amount Paid</th>
                <th>Method</th>
                <th>Ref Code</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody id="payments-table-body">
              <tr><td colspan="7" style="text-align:center;">Loading payments log...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  
  try {
    const res = await fetch('/api/payments');
    const list = await res.json();
    const tbody = document.getElementById('payments-table-body');
    
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No payment transactions recorded.</td></tr>';
      return;
    }
    
    tbody.innerHTML = list.map(pay => {
      const nameText = pay.first_name ? `${pay.first_name} ${pay.last_name}` : 'My Account';
      return `
        <tr>
          <td><strong>TX-10${pay.id}</strong></td>
          <td>${nameText}</td>
          <td>${pay.plan_title || 'General Clinic Charge'}</td>
          <td style="color:var(--success-color); font-weight:700;">$${pay.amount.toFixed(2)}</td>
          <td><span class="badge primary" style="text-transform:uppercase;">${pay.payment_method}</span></td>
          <td><code>${pay.transaction_ref || 'N/A'}</code></td>
          <td>${formatDateTime(pay.created_at)}</td>
        </tr>
      `;
    }).join('');
    lucide.createIcons();
  } catch (err) {
    showToast('Failed to load payments history', 'danger');
  }
}

async function renderReportsView(container) {
  const res = await fetch('/api/dashboard/stats');
  const stats = await res.json();
  
  container.innerHTML = `
    <div style="background:var(--bg-secondary); padding:24px; border-radius:var(--radius-md); border:1px solid var(--border-color); box-shadow:var(--shadow-sm); max-width:800px; margin:0 auto;">
      <h3 style="margin-bottom:16px;">Clinic Performance & Financial Report</h3>
      <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:24px;">Generated report summary for clinic business calculations.</p>
      
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:32px;">
        <div class="stat-card" style="display:block; padding:20px;">
          <span style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:6px;">Total Expected Billings</span>
          <strong style="font-size:1.6rem; color:var(--text-primary); font-family:var(--font-display);">$${(stats.revenue || 0).toFixed(2)}</strong>
        </div>
        <div class="stat-card" style="display:block; padding:20px;">
          <span style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:6px;">Total Cash Collections</span>
          <strong style="font-size:1.6rem; color:var(--success-color); font-family:var(--font-display);">$${(stats.collected || 0).toFixed(2)}</strong>
        </div>
        <div class="stat-card" style="display:block; padding:20px;">
          <span style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:6px;">Total Clinic Invoices</span>
          <strong style="font-size:1.6rem; color:var(--text-primary); font-family:var(--font-display);">${stats.patientsCount || 0} files</strong>
        </div>
        <div class="stat-card" style="display:block; padding:20px;">
          <span style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:6px;">Outstanding Receivables</span>
          <strong style="font-size:1.6rem; color:var(--danger-color); font-family:var(--font-display);">$${(stats.outstanding || 0).toFixed(2)}</strong>
        </div>
      </div>
      
      <div style="text-align:right;">
        <button class="btn btn-primary" onclick="window.print()"><i data-lucide="printer"></i>Print Report Summary</button>
      </div>
    </div>
  `;
  lucide.createIcons();
}

async function renderClinicSettingsView(container) {
  const name = localStorage.getItem('clinic_name') || 'DentalFlow Clinic';
  const phone = localStorage.getItem('clinic_phone') || '555-0199';
  const email = localStorage.getItem('clinic_email') || 'contact@dentalflow.com';
  const address = localStorage.getItem('clinic_address') || '456 Medical Center Dr, Seattle';
  
  container.innerHTML = `
    <div style="background:var(--bg-secondary); padding:32px; border-radius:var(--radius-md); border:1px solid var(--border-color); box-shadow:var(--shadow-sm); max-width:600px; margin:0 auto;">
      <h3 style="margin-bottom:16px;">Clinic Information & Settings</h3>
      <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:24px;">Configure general system metadata and business card branding details.</p>
      
      <form id="clinic-settings-form">
        <div class="form-group">
          <label>Clinic Trade Name*</label>
          <input type="text" id="cfg-name" required value="${name}" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:var(--radius-sm); background:var(--bg-primary); color:var(--text-primary);">
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Support Phone*</label>
            <input type="text" id="cfg-phone" required value="${phone}" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:var(--radius-sm); background:var(--bg-primary); color:var(--text-primary);">
          </div>
          <div class="form-group">
            <label>Billing Contact Email*</label>
            <input type="email" id="cfg-email" required value="${email}" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:var(--radius-sm); background:var(--bg-primary); color:var(--text-primary);">
          </div>
        </div>
        
        <div class="form-group">
          <label>Physical Address</label>
          <input type="text" id="cfg-address" value="${address}" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:var(--radius-sm); background:var(--bg-primary); color:var(--text-primary);">
        </div>
        
        <div style="margin-top:24px; text-align:right;">
          <button type="submit" class="btn btn-primary">Save Settings</button>
        </div>
      </form>
    </div>
  `;
  
  document.getElementById('clinic-settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    localStorage.setItem('clinic_name', document.getElementById('cfg-name').value);
    localStorage.setItem('clinic_phone', document.getElementById('cfg-phone').value);
    localStorage.setItem('clinic_email', document.getElementById('cfg-email').value);
    localStorage.setItem('clinic_address', document.getElementById('cfg-address').value);
    showToast('Clinic configuration settings updated.', 'success');
  });
}

async function renderPlansListView(container) {
  container.innerHTML = `
    <div style="background:var(--bg-secondary); padding:24px; border-radius:var(--radius-md); border:1px solid var(--border-color); box-shadow:var(--shadow-sm);">
      <h3 style="margin-bottom:12px;">Active Dental Care Plans</h3>
      <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:24px;">Overview of all mapped patient treatment plans, costs, and progress tracking.</p>
      
      <div class="table-card">
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Plan Title</th>
                <th>Status</th>
                <th>Total Cost</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="plans-list-table-body">
              <tr><td colspan="5" style="text-align:center;">Loading treatment plans...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  
  try {
    const res = await fetch('/api/plans');
    const list = await res.json();
    const tbody = document.getElementById('plans-list-table-body');
    
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No treatment plans configured.</td></tr>';
      return;
    }
    
    tbody.innerHTML = list.map(plan => `
      <tr>
        <td><strong>${plan.patient_first} ${plan.patient_last}</strong></td>
        <td>${plan.title}</td>
        <td><span class="badge ${plan.status === 'active' ? 'primary' : 'success'}">${plan.status.toUpperCase()}</span></td>
        <td>$${plan.total_cost.toFixed(2)}</td>
        <td>
          <button class="btn btn-secondary btn-icon" onclick="window.location.hash='patient-360-${plan.patient_id}'; navigate('patient-360-${plan.patient_id}');" title="Open Patient File">
            <i data-lucide="eye" style="width:16px;height:16px;"></i>
          </button>
        </td>
      </tr>
    `).join('');
    lucide.createIcons();
  } catch (err) {
    showToast('Failed to load plans list', 'danger');
  }
}

async function renderMyTreatmentsView(container) {
  container.innerHTML = `
    <div style="background:var(--bg-secondary); padding:24px; border-radius:var(--radius-md); border:1px solid var(--border-color); box-shadow:var(--shadow-sm); max-width:800px; margin:0 auto;">
      <h3 style="margin-bottom:12px;">Clinic Services & Treatments Catalog</h3>
      <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:24px;">Current treatments, service procedures, and standard clinic prices.</p>
      
      <div class="table-card">
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Procedure Name</th>
                <th>Description</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody id="my-treatments-table-body">
              <tr><td colspan="3" style="text-align:center;">Loading treatments list...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  
  try {
    const res = await fetch('/api/treatments');
    const list = await res.json();
    const tbody = document.getElementById('my-treatments-table-body');
    
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No services in catalog.</td></tr>';
      return;
    }
    
    tbody.innerHTML = list.map(t => `
      <tr>
        <td><strong>${t.name}</strong></td>
        <td>${t.description || 'N/A'}</td>
        <td>$${t.base_cost.toFixed(2)}</td>
      </tr>
    `).join('');
    lucide.createIcons();
  } catch (err) {
    showToast('Failed to load catalog', 'danger');
  }
}

async function renderPatientProfileView(container) {
  container.innerHTML = `
    <div style="background:var(--bg-secondary); padding:32px; border-radius:var(--radius-md); border:1px solid var(--border-color); box-shadow:var(--shadow-sm); max-width:500px; margin:0 auto;">
      <h3 style="margin-bottom:16px;">My Account Profile</h3>
      <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:24px;">Update your password or verify profile configuration credentials.</p>
      
      <form id="profile-edit-form">
        <div class="form-group">
          <label>Registered Name</label>
          <input type="text" disabled value="${state.user.name}" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:var(--radius-sm); background:var(--bg-primary); color:var(--text-primary); cursor:not-allowed;">
        </div>
        
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" disabled value="${state.user.email}" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:var(--radius-sm); background:var(--bg-primary); color:var(--text-primary); cursor:not-allowed;">
        </div>
        
        <div class="form-group">
          <label>Account Role</label>
          <span class="badge primary" style="display:inline-block; margin-top:4px;">${state.user.role.toUpperCase()}</span>
        </div>
        
        <div style="margin-top:24px; text-align:right;">
          <p style="font-size:0.8rem; color:var(--text-muted);">Contact reception staff to update registration email or MRN links.</p>
        </div>
      </form>
    </div>
  `;
}
