import { state } from '../state.js';
import { apiJson, apiRequest } from '../api.js';
import { escapeHtml, refreshIcons, showToast, createModal } from '../utils.js';

export async function renderPackagesView(container) {
  let treatments = [];
  try {
    treatments = await apiJson('/api/treatments');
  } catch (err) {
    container.innerHTML = `<div class="card p-6 text-danger">${escapeHtml(err.message || 'Error loading services.')}</div>`;
    return;
  }

  const canManage = ['admin', 'staff'].includes(state.user.role);

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Dental Services &amp; Pricing Catalog</h2>
        <p class="page-subtitle">Standardized treatment codes, procedures, and base clinic fee schedule.</p>
      </div>
      ${canManage ? '<button class="btn btn-primary" id="btn-add-pkg"><i data-lucide="plus"></i> Add Service</button>' : ''}
    </div>

    <div class="grid-3">
      ${
        treatments.length
          ? treatments
              .map(
                (t) => `
                <div class="card p-6">
                  <div class="flex justify-between items-start mb-3">
                    <div class="stat-icon blue" style="width:40px; height:40px; font-size:18px;"><i data-lucide="tag"></i></div>
                    <div class="font-bold text-primary" style="font-size: 20px;">$${Number(t.base_cost).toFixed(2)}</div>
                  </div>
                  <h4 class="font-bold mb-2">${escapeHtml(t.name)}</h4>
                  <p class="text-sm text-secondary mb-4" style="min-height: 40px;">${escapeHtml(t.description || 'Comprehensive dental procedure and clinical care.')}</p>
                  ${
                    canManage
                      ? `<div class="flex justify-between items-center pt-3 border-t" style="border-top:1px solid var(--border-light);">
                          <button class="btn btn-sm btn-secondary" data-edit-pkg="${Number(t.id)}"><i data-lucide="edit-2"></i> Edit</button>
                          <button class="btn btn-sm btn-danger" data-del-pkg="${Number(t.id)}"><i data-lucide="trash-2"></i></button>
                        </div>`
                      : ''
                  }
                </div>
              `
              )
              .join('')
          : '<div class="card p-6 text-muted">No services configured in the catalog.</div>'
      }
    </div>
  `;

  refreshIcons();

  const addBtn = document.getElementById('btn-add-pkg');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      openTreatmentModal(null, () => renderPackagesView(container));
    });
  }

  container.querySelectorAll('[data-edit-pkg]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const treatment = treatments.find((item) => Number(item.id) === Number(btn.dataset.editPkg));
      if (treatment) {
        openTreatmentModal(treatment, () => renderPackagesView(container));
      }
    });
  });

  container.querySelectorAll('[data-del-pkg]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.delPkg);
      if (!confirm('Delete this treatment service from the catalog?')) return;
      const { ok, data } = await apiRequest(`/api/treatments/${id}`, { method: 'DELETE' });
      if (ok) {
        showToast('Service deleted.');
        await renderPackagesView(container);
      } else {
        showToast((data && data.message) || 'Cannot delete: Service may be tied to active plans.', 'error');
      }
    });
  });
}

function openTreatmentModal(existing = null, onDone) {
  const isEdit = Boolean(existing);
  const modal = createModal(`
    <div class="modal-container">
      <div class="modal-header">
        <div class="modal-title">${isEdit ? 'Edit Service' : 'Add Dental Service'}</div>
        <button type="button" class="btn-icon" data-close-modal><i data-lucide="x"></i></button>
      </div>
      <form id="pkg-form">
        <div class="modal-body">
          <div class="form-group">
            <label>Procedure / Service Name *</label>
            <input type="text" id="pkg-name" value="${escapeHtml(existing ? existing.name : '')}" required>
          </div>
          <div class="form-group">
            <label>Base Fee ($) *</label>
            <input type="number" step="0.01" min="0" id="pkg-cost" value="${existing ? Number(existing.base_cost) : ''}" required>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="pkg-desc" rows="3">${escapeHtml(existing ? existing.description || '' : '')}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update Service' : 'Save Service'}</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('pkg-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('pkg-name').value,
      baseCost: parseFloat(document.getElementById('pkg-cost').value),
      description: document.getElementById('pkg-desc').value,
    };

    const { ok, data } = await apiRequest(
      isEdit ? `/api/treatments/${existing.id}` : '/api/treatments',
      {
        method: isEdit ? 'PUT' : 'POST',
        body: payload,
      }
    );

    if (ok) {
      showToast(isEdit ? 'Service updated.' : 'Service added to catalog.');
      modal.remove();
      await onDone();
    } else {
      showToast((data && data.message) || 'Failed to save service.', 'error');
    }
  });
}

export async function renderMyTreatmentsView(container) {
  let plans = [];
  let catalog = [];
  try {
    [plans, catalog] = await Promise.all([apiJson('/api/plans'), apiJson('/api/treatments')]);
  } catch (err) {
    container.innerHTML = `<div class="card p-6 text-danger">${escapeHtml(err.message || 'Error loading treatment records.')}</div>`;
    return;
  }

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Clinic Treatment History &amp; Procedures</h2>
        <p class="page-subtitle">Review completed clinical items across active dental treatment plans.</p>
      </div>
    </div>

    <div class="grid-3 mb-6">
      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">Active Treatment Plans</div>
          <div class="stat-value">${plans.filter((p) => p.status === 'active').length}</div>
        </div>
        <div class="stat-icon blue"><i data-lucide="clipboard-list"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">Total Procedures in Catalog</div>
          <div class="stat-value">${catalog.length}</div>
        </div>
        <div class="stat-icon teal"><i data-lucide="tag"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <div class="stat-label">Completed Plans</div>
          <div class="stat-value">${plans.filter((p) => p.status === 'completed').length}</div>
        </div>
        <div class="stat-icon green"><i data-lucide="check-circle"></i></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">Recent Treatment Plans</span></div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Plan Title</th>
              <th>Patient</th>
              <th>Assigned Dentist</th>
              <th>Total Fee</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${
              plans.length
                ? plans
                    .map(
                      (p) => `
                      <tr>
                        <td class="font-bold">${escapeHtml(p.title)}</td>
                        <td>${escapeHtml(p.patient_first || '')} ${escapeHtml(p.patient_last || '')}</td>
                        <td>Dr. ${escapeHtml(p.dentist_first || '')} ${escapeHtml(p.dentist_last || '')}</td>
                        <td class="font-bold">$${Number(p.total_cost || 0).toFixed(2)}</td>
                        <td><span class="badge ${p.status === 'completed' ? 'badge-success' : 'badge-info'}">${escapeHtml(p.status)}</span></td>
                      </tr>
                    `
                    )
                    .join('')
                : '<tr><td colspan="5" class="text-center text-muted" style="padding:30px;">No treatment plans recorded.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  refreshIcons();
}

