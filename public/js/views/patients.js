import { state } from '../state.js';
import { apiRequest } from '../api.js';
import { createModal, debounce, escapeHtml, formatDate, refreshIcons, showToast } from '../utils.js';
import { navigate } from '../router.js';

export async function renderPatientsView(container) {
  const dentistFilterHtml =
    state.user.role === 'dentist'
      ? `
    <label style="display:flex; align-items:center; gap:6px; font-size:0.85rem; font-weight:600; cursor:pointer; color:var(--text-primary); margin-left:16px;">
      <input type="checkbox" id="chk-my-patients-only" checked style="width:16px; height:16px; margin:0; cursor:pointer;">
      <span>My Patients Only</span>
    </label>
  `
      : '';

  container.innerHTML = `
    <div class="view-header-actions">
      <div style="display:flex; align-items:center; gap:16px; flex:1; flex-wrap:wrap;">
        <div class="search-input-wrapper" style="flex:1; max-width:400px; min-width:200px;">
          <i data-lucide="search"></i>
          <input type="text" id="patient-search" placeholder="Search by name, phone or email...">
        </div>
        ${dentistFilterHtml}
      </div>
      ${state.user.role !== 'dentist' ? '<button class="btn btn-primary" id="btn-add-patient"><i data-lucide="user-plus"></i>Add Patient</button>' : ''}
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

  const searchInput = document.getElementById('patient-search');
  searchInput.addEventListener('input', debounce(() => fetchPatients(searchInput.value), 300));

  const myPatChk = document.getElementById('chk-my-patients-only');
  if (myPatChk) {
    myPatChk.addEventListener('change', () => fetchPatients(searchInput.value));
  }

  if (state.user.role !== 'dentist') {
    document.getElementById('btn-add-patient').addEventListener('click', openAddPatientModal);
  }

  await fetchPatients();
}

export async function fetchPatients(query = '') {
  const myPatChk = document.getElementById('chk-my-patients-only');
  const assignedOnly = myPatChk && myPatChk.checked;

  let url = '/api/patients';
  const params = [];
  if (query) params.push(`q=${encodeURIComponent(query)}`);
  if (assignedOnly) params.push('assignedOnly=true');
  if (params.length) url += `?${params.join('&')}`;

  const { ok, data: patients } = await apiRequest(url);
  const tbody = document.getElementById('patients-table-body');
  if (!ok || !Array.isArray(patients) || patients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No patients found.</td></tr>';
    return;
  }

  const canDelete = state.user.role === 'admin' || state.user.role === 'staff';
  tbody.innerHTML = patients
    .map((p) => {
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
      const hasAllergy = p.medical_allergies && p.medical_allergies.toLowerCase() !== 'none';
      const dobDisplay = p.date_of_birth ? formatDate(p.date_of_birth) : 'N/A';

      return `
      <tr>
        <td><strong>${escapeHtml(fullName)}</strong></td>
        <td>${escapeHtml(dobDisplay)}</td>
        <td>${escapeHtml(p.phone || 'N/A')}</td>
        <td>${escapeHtml(p.email || 'N/A')}</td>
        <td><span class="badge ${hasAllergy ? 'danger' : 'success'}">${escapeHtml(p.medical_allergies || 'None')}</span></td>
        <td>
          <button class="btn btn-secondary btn-icon btn-view-patient" data-patient-id="${Number(p.id)}" title="Open Patient 360 File">
            <i data-lucide="eye" style="width:16px;height:16px;"></i>
          </button>
          ${
            canDelete
              ? `<button class="btn btn-secondary btn-icon btn-delete-patient" data-patient-id="${Number(p.id)}" data-patient-name="${escapeHtml(fullName)}" title="Delete Patient Record" style="color:var(--danger-color); margin-left:6px;">
                   <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                 </button>`
              : ''
          }
        </td>
      </tr>
    `;
    })
    .join('');

  tbody.querySelectorAll('.btn-view-patient').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-patient-id');
      window.location.hash = `patient-360-${id}`;
      navigate(`patient-360-${id}`);
    });
  });

  tbody.querySelectorAll('.btn-delete-patient').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-patient-id');
      const name = btn.getAttribute('data-patient-name');
      deletePatient(id, name);
    });
  });

  refreshIcons();
}

export async function deletePatient(patientId, patientName, redirectToList = false) {
  if (
    !confirm(
      `Are you sure you want to delete patient "${patientName}"? This will permanently delete their clinical records, appointments, and invoices.`
    )
  ) {
    return;
  }

  try {
    const { ok, data } = await apiRequest(`/api/patients/${patientId}`, { method: 'DELETE' });
    if (ok) {
      showToast((data && data.message) || `Patient "${patientName}" deleted successfully.`, 'success');
      if (redirectToList || window.location.hash.startsWith('#patient-360-')) {
        window.location.hash = 'patients';
        navigate('patients');
      } else {
        await fetchPatients();
      }
    } else {
      showToast((data && data.error) || 'Failed to delete patient.', 'danger');
    }
  } catch {
    showToast('Network error deleting patient.', 'danger');
  }
}

function openAddPatientModal() {
  const modal = createModal(`
    <div class="modal-container">
      <div class="modal-header">
        <h3>Create Patient Profile</h3>
        <button class="btn-icon" data-close-modal><i data-lucide="x"></i></button>
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
          <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">Create Profile</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('add-patient-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      firstName: document.getElementById('p-first-name').value,
      lastName: document.getElementById('p-last-name').value,
      dateOfBirth: document.getElementById('p-dob').value || null,
      gender: document.getElementById('p-gender').value,
      phone: document.getElementById('p-phone').value,
      email: document.getElementById('p-email').value || null,
      address: document.getElementById('p-address').value,
      allergies: document.getElementById('p-allergies').value,
      notes: document.getElementById('p-notes').value,
    };

    const { ok, data } = await apiRequest('/api/patients', { method: 'POST', body: payload });
    if (ok) {
      showToast('Patient profile created successfully', 'success');
      modal.remove();
      await fetchPatients();
    } else {
      showToast((data && data.error) || 'Failed to create patient', 'danger');
    }
  });
}

