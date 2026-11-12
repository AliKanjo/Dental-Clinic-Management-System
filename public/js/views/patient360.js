import { state } from '../state.js';
import { apiRequest } from '../api.js';
import {
  addNotification,
  calculateAge,
  createModal,
  escapeHtml,
  formatDate,
  formatDateTime,
  refreshIcons,
  showToast,
} from '../utils.js';
import { navigate } from '../router.js';
import { deletePatient } from './patients.js';

export function renderPlansAccordion(plans) {
  if (!plans || plans.length === 0) {
    return '<div class="empty-state">No treatment plans created yet.</div>';
  }

  return plans
    .map(
      (plan) => `
    <div class="stat-card" style="display:block; margin-top:16px; padding:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
        <div>
          <h4 style="font-size:1.05rem;">${escapeHtml(plan.title)}</h4>
          <span style="font-size:0.8rem; color:var(--text-muted);">Assigned Dentist: Dr. ${escapeHtml(plan.dentist_first)} ${escapeHtml(plan.dentist_last)} | Plan Cost: $${Number(plan.total_cost || 0).toFixed(2)}</span>
        </div>
        <span class="badge ${plan.status === 'active' ? 'primary' : 'success'}">${escapeHtml(plan.status)}</span>
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
            ${(plan.items || [])
              .map(
                (item) => `
              <tr>
                <td>
                  <strong>${escapeHtml(item.treatment_name)}</strong><br>
                  <span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(item.notes || '')}</span>
                </td>
                <td>${escapeHtml(item.tooth_number || 'General')}</td>
                <td>$${Number(item.cost || 0).toFixed(2)}</td>
                <td>
                  <span class="badge ${item.status === 'completed' ? 'success' : 'warning'}">${escapeHtml(item.status)}</span>
                </td>
                ${
                  state.user.role !== 'patient'
                    ? `
                  <td>
                    ${
                      item.status === 'pending'
                        ? `<button class="btn btn-primary btn-complete-plan-item" data-item-id="${Number(item.id)}" data-patient-id="${Number(plan.patient_id)}" style="padding:6px 12px; font-size:0.75rem;">
                             <i data-lucide="check" style="width:12px;height:12px;"></i> Complete
                           </button>`
                        : '<i data-lucide="check-circle" style="color:var(--success-color); width:20px;height:20px;"></i>'
                    }
                  </td>
                `
                    : ''
                }
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `
    )
    .join('');
}

async function completePlanItem(itemId, patientId) {
  const { ok, data } = await apiRequest(`/api/plans/items/${itemId}`, {
    method: 'PUT',
    body: { status: 'completed' },
  });

  if (ok) {
    showToast('Procedure marked as completed. Unpaid invoice generated.', 'success');
    addNotification('Procedure completed. Patient balance updated.');
    await navigate(`patient-360-${patientId}`);
  } else {
    showToast((data && data.error) || 'Failed to update treatment status', 'danger');
  }
}

export async function renderPatient360View(container, patientId) {
  const { ok, data } = await apiRequest(`/api/patients/${patientId}`);
  if (!ok || !data) {
    container.innerHTML = '<div class="toast danger">Patient file not found.</div>';
    return;
  }

  const p = data.patient;
  const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
  const timelineEventsCount = data.appointments.length + data.treatmentPlans.length;

  let totalPaid = 0;
  let totalOutstanding = 0;
  data.invoices.forEach((inv) => {
    const paid = Number(inv.amount_paid || 0);
    const total = Number(inv.total_amount || 0);
    totalPaid += paid;
    totalOutstanding += total - paid;
  });

  const balanceText = totalOutstanding > 0 ? `$${totalOutstanding.toLocaleString()}` : '$0';
  const openBalanceBadge =
    totalOutstanding > 0
      ? `<span class="badge danger">Open Balance: $${totalOutstanding.toLocaleString()}</span>`
      : '<span class="badge success" style="background-color: #ecfdf5; color: #047857;">No open balance</span>';

  const hasAllergies = p.medical_allergies && p.medical_allergies.toLowerCase() !== 'none';
  const initials = `${(p.first_name || 'P').charAt(0)}${(p.last_name || '').charAt(0)}`;
  const canDelete = state.user.role === 'admin' || state.user.role === 'staff';

  container.innerHTML = `
    <div style="background:var(--bg-secondary); border-radius:var(--radius-md); border:1px solid var(--border-color); padding:24px; margin-bottom:24px; box-shadow:var(--shadow-sm);">
      <p style="font-size:0.75rem; color:#06b6d4; font-weight:700; text-transform:uppercase; margin-bottom:12px; letter-spacing:0.05em;">Unified Medical File</p>
      
      <div style="display:flex; align-items:center; gap:20px; flex-wrap:wrap; margin-bottom:24px;">
        <div class="patient-avatar-large" style="margin:0; width:72px; height:72px; font-size:1.8rem; background-color:#e0f7fa; color:#006064;">
          ${escapeHtml(initials)}
        </div>
        <div style="flex:1;">
          <h2 style="font-size:1.6rem; font-weight:700; margin-bottom:4px;">${escapeHtml(fullName)}</h2>
          <div style="display:flex; gap:16px; font-size:0.85rem; color:var(--text-secondary); margin-bottom:8px; flex-wrap:wrap;">
            <span><strong>MRN-</strong>20260823-${Number(p.id)}</span>
            <span><strong>Phone:</strong> ${escapeHtml(p.phone || 'N/A')}</span>
            <span><strong>Latest Visit:</strong> ${data.appointments.length > 0 ? escapeHtml(formatDateTime(data.appointments[0].start_time).split(',')[0]) : 'N/A'}</span>
          </div>
          <div style="display:flex; gap:8px;">
            <span class="badge primary" style="background-color:#e0e7ff; color:#4338ca;">Medical client</span>
            <span class="badge success" style="background-color:#ecfdf5; color:#047857;">${timelineEventsCount} clinical events</span>
            ${openBalanceBadge}
          </div>
        </div>
        ${
          canDelete
            ? `<div>
                 <button class="btn btn-secondary" id="btn-delete-patient-360" title="Delete Patient Record" style="color:var(--danger-color); border-color:#fca5a5; background-color:#fef2f2; display:flex; align-items:center; gap:6px; padding:8px 14px; font-size:0.85rem; font-weight:600; cursor:pointer;">
                   <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                   Delete Patient
                 </button>
               </div>`
            : ''
        }
      </div>

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
          <strong style="font-size:1.25rem; color:var(--text-primary);">$${(totalPaid / (data.invoices.length || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
        </div>
        <div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">Alerts</p>
          <strong style="font-size:1.25rem; color:var(--danger-color);">${hasAllergies ? '1' : '0'}</strong>
        </div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:24px; margin-bottom:32px;">
      <div style="background:var(--bg-secondary); border-radius:var(--radius-md); border:1px solid var(--border-color); padding:20px; box-shadow:var(--shadow-sm);">
        <h4 style="font-size:0.9rem; font-weight:600; margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">Patient details</h4>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:0.85rem;">
          <div>
            <span style="color:var(--text-muted); display:block; font-size:0.75rem;">MRN</span>
            <strong>MRN-20260823-${Number(p.id)}</strong>
          </div>
          <div>
            <span style="color:var(--text-muted); display:block; font-size:0.75rem;">Age</span>
            <strong>${p.date_of_birth ? escapeHtml(calculateAge(p.date_of_birth)) : 'N/A'}</strong>
          </div>
          <div>
            <span style="color:var(--text-muted); display:block; font-size:0.75rem;">Gender</span>
            <strong>${escapeHtml(p.gender || 'N/A')}</strong>
          </div>
          <div>
            <span style="color:var(--text-muted); display:block; font-size:0.75rem;">Email</span>
            <strong>${escapeHtml(p.email || 'N/A')}</strong>
          </div>
        </div>
      </div>

      <div style="background:var(--bg-secondary); border-radius:var(--radius-md); border:1px solid var(--border-color); padding:20px; box-shadow:var(--shadow-sm);">
        <h4 style="font-size:0.9rem; font-weight:600; margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">Next action</h4>
        <p style="font-size:0.9rem; color:${hasAllergies ? 'var(--danger-color)' : '#059669'}; font-weight:700; margin-bottom:6px;">
          ${hasAllergies ? 'Allergy Alert Logged' : 'File is healthy'}
        </p>
        <p style="font-size:0.8rem; color:var(--text-secondary);">
          ${hasAllergies ? `Review allergy precautions (${escapeHtml(p.medical_allergies)}) before clinical procedures.` : 'No critical alerts right now. The file is ready for follow-up or a new visit.'}
        </p>
      </div>

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

    <div class="patient-main-records" style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:24px;">
      <div class="tabs-navigation">
        <button class="tab-btn active" data-tab="tab-plans">Treatment Plans</button>
        <button class="tab-btn" data-tab="tab-appts">Appointments</button>
        <button class="tab-btn" data-tab="tab-bills">Invoices</button>
        <button class="tab-btn" data-tab="tab-notes">Clinical Notes</button>
      </div>

      <div class="tab-content-panel active" id="tab-plans">
        <div class="view-header-actions" style="margin-bottom:16px;">
          <h4>Procedures & Care Plans</h4>
          ${state.user.role === 'admin' || state.user.role === 'dentist' ? '<button class="btn btn-primary" id="btn-create-plan"><i data-lucide="plus-circle"></i>New Plan</button>' : ''}
        </div>
        <div id="plans-list-container">
          ${renderPlansAccordion(data.treatmentPlans)}
        </div>
      </div>

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
                ${
                  data.appointments.length === 0
                    ? '<tr><td colspan="4" style="text-align:center;">No appointments found.</td></tr>'
                    : data.appointments
                        .map(
                          (a) => `
                  <tr>
                    <td><strong>${escapeHtml(formatDateTime(a.start_time))}</strong></td>
                    <td>Dr. ${escapeHtml(a.dentist_first)} ${escapeHtml(a.dentist_last)}</td>
                    <td><span class="badge ${a.status === 'completed' ? 'success' : 'primary'}">${escapeHtml(a.status)}</span></td>
                    <td>${escapeHtml(a.notes || 'N/A')}</td>
                  </tr>
                `
                        )
                        .join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
                ${
                  data.invoices.length === 0
                    ? '<tr><td colspan="6" style="text-align:center;">No invoice records.</td></tr>'
                    : data.invoices
                        .map(
                          (i) => `
                  <tr>
                    <td><strong>INV-10${Number(i.id)}</strong></td>
                    <td>${escapeHtml(formatDate(i.due_date))}</td>
                    <td>$${Number(i.total_amount || 0).toFixed(2)}</td>
                    <td>$${Number(i.amount_paid || 0).toFixed(2)}</td>
                    <td><span class="badge ${i.status === 'paid' ? 'success' : 'danger'}">${escapeHtml(i.status)}</span></td>
                    <td>
                      <button class="btn btn-secondary btn-icon btn-view-invoice" data-invoice-id="${Number(i.id)}">
                        <i data-lucide="eye" style="width:14px;height:14px;"></i>
                      </button>
                    </td>
                  </tr>
                `
                        )
                        .join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="tab-content-panel" id="tab-notes">
        <div class="view-header-actions" style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
          <h4>Clinical History Notes</h4>
          ${state.user.role !== 'patient' ? '<button class="btn btn-secondary" id="btn-edit-medical-notes" style="display:flex; align-items:center; gap:6px;"><i data-lucide="edit-3" style="width:14px;height:14px;"></i>Edit Medical Notes</button>' : ''}
        </div>
        
        <div style="margin-bottom:16px;">
          <strong style="font-size:0.85rem; color:var(--text-secondary); display:block; margin-bottom:4px;">Medical Allergies:</strong>
          <span class="badge ${hasAllergies ? 'danger' : 'success'}">${escapeHtml(p.medical_allergies || 'None')}</span>
        </div>

        <strong style="font-size:0.85rem; color:var(--text-secondary); display:block; margin-bottom:4px;">Internal Diagnostic Logs:</strong>
        <div style="background:var(--bg-primary); padding:16px; border-radius:var(--radius-md); font-size:0.9rem;">
          ${p.notes ? escapeHtml(p.notes).replace(/\n/g, '<br>') : 'No diagnosis notes logged yet.'}
        </div>
      </div>
    </div>
  `;

  if (canDelete) {
    document.getElementById('btn-delete-patient-360')?.addEventListener('click', () => {
      deletePatient(p.id, fullName, true);
    });
  }

  document.getElementById('btn-create-plan')?.addEventListener('click', () => openCreatePlanModal(p.id));
  document.getElementById('btn-edit-medical-notes')?.addEventListener('click', () => openEditMedicalNotesModal(p));

  container.querySelectorAll('.btn-complete-plan-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      completePlanItem(btn.getAttribute('data-item-id'), btn.getAttribute('data-patient-id'));
    });
  });

  container.querySelectorAll('.btn-view-invoice').forEach((btn) => {
    btn.addEventListener('click', () => {
      const invId = btn.getAttribute('data-invoice-id');
      window.location.hash = `invoice-${invId}`;
      navigate(`invoice-${invId}`);
    });
  });

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content-panel').forEach((panel) => panel.classList.remove('active'));
      e.target.classList.add('active');
      document.getElementById(e.target.getAttribute('data-tab')).classList.add('active');
    });
  });

  refreshIcons();
}

function openEditMedicalNotesModal(patient) {
  const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
  const modal = createModal(`
    <div class="modal-container" style="width:600px;">
      <div class="modal-header">
        <h3>Edit Medical Notes — ${escapeHtml(fullName)}</h3>
        <button class="btn-icon" data-close-modal><i data-lucide="x"></i></button>
      </div>
      <form id="edit-medical-notes-form">
        <div class="modal-body">
          <div class="form-group">
            <label>Medical Allergies</label>
            <input type="text" id="edit-p-allergies" value="${escapeHtml(patient.medical_allergies || 'None')}" placeholder="e.g. Penicillin, Latex, None" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--bg-primary); color: var(--text-primary); width:100%;">
          </div>
          
          <div class="form-group" style="position:relative;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label>Internal Diagnostic Notes</label>
              <button class="btn btn-secondary" type="button" id="btn-ai-optimize-notes" style="padding:4px 8px; font-size:0.75rem; background-color:rgba(79, 70, 229, 0.05); color:#4f46e5; border:1px dashed #4f46e5; display:flex; align-items:center; gap:4px;">
                <i data-lucide="sparkles" style="width:12px;height:12px;"></i>Optimize with AI
              </button>
            </div>
            <textarea id="edit-p-notes" rows="8" style="width:100%; font-family:inherit; padding:12px; border-radius:var(--radius-sm); border:1px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary);" placeholder="Type diagnosis notes here...">${escapeHtml(patient.notes || '')}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  `);

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
      const { ok, data } = await apiRequest('/api/ai/optimize-notes', {
        method: 'POST',
        body: { notes: rawNotes },
      });
      if (ok && data) {
        if (data.formattedNotes) {
          const cleanText = data.formattedNotes
            .replace(/<p>/g, '')
            .replace(/<\/p>/g, '\n\n')
            .replace(/<br\s*\/?>/g, '\n')
            .replace(/<li>/g, '• ')
            .replace(/<\/li>/g, '\n')
            .replace(/<ul>/g, '')
            .replace(/<\/ul>/g, '')
            .trim();
          notesTextarea.value = cleanText;
        }
        if (data.allergies && data.allergies.toLowerCase() !== 'none') {
          allergiesInput.value = data.allergies;
          showToast('AI successfully optimized notes and extracted allergies!', 'success');
        } else {
          showToast('AI successfully optimized notes!', 'success');
        }
      } else {
        showToast((data && data.error) || 'AI optimization failed.', 'danger');
      }
    } catch {
      showToast('Network error querying AI helper.', 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
      refreshIcons();
    }
  });

  document.getElementById('edit-medical-notes-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dobFormatted = patient.date_of_birth ? String(patient.date_of_birth).slice(0, 10) : null;
    const payload = {
      firstName: patient.first_name,
      lastName: patient.last_name,
      email: patient.email || null,
      phone: patient.phone || null,
      dateOfBirth: dobFormatted,
      gender: patient.gender || null,
      address: patient.address || null,
      allergies: document.getElementById('edit-p-allergies').value,
      notes: document.getElementById('edit-p-notes').value,
    };

    try {
      const { ok, data } = await apiRequest(`/api/patients/${patient.id}`, {
        method: 'PUT',
        body: payload,
      });
      if (ok) {
        showToast('Medical record updated successfully', 'success');
        modal.remove();
        await navigate(`patient-360-${patient.id}`);
      } else {
        showToast((data && data.error) || 'Failed to update medical record', 'danger');
      }
    } catch {
      showToast('Network error updating medical record.', 'danger');
    }
  });
}

async function openCreatePlanModal(patientId) {
  const [treatmentsRes, dentistsRes] = await Promise.all([
    apiRequest('/api/treatments'),
    apiRequest('/api/dentists'),
  ]);
  const treatments = treatmentsRes.data || [];
  const dentists = dentistsRes.data || [];

  const modal = createModal(`
    <div class="modal-container" style="width: 700px;">
      <div class="modal-header">
        <h3>Build Dental Treatment Plan</h3>
        <button class="btn-icon" data-close-modal><i data-lucide="x"></i></button>
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
              ${dentists.map((d) => `<option value="${Number(d.id)}">Dr. ${escapeHtml(d.first_name)} ${escapeHtml(d.last_name)}</option>`).join('')}
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
                ${treatments.map((t) => `<option value="${Number(t.id)}" data-cost="${Number(t.base_cost)}">${escapeHtml(t.name)} ($${Number(t.base_cost).toFixed(2)})</option>`).join('')}
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
        <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
        <button type="button" class="btn btn-primary" id="btn-submit-treatment-plan">Create Plan</button>
      </div>
    </div>
  `);

  const selectedItems = [];
  const itemsContainer = document.getElementById('added-plan-items');

  function renderAddedItems() {
    if (selectedItems.length === 0) {
      itemsContainer.innerHTML =
        '<p style="text-align:center; color:var(--text-muted); font-size:0.85rem; padding:16px;">No procedures added to the plan yet.</p>';
      return;
    }

    itemsContainer.innerHTML = selectedItems
      .map(
        (item, idx) => `
      <div class="plan-item-row">
        <div>
          <strong>${escapeHtml(item.name)}</strong><br>
          <span style="font-size:0.75rem; color:var(--text-secondary);">Tooth: ${escapeHtml(item.toothNumber || 'General')} | Notes: ${escapeHtml(item.notes || 'None')}</span>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <span>$${Number(item.cost).toFixed(2)}</span>
          <button class="btn-icon btn-remove-plan-item" data-idx="${idx}" style="color:var(--danger-color);"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
        </div>
      </div>
    `
      )
      .join('');

    itemsContainer.querySelectorAll('.btn-remove-plan-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        selectedItems.splice(idx, 1);
        renderAddedItems();
      });
    });

    refreshIcons();
  }

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
      const { ok, data } = await apiRequest('/api/ai/suggest-plan', {
        method: 'POST',
        body: { symptoms },
      });
      if (ok && Array.isArray(data)) {
        if (data.length === 0) {
          showToast('AI suggested no matching treatments from the catalog.', 'info');
        } else {
          data.forEach((sug) => {
            const treat = treatments.find((t) => String(t.id) === String(sug.treatmentId));
            if (treat) {
              selectedItems.push({
                treatmentId: Number(sug.treatmentId),
                name: treat.name,
                cost: Number(sug.cost ?? treat.base_cost),
                toothNumber: sug.toothNumber || '',
                notes: sug.notes || '',
              });
            }
          });
          renderAddedItems();
          showToast(`AI successfully added ${data.length} procedures!`, 'success');
          input.value = '';
        }
      } else {
        showToast((data && data.error) || 'AI suggestion failed.', 'danger');
      }
    } catch {
      showToast('Network error querying AI helper.', 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
      refreshIcons();
    }
  });

  document.getElementById('btn-add-item-to-plan').addEventListener('click', () => {
    const select = document.getElementById('item-procedure');
    const selectedOption = select.options[select.selectedIndex];
    if (!selectedOption) return;
    selectedItems.push({
      treatmentId: Number(select.value),
      name: selectedOption.text,
      cost: parseFloat(selectedOption.getAttribute('data-cost')),
      toothNumber: document.getElementById('item-tooth').value,
      notes: document.getElementById('item-notes').value,
    });
    document.getElementById('item-tooth').value = '';
    document.getElementById('item-notes').value = '';
    renderAddedItems();
  });

  document.getElementById('btn-submit-treatment-plan').addEventListener('click', async () => {
    const title = document.getElementById('tp-title').value;
    const dentistId = Number(document.getElementById('tp-dentist').value);

    if (!title || selectedItems.length === 0) {
      showToast('Plan title and at least one procedure are required.', 'warning');
      return;
    }

    const { ok, data } = await apiRequest('/api/plans', {
      method: 'POST',
      body: {
        patientId: Number(patientId),
        dentistId,
        title,
        items: selectedItems.map((i) => ({
          treatmentId: i.treatmentId,
          toothNumber: i.toothNumber,
          notes: i.notes,
          cost: i.cost,
        })),
      },
    });

    if (ok) {
      showToast('Treatment plan built successfully', 'success');
      modal.remove();
      await navigate(`patient-360-${patientId}`);
    } else {
      showToast((data && data.error) || 'Failed to submit treatment plan', 'danger');
    }
  });
}

export async function renderPlansListView(container) {
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
    const { ok, data: list } = await apiRequest('/api/plans');
    const tbody = document.getElementById('plans-list-table-body');
    if (!ok || !Array.isArray(list) || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No treatment plans configured.</td></tr>';
      return;
    }

    tbody.innerHTML = list
      .map(
        (plan) => `
      <tr>
        <td><strong>${escapeHtml(plan.patient_first)} ${escapeHtml(plan.patient_last)}</strong></td>
        <td>${escapeHtml(plan.title)}</td>
        <td><span class="badge ${plan.status === 'active' ? 'primary' : 'success'}">${escapeHtml((plan.status || '').toUpperCase())}</span></td>
        <td>$${Number(plan.total_cost || 0).toFixed(2)}</td>
        <td>
          <button class="btn btn-secondary btn-icon btn-open-plan-patient" data-patient-id="${Number(plan.patient_id)}" title="Open Patient File">
            <i data-lucide="eye" style="width:16px;height:16px;"></i>
          </button>
        </td>
      </tr>
    `
      )
      .join('');

    tbody.querySelectorAll('.btn-open-plan-patient').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-patient-id');
        window.location.hash = `patient-360-${id}`;
        navigate(`patient-360-${id}`);
      });
    });

    refreshIcons();
  } catch {
    showToast('Failed to load plans list', 'danger');
  }
}

