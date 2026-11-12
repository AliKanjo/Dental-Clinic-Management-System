import { refreshIcons, showToast } from '../utils.js';

export async function renderClinicSettingsView(container) {
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem('dentflow_settings') || '{}');
    } catch {
      return {};
    }
  })();

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Clinic Settings &amp; Preferences</h2>
        <p class="page-subtitle">Configure general clinic metadata, working hours, and portal preferences.</p>
      </div>
    </div>

    <div class="grid-2">
      <div class="card p-6">
        <h4 class="card-title mb-4">Practice Information</h4>
        <form id="settings-practice-form">
          <div class="form-group">
            <label>Clinic Name</label>
            <input type="text" id="set-clinic-name" value="DentFlow Pro Dental Clinic">
          </div>
          <div class="form-group">
            <label>Clinic Support Phone</label>
            <input type="text" id="set-clinic-phone" value="+1 (555) 234-5678">
          </div>
          <div class="form-group">
            <label>Clinic Timezone</label>
            <select id="set-clinic-tz">
              <option value="UTC">UTC (Standard Clinic Schedule)</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Save Preferences</button>
        </form>
      </div>

      <div class="card p-6">
        <h4 class="card-title mb-4">Booking &amp; Security Policy</h4>
        <div class="flex flex-col gap-4 text-sm text-secondary">
          <div class="flex items-center justify-between p-3 rounded" style="background: var(--bg-app);">
            <span>Require 8+ character passwords</span>
            <span class="badge badge-success">Enforced</span>
          </div>
          <div class="flex items-center justify-between p-3 rounded" style="background: var(--bg-app);">
            <span>Appointment conflict double-booking prevention</span>
            <span class="badge badge-success">Active</span>
          </div>
          <div class="flex items-center justify-between p-3 rounded" style="background: var(--bg-app);">
            <span>Role-based patient chart isolation</span>
            <span class="badge badge-success">Active</span>
          </div>
        </div>
      </div>
    </div>
  `;

  if (saved.clinicName) {
    document.getElementById('set-clinic-name').value = saved.clinicName;
  }
  if (saved.clinicPhone) {
    document.getElementById('set-clinic-phone').value = saved.clinicPhone;
  }
  if (saved.clinicTz) {
    document.getElementById('set-clinic-tz').value = saved.clinicTz;
  }

  refreshIcons();

  document.getElementById('settings-practice-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const prefs = {
      clinicName: document.getElementById('set-clinic-name').value,
      clinicPhone: document.getElementById('set-clinic-phone').value,
      clinicTz: document.getElementById('set-clinic-tz').value,
    };
    localStorage.setItem('dentflow_settings', JSON.stringify(prefs));
    showToast('Clinic preferences saved.');
  });
}

