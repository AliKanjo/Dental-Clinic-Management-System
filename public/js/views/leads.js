import { apiJson, apiRequest } from '../api.js';
import { escapeHtml, refreshIcons, formatDate, showToast, createModal } from '../utils.js';
import { completeFollowup, openAddFollowupModal } from './followups.js';

export async function renderLeadsView(container) {
  let leads = [];
  let followups = [];

  try {
    [leads, followups] = await Promise.all([apiJson('/api/leads'), apiJson('/api/followups')]);
  } catch (err) {
    container.innerHTML = `<div class="card p-6 text-danger">${escapeHtml(err.message || 'Error loading CRM data.')}</div>`;
    return;
  }

  const statuses = [
    { key: 'new', title: 'New Inquiries', color: 'var(--info)' },
    { key: 'contacted', title: 'Contacted', color: 'var(--warning)' },
    { key: 'converted', title: 'Converted to Patient', color: 'var(--success)' },
    { key: 'lost', title: 'Closed / Lost', color: 'var(--danger)' },
  ];

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">CRM Leads &amp; Conversion Pipeline</h2>
        <p class="page-subtitle">Manage prospective patient inquiries and convert leads into active patient records.</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-secondary" id="btn-add-followup-crm"><i data-lucide="phone-call"></i> Schedule Call Task</button>
        <button class="btn btn-primary" id="btn-add-lead"><i data-lucide="user-plus"></i> Add New Lead</button>
      </div>
    </div>

    <div class="grid-4 mb-6">
      ${statuses
        .map((st) => {
          const stLeads = leads.filter((l) => l.status === st.key);
          return `
            <div class="card" style="background: var(--bg-app); border: 1px solid var(--border);">
              <div class="card-header" style="background: white; border-top: 3px solid ${st.color}; border-radius: 12px 12px 0 0;">
                <span class="font-bold text-sm">${escapeHtml(st.title)}</span>
                <span class="badge badge-gray">${stLeads.length}</span>
              </div>
              <div class="card-body" style="padding: 12px; display: flex; flex-direction: column; gap: 10px;">
                ${
                  stLeads.length
                    ? stLeads
                        .map(
                          (l) => `
                          <div class="card p-3" style="box-shadow: var(--shadow-sm); cursor: pointer;" data-lead-id="${Number(l.id)}">
                            <div class="font-bold text-sm">${escapeHtml(l.first_name)} ${escapeHtml(l.last_name)}</div>
                            <div class="text-xs text-muted mt-1"><i data-lucide="phone" style="width:12px;"></i> ${escapeHtml(l.phone || 'N/A')}</div>
                            <div class="flex justify-between items-center mt-2">
                              <span class="badge badge-info" style="font-size:10px;">${escapeHtml(l.source || 'Direct')}</span>
                              <span class="text-xs text-muted">${escapeHtml(formatDate(l.created_at))}</span>
                            </div>
                          </div>
                        `
                        )
                        .join('')
                    : '<div class="text-center text-xs text-muted" style="padding: 20px;">No leads</div>'
                }
              </div>
            </div>
          `;
        })
        .join('')}
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">Scheduled Follow-Up Tasks</span></div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Target Contact</th>
              <th>Assigned Staff</th>
              <th>Scheduled Date</th>
              <th>Notes</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              followups.length
                ? followups
                    .map((f) => {
                      const target = f.pat_first
                        ? `Patient: ${f.pat_first} ${f.pat_last || ''}`
                        : f.lead_first
                          ? `Lead: ${f.lead_first} ${f.lead_last || ''}`
                          : 'General';
                      const staff = f.staff_first ? `${f.staff_first} ${f.staff_last || ''}` : 'Clinic Staff';
                      return `
                        <tr>
                          <td class="font-bold">${escapeHtml(target)}</td>
                          <td>${escapeHtml(staff)}</td>
                          <td>${escapeHtml(formatDate(f.scheduled_date))}</td>
                          <td><div class="text-sm text-secondary">${escapeHtml(f.notes || '---')}</div></td>
                          <td><span class="badge ${f.status === 'completed' ? 'badge-success' : 'badge-warning'}">${escapeHtml(f.status)}</span></td>
                          <td>
                            ${
                              f.status === 'pending'
                                ? `<button class="btn btn-sm btn-success" data-complete-fu="${Number(f.id)}">Done</button>`
                                : '<span class="text-xs text-muted">Completed</span>'
                            }
                          </td>
                        </tr>
                      `;
                    })
                    .join('')
                : '<tr><td colspan="6" class="text-center text-muted">No follow-ups scheduled.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  refreshIcons();

  document.getElementById('btn-add-lead').addEventListener('click', () => {
    openAddLeadModal(() => renderLeadsView(container));
  });

  document.getElementById('btn-add-followup-crm').addEventListener('click', () => {
    openAddFollowupModal({ leads, onDone: () => renderLeadsView(container) });
  });

  container.querySelectorAll('[data-lead-id]').forEach((card) => {
    card.addEventListener('click', () => {
      const lead = leads.find((item) => Number(item.id) === Number(card.dataset.leadId));
      if (lead) {
        openLeadDetailModal(lead, () => renderLeadsView(container));
      }
    });
  });

  container.querySelectorAll('[data-complete-fu]').forEach((btn) => {
    btn.addEventListener('click', () => {
      completeFollowup(Number(btn.dataset.completeFu), () => renderLeadsView(container));
    });
  });
}

