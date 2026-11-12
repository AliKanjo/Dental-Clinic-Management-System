import { state } from './state.js';
import { escapeHtml, refreshIcons } from './utils.js';
import { renderDashboardView } from './views/dashboard.js';
import { renderPatientsView } from './views/patients.js';
import { renderPatient360View } from './views/patient360.js';
import { renderAppointmentsView } from './views/appointments.js';
import { renderBillingView, renderInvoiceView, renderPaymentsView } from './views/billing.js';
import { renderLeadsView } from './views/leads.js';
import { renderFollowupsView } from './views/followups.js';
import { renderPrescriptionsView } from './views/prescriptions.js';
import { renderPackagesView, renderMyTreatmentsView } from './views/services.js';
import { renderStockView } from './views/stock.js';
import { renderUsersView } from './views/users.js';
import { renderSchedulesView } from './views/schedules.js';
import { renderReportsView } from './views/reports.js';
import { renderClinicSettingsView } from './views/settings.js';
import {
  renderPatientBookingPortal,
  renderPatientRecordsPortal,
  renderPatientTreatmentPlansPortal,
  renderPatientProfileView,
} from './views/patientPortal.js';
import { renderPlansListView } from './views/patient360.js';

export function getDefaultRouteForRole(role) {
  if (role === 'patient') return 'portal';
  return 'dashboard';
}

export function renderSidebar() {
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
          { key: 'users-staff', label: 'Staff', icon: 'user-cog' },
        ],
      },
      {
        category: 'CLINIC',
        items: [
          { key: 'patients', label: 'Patients', icon: 'smile' },
          { key: 'packages', label: 'Services', icon: 'tag' },
          { key: 'schedules', label: 'Schedules', icon: 'clock' },
        ],
      },
      {
        category: 'OPERATIONS',
        items: [{ key: 'appointments', label: 'Appointments', icon: 'calendar' }],
      },
      {
        category: 'FINANCE',
        items: [
          { key: 'billing', label: 'Billing', icon: 'file-text' },
          { key: 'payments', label: 'Payments', icon: 'credit-card' },
        ],
      },
      {
        category: 'REPORTS',
        items: [
          { key: 'analytics', label: 'Analytics', icon: 'bar-chart' },
          { key: 'reports', label: 'Reports', icon: 'file' },
        ],
      },
      {
        category: 'SETTINGS',
        items: [{ key: 'settings', label: 'Clinic Settings', icon: 'settings' }],
      },
    ];
  } else if (state.user.role === 'staff') {
    menu = [
      { key: 'dashboard', label: 'Dashboard', icon: 'layout' },
      {
        category: 'OPERATIONS',
        items: [
          { key: 'appointments', label: 'Appointments', icon: 'calendar' },
          { key: 'patients', label: 'Patients', icon: 'smile' },
          { key: 'portal', label: 'Bookings', icon: 'external-link' },
          { key: 'stock', label: 'Inventory', icon: 'package' },
        ],
      },
      {
        category: 'CRM',
        items: [
          { key: 'followups', label: 'Calls', icon: 'phone-call' },
          { key: 'leads', label: 'Leads', icon: 'zap' },
        ],
      },
      {
        category: 'FINANCE',
        items: [
          { key: 'billing', label: 'Billing', icon: 'file-text' },
          { key: 'payments', label: 'Payments', icon: 'credit-card' },
        ],
      },
    ];
  } else if (state.user.role === 'dentist') {
    menu = [
      { key: 'dashboard', label: 'Dashboard', icon: 'layout' },
      {
        category: 'MY CLINIC',
        items: [
          { key: 'appointments', label: 'My Appointments', icon: 'calendar' },
          { key: 'patients', label: 'My Patients', icon: 'smile' },
        ],
      },
      {
        category: 'CLINICAL',
        items: [
          { key: 'plans-list', label: 'Treatment Plans', icon: 'clipboard' },
          { key: 'prescriptions', label: 'Prescriptions', icon: 'pill' },
          { key: 'packages', label: 'Treatments', icon: 'tag' },
          { key: 'chart', label: 'Dental Chart', icon: 'activity' },
          { key: 'documents', label: 'Documents', icon: 'file-text' },
        ],
      },
    ];
  } else if (state.user.role === 'patient') {
    menu = [
      { key: 'dashboard', label: 'Dashboard', icon: 'layout' },
      {
        category: 'MY ACCOUNT',
        items: [{ key: 'profile', label: 'My Profile', icon: 'user' }],
      },
      {
        category: 'MY CARE',
        items: [
          { key: 'appointments', label: 'My Appointments', icon: 'calendar' },
          { key: 'my-treatments', label: 'My Treatments', icon: 'tag' },
          { key: 'my-treatment-plan', label: 'My Treatment Plan', icon: 'clipboard' },
          { key: 'my-medical-records', label: 'My Medical Records', icon: 'file-text' },
        ],
      },
      {
        category: 'FINANCE',
        items: [
          { key: 'billing', label: 'My Invoices', icon: 'file-text' },
          { key: 'payments', label: 'My Payments', icon: 'credit-card' },
        ],
      },
      { key: 'portal', label: 'Book Appointment', icon: 'calendar-check' },
    ];
  }

  const addMenuItem = (item) => {
    const itemLi = document.createElement('li');
    const safeKey = escapeHtml(item.key);
    const safeIcon = escapeHtml(item.icon);
    const safeLabel = escapeHtml(item.label);
    itemLi.innerHTML = `
      <a href="#${safeKey}" class="menu-link ${state.currentRoute === item.key ? 'active' : ''}" data-route="${safeKey}">
        <i data-lucide="${safeIcon}"></i>
        <span>${safeLabel}</span>
      </a>
    `;
    menuList.appendChild(itemLi);
  };

  menu.forEach((cat) => {
    if (cat.category) {
      const headerLi = document.createElement('li');
      headerLi.className = 'sidebar-category-header';
      headerLi.textContent = cat.category;
      menuList.appendChild(headerLi);
      cat.items.forEach(addMenuItem);
    } else {
      addMenuItem(cat);
    }
  });

  document.querySelectorAll('.menu-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const route = e.currentTarget.getAttribute('data-route');
      window.location.hash = route;
      navigate(route);
    });
  });

  refreshIcons();
}

