import { state } from '../state.js';
import { apiJson, apiRequest } from '../api.js';
import { escapeHtml, refreshIcons, formatDate, showToast, createModal } from '../utils.js';

export async function renderUsersView(container, roleFilter = null) {
  let users = [];
  try {
    users = await apiJson('/api/users');
  } catch (err) {
    container.innerHTML = `<div class="card p-6 text-danger">${escapeHtml(err.message || 'Error loading users.')}</div>`;
    return;
  }

  const displayUsers = roleFilter ? users.filter((u) => u.role === roleFilter) : users;
  const pageHeading =
    roleFilter === 'dentist'
      ? 'Dentists Management'
      : roleFilter === 'staff'
        ? 'Clinic Staff Management'
        : 'User Accounts & Role Management';

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">${escapeHtml(pageHeading)}</h2>
        <p class="page-subtitle">Manage system access, dentist profiles, shift rosters, and clinic roles.</p>
      </div>
      <button class="btn btn-primary" id="btn-add-user"><i data-lucide="user-plus"></i> Add ${escapeHtml(roleFilter ? roleFilter.toUpperCase() : 'User')}</button>
    </div>

    <div class="card">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              displayUsers.length
                ? displayUsers
                    .map((u) => {
                      const roleBadge =
                        u.role === 'admin'
                          ? 'badge-danger'
                          : u.role === 'dentist'
                            ? 'badge-info'
                            : u.role === 'staff'
                              ? 'badge-warning'
                              : 'badge-gray';

                      return `
                        <tr>
                          <td>
                            <div class="font-bold">${escapeHtml(u.first_name)} ${escapeHtml(u.last_name)}</div>
                            ${
                              u.role === 'dentist' && u.specialization
                                ? `<div class="text-xs text-muted">${escapeHtml(u.specialization)}</div>`
                                : ''
                            }
                          </td>
                          <td>${escapeHtml(u.email)}</td>
                          <td><span class="badge ${roleBadge}">${escapeHtml(u.role.toUpperCase())}</span></td>
                          <td>${escapeHtml(u.phone || '---')}</td>
                          <td class="text-xs text-muted">${escapeHtml(formatDate(u.created_at))}</td>
                          <td>
                            <div class="flex gap-2">
                              ${
                                u.role === 'dentist' && u.dentist_id
                                  ? `<button class="btn btn-sm btn-secondary" data-avail-dentist="${Number(u.dentist_id)}" title="Availability"><i data-lucide="clock"></i></button>`
                                  : ''
                              }
                              <button class="btn btn-sm btn-secondary" data-edit-user="${Number(u.id)}" title="Edit Account"><i data-lucide="edit-2"></i></button>
                              ${
                                u.id !== state.user.id
                                  ? `<button class="btn btn-sm btn-danger" data-delete-user="${Number(u.id)}" title="Delete Account"><i data-lucide="trash-2"></i></button>`
                                  : ''
                              }
                            </div>
                          </td>
                        </tr>
                      `;
                    })
                    .join('')
                : '<tr><td colspan="6" class="text-center text-muted" style="padding:30px;">No user accounts found.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  refreshIcons();

  document.getElementById('btn-add-user').addEventListener('click', () => {
    openUserModal(null, roleFilter, () => renderUsersView(container, roleFilter));
  });

  container.querySelectorAll('[data-avail-dentist]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dentId = Number(btn.dataset.availDentist);
      const userObj = displayUsers.find((u) => Number(u.dentist_id) === dentId);
      const dentName = userObj ? `${userObj.first_name} ${userObj.last_name}` : 'Dentist';
      openDentistAvailabilityModal(dentId, dentName);
    });
  });

  container.querySelectorAll('[data-edit-user]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const userObj = displayUsers.find((u) => Number(u.id) === Number(btn.dataset.editUser));
      if (userObj) {
        openUserModal(userObj, roleFilter, () => renderUsersView(container, roleFilter));
      }
    });
  });

  container.querySelectorAll('[data-delete-user]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.deleteUser);
      if (!confirm('Are you sure you want to permanently delete this user account?')) return;
      const { ok, data } = await apiRequest(`/api/users/${id}`, { method: 'DELETE' });
      if (ok) {
        showToast('User account deleted.');
        await renderUsersView(container, roleFilter);
      } else {
        showToast((data && data.message) || 'Failed to delete user.', 'error');
      }
    });
  });
}

