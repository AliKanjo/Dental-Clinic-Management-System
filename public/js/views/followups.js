import { state } from '../state.js';
import { apiJson, apiRequest } from '../api.js';
import { escapeHtml, refreshIcons, formatDate, showToast, createModal } from '../utils.js';

export async function completeFollowup(id, onDone = null) {
  const { ok, data } = await apiRequest(`/api/followups/${id}`, {
    method: 'PUT',
    body: { status: 'completed', notes: 'Completed via CRM' },
  });

  if (ok) {
    showToast('Task marked completed.');
    if (typeof onDone === 'function') {
      await onDone();
    } else {
      const container = document.getElementById('page-container');
      if (container) await renderFollowupsView(container);
    }
  } else {
    showToast((data && data.message) || 'Failed to update task.', 'error');
  }
}

export async function openAddFollowupModal({ leads: preloadedLeads = null, onDone = null } = {}) {
  let patients = [];
  let leads = preloadedLeads || [];
  let staffUsers = [];

  try {
    const requests = [apiJson('/api/patients')];
    if (!preloadedLeads) requests.push(apiJson('/api/leads'));
    if (state.user && state.user.role === 'admin') requests.push(apiJson('/api/users'));

    const results = await Promise.all(requests);
    patients = results[0] || [];
    let idx = 1;
    if (!preloadedLeads) {
      leads = results[idx++] || [];
    }
    if (state.user && state.user.role === 'admin') {
      staffUsers = results[idx] || [];
    }
  } catch (err) {
    showToast(err.message || 'Failed to load follow-up options.', 'error');
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const modal = createModal(`
    <div class="modal-container">
      <div class="modal-header">
        <div class="modal-title">Schedule Follow-up Task / Call</div>
        <button type="button" class="btn-icon" data-close-modal><i data-lucide="x"></i></button>
      </div>
      <form id="add-followup-form">
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Related Patient (Optional)</label>
              <select id="fu-patient">
                <option value="">-- Select Patient --</option>
                ${patients
                  .map((p) => `<option value="${Number(p.id)}">${escapeHtml(p.first_name)} ${escapeHtml(p.last_name)}</option>`)
                  .join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Or Related Lead (Optional)</label>
              <select id="fu-lead">
                <option value="">-- Select Lead --</option>
                ${leads
                  .map((l) => `<option value="${Number(l.id)}">${escapeHtml(l.first_name)} ${escapeHtml(l.last_name)}</option>`)
                  .join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Scheduled Date *</label>
              <input type="date" id="fu-date" value="${todayStr}" required>
            </div>
            ${
              staffUsers.length
                ? `<div class="form-group">
                    <label>Assign To</label>
                    <select id="fu-assignee">
                      <option value="">Self (${escapeHtml(state.user.firstName || '')})</option>
                      ${staffUsers
                        .filter((u) => u.role === 'staff' || u.role === 'admin')
                        .map((u) => `<option value="${Number(u.id)}">${escapeHtml(u.first_name)} ${escapeHtml(u.last_name)} (${escapeHtml(u.role)})</option>`)
                        .join('')}
                    </select>
                  </div>`
                : ''
            }
          </div>
          <div class="form-group">
            <label>Call Script / Follow-up Notes</label>
            <textarea id="fu-notes" rows="3" placeholder="e.g. Remind patient about upcoming root canal hygiene visit"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">Schedule Follow-Up</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('add-followup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const patientVal = document.getElementById('fu-patient').value;
    const leadVal = document.getElementById('fu-lead').value;
    const assigneeEl = document.getElementById('fu-assignee');
    const assignedTo = assigneeEl && assigneeEl.value ? Number(assigneeEl.value) : null;

    const payload = {
      patientId: patientVal ? Number(patientVal) : null,
      leadId: leadVal ? Number(leadVal) : null,
      assignedTo,
      scheduledDate: document.getElementById('fu-date').value,
      notes: document.getElementById('fu-notes').value,
    };

    const { ok, data } = await apiRequest('/api/followups', {
      method: 'POST',
      body: payload,
    });

    if (ok) {
      showToast('Follow-up scheduled successfully.');
      modal.remove();
      if (typeof onDone === 'function') {
        await onDone();
      } else {
        const container = document.getElementById('page-container');
        if (container) await renderFollowupsView(container);
      }
    } else {
      showToast((data && data.message) || 'Failed to schedule follow-up.', 'error');
    }
  });
}

export async function renderFollowupsView(container) {
  let followups = [];
  try {
    followups = await apiJson('/api/followups');
  } catch (err) {
    container.innerHTML = `<div class="card p-6 text-danger">${escapeHtml(err.message || 'Error loading follow-ups.')}</div>`;
    return;
  }

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Follow-up Calls &amp; Outreach Tasks</h2>
        <p class="page-subtitle">Daily patient recall, inquiry callbacks, and reminder logs.</p>
      </div>
      <button class="btn btn-primary" id="btn-add-fu"><i data-lucide="plus"></i> New Call Task</button>
    </div>

    <div class="card">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Target Contact</th>
              <th>Type</th>
              <th>Assigned To</th>
              <th>Scheduled Date</th>
              <th>Notes</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${
              followups.length
                ? followups
                    .map((f) => {
                      const target = f.pat_first
                        ? `${f.pat_first} ${f.pat_last || ''}`
                        : f.lead_first
                          ? `${f.lead_first} ${f.lead_last || ''}`
                          : 'General Task';
                      const typeLabel = f.pat_first ? 'Patient' : f.lead_first ? 'Lead' : 'General';
                      const assignee = f.staff_first ? `${f.staff_first} ${f.staff_last || ''}` : 'Clinic Team';
                      const statusBadge = f.status === 'completed' ? 'badge-success' : 'badge-warning';

                      return `
                        <tr>
                          <td><div class="font-bold">${escapeHtml(target)}</div></td>
                          <td><span class="badge badge-info">${escapeHtml(typeLabel)}</span></td>
                          <td>${escapeHtml(assignee)}</td>
                          <td>${escapeHtml(formatDate(f.scheduled_date))}</td>
                          <td><div class="text-sm text-secondary">${escapeHtml(f.notes || '---')}</div></td>
                          <td><span class="badge ${statusBadge}">${escapeHtml(f.status)}</span></td>
                          <td>
                            ${
                              f.status === 'pending'
                                ? `<button class="btn btn-sm btn-success" data-complete-fu="${Number(f.id)}"><i data-lucide="check"></i> Mark Done</button>`
                                : `<span class="text-xs text-muted">${escapeHtml(formatDate(f.completed_at))}</span>`
                            }
                          </td>
                        </tr>
                      `;
                    })
                    .join('')
                : '<tr><td colspan="7" class="text-center text-muted" style="padding:30px;">No follow-up tasks scheduled.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  refreshIcons();

  document.getElementById('btn-add-fu').addEventListener('click', () => {
    openAddFollowupModal({ onDone: () => renderFollowupsView(container) });
  });

  container.querySelectorAll('[data-complete-fu]').forEach((btn) => {
    btn.addEventListener('click', () => {
      completeFollowup(Number(btn.dataset.completeFu), () => renderFollowupsView(container));
    });
  });
}