function openAddLeadModal(onDone) {
  const modal = createModal(`
    <div class="modal-container">
      <div class="modal-header">
        <div class="modal-title">Add New Prospective Patient Lead</div>
        <button type="button" class="btn-icon" data-close-modal><i data-lucide="x"></i></button>
      </div>
      <form id="add-lead-form">
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>First Name *</label>
              <input type="text" id="l-fname" required>
            </div>
            <div class="form-group">
              <label>Last Name *</label>
              <input type="text" id="l-lname" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Phone Number</label>
              <input type="tel" id="l-phone">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="l-email">
            </div>
          </div>
          <div class="form-group">
            <label>Lead Source</label>
            <select id="l-source">
              <option value="Website Booking">Website Booking</option>
              <option value="Phone Inquiry">Phone Inquiry</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Social Media">Social Media</option>
              <option value="Referral">Patient Referral</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">Save Lead</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('add-lead-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      firstName: document.getElementById('l-fname').value,
      lastName: document.getElementById('l-lname').value,
      phone: document.getElementById('l-phone').value,
      email: document.getElementById('l-email').value,
      source: document.getElementById('l-source').value,
    };

    const { ok, data } = await apiRequest('/api/leads', {
      method: 'POST',
      body: payload,
    });

    if (ok) {
      showToast('New lead captured.');
      modal.remove();
      await onDone();
    } else {
      showToast((data && data.message) || 'Failed to save lead.', 'error');
    }
  });
}

function openLeadDetailModal(lead, onDone) {
  const modal = createModal(`
    <div class="modal-container">
      <div class="modal-header">
        <div class="modal-title">${escapeHtml(lead.first_name)} ${escapeHtml(lead.last_name)} (Lead #${Number(lead.id)})</div>
        <button type="button" class="btn-icon" data-close-modal><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <div class="flex flex-col gap-3">
          <div><strong>Source:</strong> <span class="badge badge-info">${escapeHtml(lead.source || 'Direct')}</span></div>
          <div><strong>Phone:</strong> ${escapeHtml(lead.phone || 'N/A')}</div>
          <div><strong>Email:</strong> ${escapeHtml(lead.email || 'N/A')}</div>
          <div class="form-group mt-2">
            <label>Pipeline Stage</label>
            <select id="lead-status-select">
              <option value="new" ${lead.status === 'new' ? 'selected' : ''}>New Inquiry</option>
              <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>Contacted</option>
              <option value="converted" ${lead.status === 'converted' ? 'selected' : ''}>Converted to Patient</option>
              <option value="lost" ${lead.status === 'lost' ? 'selected' : ''}>Lost</option>
            </select>
          </div>
          ${
            lead.status !== 'converted'
              ? `<div class="p-3 bg-teal-light rounded text-xs" style="background: var(--success-bg); color: var(--success);">Note: Changing status to "Converted to Patient" automatically creates a patient file.</div>`
              : ''
          }
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-close-modal>Close</button>
        <button type="button" class="btn btn-primary" id="btn-save-lead-status">Update Status</button>
      </div>
    </div>
  `);

  document.getElementById('btn-save-lead-status').addEventListener('click', async () => {
    const newStatus = document.getElementById('lead-status-select').value;
    const { ok, data } = await apiRequest(`/api/leads/${lead.id}`, {
      method: 'PUT',
      body: {
        status: newStatus,
        email: lead.email || '',
        phone: lead.phone || '',
      },
    });

    if (ok) {
      showToast(
        newStatus === 'converted'
          ? 'Lead converted and Patient file created!'
          : 'Lead status updated.'
      );
      modal.remove();
      await onDone();
    } else {
      showToast((data && data.message) || 'Failed to update lead.', 'error');
    }
  });
}

