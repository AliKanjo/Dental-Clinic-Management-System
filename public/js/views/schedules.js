import { apiJson } from '../api.js';
import { escapeHtml, refreshIcons } from '../utils.js';
import { openDentistAvailabilityModal } from './users.js';

export async function renderSchedulesView(container) {
  let dentists = [];
  let avails = [];

  try {
    dentists = await apiJson('/api/dentists');
    avails = await Promise.all(dentists.map((d) => apiJson(`/api/dentists/${d.id}/availability`)));
  } catch (err) {
    container.innerHTML = `<div class="card p-6 text-danger">${escapeHtml(err.message || 'Error loading schedules.')}</div>`;
    return;
  }

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Clinic Work Schedules &amp; Availability</h2>
        <p class="page-subtitle">Configure doctor shift hours and weekly clinical roster.</p>
      </div>
    </div>

    <div class="grid-2">
      ${
        dentists.length
          ? dentists
              .map((d, index) => {
                const shifts = avails[index] || [];
                return `
                  <div class="card p-6">
                    <div class="flex justify-between items-center mb-4 pb-3" style="border-bottom: 1px solid var(--border-light);">
                      <div class="flex items-center gap-3">
                        <div class="stat-icon blue" style="width:40px; height:40px;"><i data-lucide="user-check"></i></div>
                        <div>
                          <div class="font-bold">Dr. ${escapeHtml(d.first_name)} ${escapeHtml(d.last_name)}</div>
                          <div class="text-xs text-muted">${escapeHtml(d.specialization || 'General Dentistry')}</div>
                        </div>
                      </div>
                      <button class="btn btn-sm btn-primary" data-edit-sched="${Number(d.id)}"><i data-lucide="edit-2"></i> Edit Hours</button>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      ${
                        shifts.length
                          ? shifts
                              .map(
                                (s) => `
                                <span class="badge badge-info">${escapeHtml(days[s.day_of_week] || '')}: ${escapeHtml(s.start_hour)} - ${escapeHtml(s.end_hour)}</span>
                              `
                              )
                              .join('')
                          : '<span class="text-sm text-muted">No clinical shifts configured.</span>'
                      }
                    </div>
                  </div>
                `;
              })
              .join('')
          : '<div class="card p-6 text-muted">No dentists registered yet.</div>'
      }
    </div>
  `;

  refreshIcons();

  container.querySelectorAll('[data-edit-sched]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dent = dentists.find((d) => Number(d.id) === Number(btn.dataset.editSched));
      if (dent) {
        openDentistAvailabilityModal(dent.id, `${dent.first_name} ${dent.last_name}`, () =>
          renderSchedulesView(container)
        );
      }
    });
  });
}