export async function navigate(route) {
  state.currentRoute = route;

  document.querySelectorAll('.menu-link').forEach((link) => {
    if (link.getAttribute('data-route') === route) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  const workspace = document.getElementById('workspace-view');
  const viewTitle = document.getElementById('view-title');
  const scrollArea = document.getElementById('workspace-scroll-area');
  if (scrollArea) scrollArea.scrollTop = 0;
  workspace.innerHTML = '<div class="loader">Loading view...</div>';

  try {
    switch (route) {
      case 'dashboard':
      case 'analytics':
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
            <button class="btn btn-primary" id="btn-goto-patients-chart">Select Patient File</button>
          </div>
        `;
        document.getElementById('btn-goto-patients-chart').addEventListener('click', () => {
          window.location.hash = 'patients';
          navigate('patients');
        });
        break;
      case 'documents':
        viewTitle.textContent = 'Clinical Documents';
        workspace.innerHTML = `
          <div style="background:var(--bg-secondary); padding:32px; border-radius:var(--radius-md); border:1px solid var(--border-color); text-align:center;">
            <h3>Clinical Documents Hub</h3>
            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:20px;">Upload, download, and review patient X-rays or medical records directly in their Patient 360 file.</p>
            <button class="btn btn-primary" id="btn-goto-patients-docs">Select Patient File</button>
          </div>
        `;
        document.getElementById('btn-goto-patients-docs').addEventListener('click', () => {
          window.location.hash = 'patients';
          navigate('patients');
        });
        break;
      default:
        if (route.startsWith('patient-360-')) {
          const id = route.split('-')[2];
          viewTitle.textContent = 'Patient File #360';
          await renderPatient360View(workspace, id);
        } else if (route.startsWith('invoice-')) {
          const id = route.split('-')[1];
          viewTitle.textContent = 'Invoice Detail';
          await renderInvoiceView(workspace, id);
        } else {
          viewTitle.textContent = 'Dashboard';
          await renderDashboardView(workspace);
        }
    }
  } catch (err) {
    workspace.innerHTML = '';
    const errDiv = document.createElement('div');
    errDiv.className = 'toast danger';
    errDiv.textContent = `Error loading view: ${err.message}`;
    workspace.appendChild(errDiv);
  }
  refreshIcons();
}

