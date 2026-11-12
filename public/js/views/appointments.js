import { state } from '../state.js';
import { apiRequest } from '../api.js';
import { createModal, escapeHtml, formatDateTime, formatTime, refreshIcons, showToast } from '../utils.js';
import { navigate } from '../router.js';

export async function renderAppointmentsView(container) {
  const { data: dentists } = await apiRequest('/api/dentists');
  state.dentists = dentists || [];

  const dentistFilterHtml =
    state.user.role === 'dentist'
      ? `
    <label style="display:flex; align-items:center; gap:6px; font-size:0.85rem; font-weight:600; cursor:pointer; color:var(--text-primary); margin-left:16px;">
      <input type="checkbox" id="chk-my-appts-only" checked style="width:16px; height:16px; margin:0; cursor:pointer;">
      <span>Show My Appointments Only</span>
    </label>
  `
      : '';

  container.innerHTML = `
    <div class="view-header-actions">
      <div>
        <h4 id="calendar-month-year" style="font-size:1.2rem; font-weight:600;">Calendar</h4>
      </div>
      ${state.user.role !== 'patient' ? '<button class="btn btn-primary" id="btn-add-appt"><i data-lucide="calendar-plus"></i>Book Appointment</button>' : ''}
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

  document.getElementById('btn-add-appt')?.addEventListener('click', () => openBookApptModalForDate(''));

  let currentDate = new Date();

  document.getElementById('btn-cal-prev').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    drawCalendar(currentDate);
  });
  document.getElementById('btn-cal-next').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    drawCalendar(currentDate);
  });
  document.getElementById('btn-cal-today').addEventListener('click', () => {
    currentDate = new Date();
    drawCalendar(currentDate);
  });

  document.getElementById('chk-my-appts-only')?.addEventListener('change', () => {
    drawCalendar(currentDate);
  });

  await drawCalendar(currentDate);
}

async function drawCalendar(date) {
  const container = document.getElementById('calendar-days-container');
  const monthYearLabel = document.getElementById('calendar-month-year');

  const year = date.getFullYear();
  const month = date.getMonth();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  monthYearLabel.textContent = `${monthNames[month]} ${year}`;

  const { data: rawAppts } = await apiRequest('/api/appointments');
  let appts = Array.isArray(rawAppts) ? rawAppts : [];

  const chk = document.getElementById('chk-my-appts-only');
  if (chk && chk.checked && state.user.role === 'dentist') {
    appts = appts.filter((a) => String(a.dentist_id) === String(state.user.relatedId));
  }

  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let gridHTML = dayHeaders.map((day) => `<div class="calendar-day-header">${day}</div>`).join('');

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const todayObj = new Date();

  for (let i = 0; i < firstDayIndex; i++) {
    gridHTML += '<div class="calendar-cell empty" style="min-height: 100px; background: var(--bg-primary); opacity: 0.5;"></div>';
  }

  for (let day = 1; day <= totalDays; day++) {
    const isToday =
      day === todayObj.getDate() && month === todayObj.getMonth() && year === todayObj.getFullYear();
    const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const dayAppts = appts.filter((a) => String(a.start_time || '').startsWith(cellDateStr));

    const apptBadges = dayAppts
      .map((a) => {
        let color = '#3b82f6';
        if (a.status === 'pending') color = '#eab308';
        if (a.status === 'completed') color = '#10b981';
        if (a.status === 'cancelled') color = '#ef4444';
        if (a.status === 'no-show') color = '#f59e0b';

        const displayName =
          a.patient_first || a.patient_last
            ? `${a.patient_first || ''} ${a.patient_last || ''}`.trim()
            : `Dr. ${a.dentist_first || ''} ${a.dentist_last || ''}`.trim();
        const label = `${formatTime(a.start_time)}: ${displayName}`;
        return `
        <div class="calendar-appt-badge" data-appt-id="${Number(a.id)}" style="background-color: ${color};" title="${escapeHtml(label)}">
          ${escapeHtml(label)}
        </div>
      `;
      })
      .join('');

    gridHTML += `
      <div class="calendar-cell ${isToday ? 'today' : ''}" data-date="${cellDateStr}" style="cursor: pointer;">
        <div class="calendar-cell-header">${day}</div>
        ${apptBadges}
      </div>
    `;
  }

  container.innerHTML = gridHTML;

  container.querySelectorAll('.calendar-appt-badge').forEach((badge) => {
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditApptModal(Number(badge.getAttribute('data-appt-id')), appts);
    });
  });

  if (state.user.role !== 'patient') {
    container.querySelectorAll('.calendar-cell:not(.empty)').forEach((cell) => {
      cell.addEventListener('click', () => {
        openBookApptModalForDate(cell.getAttribute('data-date'));
      });
    });
  }

  refreshIcons();
}

async function openBookApptModalForDate(dateStr) {
  const { data: patients } = await apiRequest('/api/patients');
  const patientList = Array.isArray(patients) ? patients : [];
  const defaultDate = dateStr || new Date().toISOString().slice(0, 10);

  const modal = createModal(`
    <div class="modal-container">
      <div class="modal-header">
        <h3>Book Clinic Appointment</h3>
        <button class="btn-icon" data-close-modal><i data-lucide="x"></i></button>
      </div>
      <form id="book-appt-form">
        <div class="modal-body">
          <div class="form-group">
            <label>Select Patient*</label>
            <select id="appt-patient" required>
              ${patientList.map((p) => `<option value="${Number(p.id)}">${escapeHtml(p.first_name)} ${escapeHtml(p.last_name)} (${escapeHtml(p.phone || 'N/A')})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Responsible Dentist*</label>
            <select id="appt-dentist" required>
              ${state.dentists.map((d) => `<option value="${Number(d.id)}">Dr. ${escapeHtml(d.first_name)} ${escapeHtml(d.last_name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Appointment Date*</label>
              <input type="date" id="appt-date" required value="${escapeHtml(defaultDate)}">
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
          <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">Schedule Appointment</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('book-appt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('appt-date').value;
    const time = document.getElementById('appt-time').value;
    const startObj = new Date(`${date}T${time}:00.000Z`);
    const endObj = new Date(startObj.getTime() + 60 * 60 * 1000);

    const payload = {
      patientId: Number(document.getElementById('appt-patient').value),
      dentistId: Number(document.getElementById('appt-dentist').value),
      startTime: startObj.toISOString(),
      endTime: endObj.toISOString(),
      notes: document.getElementById('appt-notes').value,
    };

    const { ok, data } = await apiRequest('/api/appointments', { method: 'POST', body: payload });
    if (ok) {
      showToast('Appointment scheduled successfully.', 'success');
      modal.remove();
      await navigate('appointments');
    } else {
      showToast((data && data.error) || 'Failed to schedule appointment', 'danger');
    }
  });
}

async function openEditApptModal(apptId, cachedAppts) {
  let appts = cachedAppts;
  if (!appts) {
    const { data } = await apiRequest('/api/appointments');
    appts = data || [];
  }
  const a = appts.find((item) => Number(item.id) === Number(apptId));
  if (!a) return;

  const isPatient = state.user.role === 'patient';
  const personLabel =
    a.patient_first || a.patient_last
      ? `${a.patient_first || ''} ${a.patient_last || ''}`.trim()
      : `Dr. ${a.dentist_first || ''} ${a.dentist_last || ''}`.trim();

  const modal = createModal(`
    <div class="modal-container">
      <div class="modal-header">
        <h3>Manage Appointment Status</h3>
        <button class="btn-icon" data-close-modal><i data-lucide="x"></i></button>
      </div>
      <form id="edit-appt-form">
        <div class="modal-body">
          <p style="margin-bottom:16px;"><strong>${isPatient ? 'Dentist' : 'Patient'}:</strong> ${escapeHtml(personLabel)}</p>
          <p style="margin-bottom:16px;"><strong>Scheduled Time:</strong> ${escapeHtml(formatDateTime(a.start_time))}</p>
          <div class="form-group">
            <label>Update Status</label>
            <select id="edit-appt-status">
              ${
                isPatient
                  ? '<option value="cancelled">Cancel Appointment</option>'
                  : `
                <option value="pending" ${a.status === 'pending' ? 'selected' : ''}>Pending Approval</option>
                <option value="scheduled" ${a.status === 'scheduled' ? 'selected' : ''}>Scheduled / Accepted</option>
                <option value="completed" ${a.status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="cancelled" ${a.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                <option value="no-show" ${a.status === 'no-show' ? 'selected' : ''}>No-Show</option>
              `
              }
            </select>
          </div>
          ${
            !isPatient
              ? `<div class="form-group">
                   <label>Modify Session Notes</label>
                   <input type="text" id="edit-appt-notes" value="${escapeHtml(a.notes || '')}">
                 </div>`
              : ''
          }
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById('edit-appt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      status: document.getElementById('edit-appt-status').value,
    };
    const notesInput = document.getElementById('edit-appt-notes');
    if (notesInput) payload.notes = notesInput.value;

    const { ok, data } = await apiRequest(`/api/appointments/${apptId}`, { method: 'PUT', body: payload });
    if (ok) {
      showToast('Appointment updated successfully', 'success');
      modal.remove();
      await navigate('appointments');
    } else {
      showToast((data && data.error) || 'Failed to update status', 'danger');
    }
  });
}

