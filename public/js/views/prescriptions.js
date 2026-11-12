import { state } from '../state.js';
import { apiJson, apiRequest } from '../api.js';
import { escapeHtml, refreshIcons, formatDate, showToast, createModal } from '../utils.js';

export async function renderPrescriptionsView(container) {
  let prescriptions = [];
  try {
    prescriptions = await apiJson('/api/prescriptions');
  } catch (err) {
    container.innerHTML = `<div class="card p-6 text-danger">${escapeHtml(err.message || 'Error loading prescriptions.')}</div>`;
    return;
  }

  const canWrite = ['admin', 'dentist'].includes(state.user.role);

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Medical &amp; Dental Prescriptions</h2>
        <p class="page-subtitle">Manage and issue medication prescriptions for dental patients.</p>
      </div>
      ${canWrite ? '<button class="btn btn-primary" id="btn-add-rx"><i data-lucide="plus"></i> Write Prescription</button>' : ''}
    </div>

    <div class="card">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Medication</th>
              <th>Dosage</th>
              <th>Patient</th>
              <th>Prescribing Doctor</th>
              <th>Date Issued</th>
              <th>Instructions</th>
              ${canWrite ? '<th>Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${
              prescriptions.length
                ? prescriptions
                    .map(
                      (rx) => `
                      <tr>
                        <td><div class="font-bold">${escapeHtml(rx.medication)}</div></td>
                        <td><span class="badge badge-info">${escapeHtml(rx.dosage || 'Standard')}</span></td>
                        <td>${escapeHtml(rx.pat_first)} ${escapeHtml(rx.pat_last)}</td>
                        <td>Dr. ${escapeHtml(rx.dent_first)} ${escapeHtml(rx.dent_last)}</td>
                        <td>${escapeHtml(formatDate(rx.created_at))}</td>
                        <td><div class="text-sm text-secondary">${escapeHtml(rx.instructions || '---')}</div></td>
                        ${
                          canWrite
                            ? `<td><button class="btn btn-sm btn-danger" data-delete-rx="${Number(rx.id)}"><i data-lucide="trash-2"></i></button></td>`
                            : ''
                        }
                      </tr>
                    `
                    )
                    .join('')
                : `<tr><td colspan="${canWrite ? 7 : 6}" class="text-center text-muted" style="padding:30px;">No prescriptions issued yet.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  refreshIcons();

  const addBtn = document.getElementById('btn-add-rx');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      openWritePrescriptionModal(() => renderPrescriptionsView(container));
    });
  }

  container.querySelectorAll('[data-delete-rx]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.deleteRx);
      if (!confirm('Remove this prescription record?')) return;
      const { ok, data } = await apiRequest(`/api/prescriptions/${id}`, { method: 'DELETE' });
      if (ok) {
        showToast('Prescription removed.');
        await renderPrescriptionsView(container);
      } else {
        showToast((data && data.message) || 'Failed to delete prescription.', 'error');
      }
    });
  });
}

async function openWritePrescriptionModal(onDone) {
  let patients = [];
  let dentists = [];
  try {
    [patients, dentists] = await Promise.all([apiJson('/api/patients'), apiJson('/api/dentists')]);
  } catch (err) {
    showToast(err.message || 'Failed to load prescription data.', 'error');
    return;
  }

  const { close } = createModal(`
    <div class="modal-header">
      <div class="modal-title">Write New Prescription</div>
      <button type="button" class="btn-icon" data-close-modal><i data-lucide="x"></i></button>
    </div>
    <form id="add-rx-form">
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label>Patient *</label>
            <select id="rx-patient" required>
              ${patients
                .map((p) => `<option value="${Number(p.id)}">${escapeHtml(p.first_name)} ${escapeHtml(p.last_name)}</option>`)
                .join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Prescribing Dentist *</label>
            <select id="rx-dentist" required>
              ${dentists
                .map(
                  (d) =>
                    `<option value="${Number(d.id)}" ${state.user.relatedId === d.id ? 'selected' : ''}>Dr. ${escapeHtml(d.first_name)} ${escapeHtml(d.last_name)}</option>`
                )
                .join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Medication Name *</label>
            <input type="text" id="rx-med" placeholder="e.g. Amoxicillin 500mg" required>
          </div>
          <div class="form-group">
            <label>Dosage / Quantity</label>
            <input type="text" id="rx-dosage" placeholder="e.g. 21 Capsules">
          </div>
        </div>
        <div class="form-group">
          <label>Instructions &amp; Warnings</label>
          <textarea id="rx-inst" rows="3" placeholder="e.g. Take 1 capsule by mouth 3 times a day for 7 days."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
        <button type="submit" class="btn btn-primary">Issue Prescription</button>
      </div>
    </form>
  `);

  document.getElementById('add-rx-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      patientId: Number(document.getElementById('rx-patient').value),
      dentistId: Number(document.getElementById('rx-dentist').value),
      medication: document.getElementById('rx-med').value,
      dosage: document.getElementById('rx-dosage').value,
      instructions: document.getElementById('rx-inst').value,
    };

    const { ok, data } = await apiRequest('/api/prescriptions', {
      method: 'POST',
      body: payload,
    });

    if (ok) {
      showToast('Prescription issued.');
      close();
      await onDone();
    } else {
      showToast((data && data.message) || 'Failed to issue prescription.', 'error');
    }
  });
}

