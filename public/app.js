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

  if (state.user.role === 'patient') {
    // Simple patient portal links
    const patientLinks = [
      { key: 'portal', label: 'Online Booking', icon: 'calendar-check' },
      { key: 'myrecords', label: 'My Medical Records', icon: 'file-text' }
    ];
    patientLinks.forEach(link => {
      const li = document.createElement('li');
      li.innerHTML = `
        <a href="#${link.key}" class="menu-link ${state.currentRoute === link.key ? 'active' : ''}" data-route="${link.key}">
          <i data-lucide="${link.icon}"></i>
          <span>${link.label}</span>
        </a>
      `;
      menuList.appendChild(li);
    });
  } else {
    // Categorized professional Clinova OS sidebar layout
    const menuStructure = [
      {
        category: 'CRM & LEADS',
        roles: ['admin', 'staff'],
        items: [
          { key: 'patients', label: 'Load Center', icon: 'users' },
          { key: 'leads', label: 'Hot Leads', icon: 'zap' },
          { key: 'appointments', label: 'Calls & Booking', icon: 'phone-call' },
          { key: 'followups', label: 'Follow-ups', icon: 'check-square' },
          { key: 'portal', label: 'Online Booking Portal', icon: 'external-link' }
        ]
      },
      {
        category: 'MEDICAL & TREATMENTS',
        roles: ['admin', 'dentist', 'staff'],
        items: [
          { key: 'appointments', label: 'Doctor Schedule', icon: 'calendar' },
          { key: 'prescriptions', label: 'Prescriptions', icon: 'file-text' }
        ]
      },
      {
        category: 'FINANCE',
        roles: ['admin', 'staff'],
        items: [
          { key: 'billing', label: 'Invoices & Payments', icon: 'credit-card' },
          { key: 'packages', label: 'Packages & Services', icon: 'package' },
          { key: 'stock', label: 'Medical Stock', icon: 'archive' }
        ]
      }
    ];

    menuStructure.forEach(cat => {
      if (cat.roles.includes(state.user.role)) {
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
      }
    });
  }

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
      case 'myrecords':
        viewTitle.textContent = 'My Treatment Summary';
        await renderPatientRecordsPortal(workspace);
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
    const phone = document.getElementById('reg-phone').value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'patient', firstName, lastName, phone })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Patient account created. Please log in.', 'success');
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
          <h3>$${stats.revenue.toLocaleString()}</h3>
        </div>
        <div class="stat-icon"><i data-lucide="dollar-sign"></i></div>
      </div>
      <div class="stat-card primary">
        <div class="stat-info">
          <p>Collected Payments</p>
          <h3>$${stats.collected.toLocaleString()}</h3>
        </div>
        <div class="stat-icon"><i data-lucide="wallet"></i></div>
      </div>
      <div class="stat-card danger">
        <div class="stat-info">
          <p>Outstanding Balances</p>
          <h3>$${stats.outstanding.toLocaleString()}</h3>
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
  container.innerHTML = `
    <div class="view-header-actions">
      <div class="search-input-wrapper">
        <i data-lucide="search"></i>
        <input type="text" id="patient-search" placeholder="Search by name, phone or email...">
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
  
  // Add patient trigger
  if (state.user.role !== 'dentist') {
    document.getElementById('btn-add-patient').addEventListener('click', openAddPatientModal);
  }

  // Load patient lists
  await fetchPatients();
}

async function fetchPatients(query = '') {
  const url = query ? `/api/patients?q=${encodeURIComponent(query)}` : '/api/patients';
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

  const balanceText = totalOutstanding > 0 ? `${totalOutstanding} EGP` : '0 EGP';
  const openBalanceBadge = totalOutstanding > 0 
    ? `<span class="badge danger">Open Balance: $${totalOutstanding}</span>` 
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
          <strong style="font-size:1.25rem; color:var(--text-primary);">${totalPaid} EGP</strong>
        </div>
        <div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">Balance</p>
          <strong style="font-size:1.25rem; color:var(--text-primary);">${balanceText}</strong>
        </div>
        <div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">Avg. sales</p>
          <strong style="font-size:1.25rem; color:var(--text-primary);">${(totalPaid / (data.invoices.length || 1)).toFixed(0)} EGP</strong>
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
            <strong>${totalPaid} EGP</strong>
          </div>
          <div style="display:flex; justify-content:space-between; border-top:1px solid var(--border-color); padding-top:8px;">
            <span style="color:var(--text-secondary);">Outstanding</span>
            <strong style="color:var(--danger-color);">${totalOutstanding} EGP</strong>
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
        <h4>Clinical History Notes</h4>
        <div style="background:var(--bg-primary); padding:16px; border-radius:var(--radius-md); font-size:0.9rem; margin-top:16px;">
          ${p.notes ? p.notes.replace(/\n/g, '<br>') : 'No diagnosis notes logged yet.'}
        </div>
      </div>
    </div>
  `;

  // Bind events
  if (state.user.role !== 'patient') {
    document.getElementById('btn-create-plan').addEventListener('click', () => openCreatePlanModal(p.id));
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

  container.innerHTML = `
    <div class="view-header-actions">
      <div>
        <h4 id="calendar-month-year" style="font-size:1.2rem; font-weight:600;">August 2026</h4>
      </div>
      <button class="btn btn-primary" id="btn-add-appt"><i data-lucide="calendar-plus"></i>Book Appointment</button>
    </div>

    <div class="calendar-view">
      <div class="calendar-header">
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary" id="btn-cal-prev"><i data-lucide="chevron-left"></i></button>
          <button class="btn btn-secondary" id="btn-cal-today">Today</button>
          <button class="btn btn-secondary" id="btn-cal-next"><i data-lucide="chevron-right"></i></button>
        </div>
        <div class="legend" style="display:flex; gap:15px; font-size:0.8rem; color:var(--text-secondary);">
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
  const appts = await res.json();

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
              <option value="scheduled" ${a.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
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
      <h3 style="margin-bottom:24px;">My Dental Health Record</h3>
      
      <!-- Treatment Plans -->
      <h4 style="margin-bottom:12px;">Active Care Plans</h4>
      ${renderPlansAccordion(data.treatmentPlans)}
      
      <!-- Past medical notes -->
      <h4 style="margin-top:32px; margin-bottom:12px;">Allergies & Clinical History</h4>
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