function openUserModal(existing = null, defaultRole = null, onDone) {
  const isEdit = Boolean(existing);
  const selectedRole = existing ? existing.role : defaultRole || 'staff';

  const { close } = createModal(`
    <div class="modal-header">
      <div class="modal-title">${isEdit ? 'Edit User Account' : 'Create User Account'}</div>
      <button type="button" class="btn-icon" data-close-modal><i data-lucide="x"></i></button>
    </div>
    <form id="user-form">
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label>First Name *</label>
            <input type="text" id="u-fname" value="${escapeHtml(existing ? existing.first_name : '')}" required>
          </div>
          <div class="form-group">
            <label>Last Name *</label>
            <input type="text" id="u-lname" value="${escapeHtml(existing ? existing.last_name : '')}" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Email Address *</label>
            <input type="email" id="u-email" value="${escapeHtml(existing ? existing.email : '')}" required>
          </div>
          <div class="form-group">
            <label>${isEdit ? 'New Password (leave blank to keep current)' : 'Password (min 8 chars) *'}</label>
            <input type="password" id="u-pass" ${isEdit ? '' : 'required'} minlength="8" placeholder="${isEdit ? 'Optional' : 'At least 8 characters'}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Role *</label>
            <select id="u-role" required>
              <option value="staff" ${selectedRole === 'staff' ? 'selected' : ''}>Reception / Staff</option>
              <option value="dentist" ${selectedRole === 'dentist' ? 'selected' : ''}>Dentist / Doctor</option>
              <option value="admin" ${selectedRole === 'admin' ? 'selected' : ''}>Clinic Administrator</option>
              <option value="patient" ${selectedRole === 'patient' ? 'selected' : ''}>Patient</option>
            </select>
          </div>
          <div class="form-group">
            <label>Phone Number</label>
            <input type="tel" id="u-phone" value="${escapeHtml(existing ? existing.phone || '' : '')}">
          </div>
        </div>
        <div id="dentist-extra-fields" class="${selectedRole === 'dentist' ? '' : 'hidden'}">
          <div class="form-row">
            <div class="form-group">
              <label>Clinical Specialization</label>
              <input type="text" id="u-spec" value="${escapeHtml(existing ? existing.specialization || '' : '')}" placeholder="e.g. Orthodontics">
            </div>
            <div class="form-group">
              <label>License Number</label>
              <input type="text" id="u-lic" value="${escapeHtml(existing ? existing.license_number || '' : '')}" placeholder="e.g. DDS-9001">
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Account'}</button>
      </div>
    </form>
  `);

  const roleSelect = document.getElementById('u-role');
  const dentistFields = document.getElementById('dentist-extra-fields');
  roleSelect.addEventListener('change', () => {
    dentistFields.classList.toggle('hidden', roleSelect.value !== 'dentist');
  });

  document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const passVal = document.getElementById('u-pass').value;
    if (!isEdit && passVal.length < 8) {
      showToast('Password must be at least 8 characters long.', 'error');
      return;
    }

    const payload = {
      firstName: document.getElementById('u-fname').value,
      lastName: document.getElementById('u-lname').value,
      email: document.getElementById('u-email').value,
      password: passVal || undefined,
      role: roleSelect.value,
      phone: document.getElementById('u-phone').value,
      specialization: document.getElementById('u-spec').value,
      licenseNumber: document.getElementById('u-lic').value,
    };

    const { ok, data } = await apiRequest(isEdit ? `/api/users/${existing.id}` : '/api/users', {
      method: isEdit ? 'PUT' : 'POST',
      body: payload,
    });

    if (ok) {
      showToast(isEdit ? 'User account updated.' : 'User account created.');
      close();
      await onDone();
    } else {
      showToast((data && data.message) || 'Failed to save user.', 'error');
    }
  });
}

export async function openDentistAvailabilityModal(dentistId, dentistName, onDone = null) {
  let existing = [];
  try {
    existing = await apiJson(`/api/dentists/${dentistId}/availability`);
  } catch (err) {
    showToast(err.message || 'Failed to load dentist availability.', 'error');
    return;
  }

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const { close } = createModal(`
    <div class="modal-header">
      <div class="modal-title">Dr. ${escapeHtml(dentistName)} - Availability Schedule</div>
      <button type="button" class="btn-icon" data-close-modal><i data-lucide="x"></i></button>
    </div>
    <form id="avail-form">
      <div class="modal-body">
        <p class="text-sm text-muted mb-4">Configure weekly shift windows. Appointments booked outside these hours will trigger validation warnings.</p>
        <div class="flex flex-col gap-3">
          ${days
            .map((dayName, idx) => {
              const row = existing.find((e) => Number(e.day_of_week) === idx);
              return `
                <div class="flex items-center justify-between p-2 rounded border" style="background: var(--bg-app);">
                  <label class="flex items-center gap-2 font-bold" style="width: 130px; margin: 0;">
                    <input type="checkbox" class="day-check" data-day="${idx}" ${row ? 'checked' : ''} style="width:auto;">
                    ${escapeHtml(dayName)}
                  </label>
                  <div class="flex items-center gap-2">
                    <input type="time" id="start-day-${idx}" value="${escapeHtml(row ? row.start_hour : '09:00')}" style="width: 110px;">
                    <span>to</span>
                    <input type="time" id="end-day-${idx}" value="${escapeHtml(row ? row.end_hour : '17:00')}" style="width: 110px;">
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
        <button type="submit" class="btn btn-primary">Save Schedule</button>
      </div>
    </form>
  `);

  document.getElementById('avail-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const shifts = [];
    document.querySelectorAll('.day-check').forEach((chk) => {
      if (chk.checked) {
        const d = Number(chk.dataset.day);
        shifts.push({
          dayOfWeek: d,
          startHour: document.getElementById(`start-day-${d}`).value,
          endHour: document.getElementById(`end-day-${d}`).value,
        });
      }
    });

    const { ok, data } = await apiRequest(`/api/dentists/${dentistId}/availability`, {
      method: 'PUT',
      body: { shifts },
    });

    if (ok) {
      showToast('Dentist availability updated.');
      close();
      if (typeof onDone === 'function') await onDone();
    } else {
      showToast((data && data.message) || 'Failed to save schedule.', 'error');
    }
  });
}

