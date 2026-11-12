import { state } from '../state.js';
import { apiJson, apiRequest } from '../api.js';
import {
  escapeHtml,
  refreshIcons,
  formatDate,
  formatDateTime,
  showToast,
  addNotification,
} from '../utils.js';
import { renderPlansAccordion } from './patient360.js';

export async function renderPatientBookingPortal(container) {
  let dentists = [];
  let myAppts = [];

  try {
    [dentists, myAppts] = await Promise.all([apiJson('/api/dentists'), apiJson('/api/appointments')]);
  } catch (err) {
    container.innerHTML = `<div class="card p-6 text-danger">${escapeHtml(err.message || 'Error loading booking portal.')}</div>`;
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Patient Appointments &amp; Bookings</h2>
        <p class="page-subtitle">Schedule an appointment with our dental specialists or review your upcoming visits.</p>
      </div>
    </div>

    <div class="grid-2">
      <div class="card p-6">
        <h4 class="card-title mb-4">Request New Appointment</h4>
        <form id="patient-booking-form">
          <div class="form-group">
            <label>Select Dentist *</label>
            <select id="pb-dentist" required>
              ${dentists
                .map(
                  (d) =>
                    `<option value="${Number(d.id)}">Dr. ${escapeHtml(d.first_name)} ${escapeHtml(d.last_name)} (${escapeHtml(d.specialization || 'General Dentistry')})</option>`
                )
                .join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Preferred Date *</label>
              <input type="date" id="pb-date" value="${todayStr}" min="${todayStr}" required>
            </div>
            <div class="form-group">
              <label>Preferred Time (UTC Clinic Hours) *</label>
              <input type="time" id="pb-time" value="10:00" required>
            </div>
          </div>
          <div class="form-group">
            <label>Reason for Visit / Symptoms</label>
            <textarea id="pb-notes" rows="3" placeholder="e.g. Routine checkup and cleaning, or toothache on upper left"></textarea>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">Confirm Appointment Request</button>
        </form>
      </div>

      <div class="card p-6">
        <h4 class="card-title mb-4">Scheduled &amp; Past Visits</h4>
        <div class="flex flex-col gap-3">
          ${
            myAppts.length
              ? myAppts
                  .map((a) => {
                    const statusBadge =
                      a.status === 'completed'
                        ? 'badge-success'
                        : a.status === 'cancelled'
                          ? 'badge-danger'
                          : 'badge-info';
                    return `
                      <div class="p-3 rounded border" style="background: var(--bg-app);">
                        <div class="flex justify-between items-center mb-1">
                          <span class="font-bold">Dr. ${escapeHtml(a.dentist_first)} ${escapeHtml(a.dentist_last)}</span>
                          <span class="badge ${statusBadge}">${escapeHtml(a.status)}</span>
                        </div>
                        <div class="text-sm text-secondary">${escapeHtml(formatDateTime(a.start_time))}</div>
                        ${a.notes ? `<div class="text-xs text-muted mt-1">${escapeHtml(a.notes)}</div>` : ''}
                      </div>
                    `;
                  })
                  .join('')
              : '<div class="text-muted text-sm">You have no appointments recorded yet.</div>'
          }
        </div>
      </div>
    </div>
  `;

  refreshIcons();

  document.getElementById('patient-booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dateVal = document.getElementById('pb-date').value;
    const timeVal = document.getElementById('pb-time').value;
    const startUtc = new Date(`${dateVal}T${timeVal}:00.000Z`);
    const endUtc = new Date(startUtc.getTime() + 30 * 60000);

    const payload = {
      dentistId: Number(document.getElementById('pb-dentist').value),
      startTime: startUtc.toISOString(),
      endTime: endUtc.toISOString(),
      notes: document.getElementById('pb-notes').value,
    };

    const { ok, data } = await apiRequest('/api/appointments', {
      method: 'POST',
      body: payload,
    });

    if (ok) {
      showToast('Appointment booked successfully!');
      addNotification(`Booked appointment for ${dateVal} at ${timeVal} UTC`);
      await renderPatientBookingPortal(container);
    } else {
      showToast((data && data.message) || 'Selected slot is unavailable.', 'error');
    }
  });
}

export async function renderPatientRecordsPortal(container) {
  if (!state.user || !state.user.relatedId) {
    container.innerHTML = '<div class="card p-6 text-danger">Patient record profile is not linked to this account.</div>';
    return;
  }

  let data;
  let prescriptions = [];
  try {
    [data, prescriptions] = await Promise.all([
      apiJson(`/api/patients/${state.user.relatedId}`),
      apiJson('/api/prescriptions'),
    ]);
  } catch (err) {
    container.innerHTML = `<div class="card p-6 text-danger">${escapeHtml(err.message || 'Error loading medical records.')}</div>`;
    return;
  }

  const patient = data.patient;
  const formattedNotes = patient.notes
    ? escapeHtml(patient.notes).replace(/\n/g, '<br>')
    : 'No medical history notes on file yet.';

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">My Dental Medical Records</h2>
        <p class="page-subtitle">Review your clinical notes, allergies, issued prescriptions, and invoices.</p>
      </div>
    </div>

    <div class="grid-2 mb-6">
      <div class="card p-6">
        <h4 class="card-title mb-3">Allergies &amp; Medical Alerts</h4>
        <div class="p-3 rounded mb-4" style="background: var(--danger-bg); color: var(--danger); font-weight: 600;">
          ${escapeHtml(patient.medical_allergies || 'No known allergies recorded.')}
        </div>
        <h4 class="card-title mb-2">Clinical Notes</h4>
        <div class="text-sm text-secondary" style="line-height: 1.6;">${formattedNotes}</div>
      </div>

      <div class="card p-6">
        <h4 class="card-title mb-3">Issued Prescriptions</h4>
        <div class="flex flex-col gap-3">
          ${
            prescriptions.length
              ? prescriptions
                  .map(
                    (rx) => `
                    <div class="p-3 rounded border" style="background: var(--bg-app);">
                      <div class="flex justify-between items-center">
                        <span class="font-bold">${escapeHtml(rx.medication)}</span>
                        <span class="badge badge-info">${escapeHtml(rx.dosage || 'Standard')}</span>
                      </div>
                      <div class="text-xs text-muted mt-1">Dr. ${escapeHtml(rx.dent_first)} ${escapeHtml(rx.dent_last)} &bull; ${escapeHtml(formatDate(rx.created_at))}</div>
                      ${rx.instructions ? `<div class="text-sm text-secondary mt-2">${escapeHtml(rx.instructions)}</div>` : ''}
                    </div>
                  `
                  )
                  .join('')
              : '<div class="text-sm text-muted">No prescriptions issued yet.</div>'
          }
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">My Invoices</span></div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Issued Date</th>
              <th>Total Amount</th>
              <th>Paid</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${
              (data.invoices || []).length
                ? data.invoices
                    .map(
                      (inv) => `
                      <tr>
                        <td class="font-bold">#INV-${Number(inv.id)}</td>
                        <td>${escapeHtml(formatDate(inv.created_at))}</td>
                        <td class="font-bold">$${Number(inv.total_amount).toFixed(2)}</td>
                        <td class="text-success">$${Number(inv.amount_paid).toFixed(2)}</td>
                        <td><span class="badge ${inv.status === 'paid' ? 'badge-success' : inv.status === 'partially_paid' ? 'badge-warning' : 'badge-danger'}">${escapeHtml(inv.status)}</span></td>
                      </tr>
                    `
                    )
                    .join('')
                : '<tr><td colspan="5" class="text-center text-muted" style="padding:30px;">No invoices on file.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  refreshIcons();
}

export async function renderPatientTreatmentPlansPortal(container) {
  let plans = [];
  try {
    if (state.user && state.user.role === 'patient' && state.user.relatedId) {
      const data = await apiJson(`/api/patients/${state.user.relatedId}`);
      plans = data.treatmentPlans || [];
    } else {
      plans = await apiJson('/api/plans');
    }
  } catch (err) {
    container.innerHTML = `<div class="card p-6 text-danger">${escapeHtml(err.message || 'Error loading treatment plans.')}</div>`;
    return;
  }

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">My Treatment Plans</h2>
        <p class="page-subtitle">Track recommended dental procedures and completion progress.</p>
      </div>
    </div>
    ${renderPlansAccordion(plans)}
  `;

  refreshIcons();
}

export async function renderPatientProfileView(container) {
  if (!state.user || !state.user.relatedId) {
    container.innerHTML = '<div class="card p-6 text-danger">Patient record profile is not linked to this account.</div>';
    return;
  }

  let data;
  try {
    data = await apiJson(`/api/patients/${state.user.relatedId}`);
  } catch (err) {
    container.innerHTML = `<div class="card p-6 text-danger">${escapeHtml(err.message || 'Error loading profile.')}</div>`;
    return;
  }

  const p = data.patient;
  const dobValue = p.date_of_birth ? String(p.date_of_birth).slice(0, 10) : '';

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">My Patient Profile</h2>
        <p class="page-subtitle">Keep your contact details and allergy information up to date.</p>
      </div>
    </div>

    <div class="card p-6" style="max-width: 720px;">
      <form id="patient-profile-form">
        <div class="form-row">
          <div class="form-group">
            <label>First Name *</label>
            <input type="text" id="pp-fname" value="${escapeHtml(p.first_name)}" required>
          </div>
          <div class="form-group">
            <label>Last Name *</label>
            <input type="text" id="pp-lname" value="${escapeHtml(p.last_name)}" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="pp-email" value="${escapeHtml(p.email || '')}">
          </div>
          <div class="form-group">
            <label>Phone Number</label>
            <input type="tel" id="pp-phone" value="${escapeHtml(p.phone || '')}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Date of Birth</label>
            <input type="date" id="pp-dob" value="${escapeHtml(dobValue)}">
          </div>
          <div class="form-group">
            <label>Gender</label>
            <select id="pp-gender">
              <option value="Male" ${p.gender === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${p.gender === 'Female' ? 'selected' : ''}>Female</option>
              <option value="Other" ${p.gender === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Home Address</label>
          <input type="text" id="pp-address" value="${escapeHtml(p.address || '')}">
        </div>
        <div class="form-group">
          <label>Known Allergies</label>
          <input type="text" id="pp-allergies" value="${escapeHtml(p.medical_allergies || '')}">
        </div>
        <div class="form-group">
          <label>Notes for Your Dentist</label>
          <textarea id="pp-notes" rows="3">${escapeHtml(p.notes || '')}</textarea>
        </div>
        <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Update Profile</button>
      </form>
    </div>
  `;

  refreshIcons();

  document.getElementById('patient-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      firstName: document.getElementById('pp-fname').value,
      lastName: document.getElementById('pp-lname').value,
      email: document.getElementById('pp-email').value,
      phone: document.getElementById('pp-phone').value,
      dateOfBirth: document.getElementById('pp-dob').value || null,
      gender: document.getElementById('pp-gender').value,
      address: document.getElementById('pp-address').value,
      allergies: document.getElementById('pp-allergies').value,
      notes: document.getElementById('pp-notes').value,
    };

    const { ok, data: resData } = await apiRequest(`/api/patients/${state.user.relatedId}`, {
      method: 'PUT',
      body: payload,
    });

    if (ok) {
      state.user.firstName = payload.firstName;
      state.user.lastName = payload.lastName;
      const nameEl = document.getElementById('user-display-name');
      if (nameEl) nameEl.textContent = `${payload.firstName} ${payload.lastName}`;
      showToast('Profile updated successfully.');
    } else {
      showToast((resData && resData.message) || 'Failed to update profile.', 'error');
    }
  });
}
