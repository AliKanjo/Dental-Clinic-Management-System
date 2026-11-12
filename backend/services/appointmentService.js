const db = require('../db');
const { config } = require('../config/env');
const { AppError } = require('../middleware/errorHandler');

// Shift hours are stored as clinic wall-clock time, so the appointment
// instant must be converted to the clinic's time zone before comparing.
const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function toClinicDayAndTime(value, timeZone = config.clinicTimezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const part = (type) => parts.find((p) => p.type === type).value;
  return {
    dayOfWeek: WEEKDAYS[part('weekday')],
    time: `${part('hour')}:${part('minute')}`,
  };
}

async function checkDentistAvailability(dentistId, startTime) {
  const { dayOfWeek, time: apptTimeStr } = toClinicDayAndTime(startTime);
  const hasAnyAvail = await db.get(
    'SELECT id FROM dentist_availability WHERE dentist_id = ?',
    [dentistId]
  );

  if (!hasAnyAvail) return;

  const avail = await db.query(
    'SELECT * FROM dentist_availability WHERE dentist_id = ? AND day_of_week = ?',
    [dentistId, dayOfWeek]
  );

  if (!avail || avail.length === 0) {
    throw new AppError(400, 'The dentist is off-duty on this day.');
  }

  const match = avail.find((s) => apptTimeStr >= s.start_hour && apptTimeStr < s.end_hour);
  if (!match) {
    throw new AppError(400, 'The dentist is not scheduled to work during this time slot.');
  }
}

async function listAppointments(user) {
  if (user.role === 'patient') {
    return db.query(
      `SELECT a.*, u.first_name AS dentist_first, u.last_name AS dentist_last
       FROM appointments a
       JOIN dentists d ON a.dentist_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE a.patient_id = ?
       ORDER BY a.start_time ASC`,
      [user.relatedId]
    );
  }

  return db.query(
    `SELECT a.*, p.first_name AS patient_first, p.last_name AS patient_last, p.phone AS patient_phone,
            u.first_name AS dentist_first, u.last_name AS dentist_last, d.color_code
     FROM appointments a
     JOIN patients p ON a.patient_id = p.id
     JOIN dentists d ON a.dentist_id = d.id
     JOIN users u ON d.user_id = u.id
     ORDER BY a.start_time ASC`
  );
}

async function createAppointment({ user, data }) {
  const finalPatientId = user.role === 'patient' ? user.relatedId : data.patientId;
  if (!finalPatientId) {
    throw new AppError(400, 'Patient ID is required.');
  }

  const dentist = await db.get('SELECT id FROM dentists WHERE id = ?', [data.dentistId]);
  if (!dentist) {
    throw new AppError(404, 'Dentist not found.');
  }

  const patient = await db.get('SELECT id FROM patients WHERE id = ?', [finalPatientId]);
  if (!patient) {
    throw new AppError(404, 'Patient not found.');
  }

  await checkDentistAvailability(data.dentistId, data.startTime);

  const startSql = db.toSqlDateTime(data.startTime);
  const endSql = db.toSqlDateTime(data.endTime);

  const conflict = await db.get(
    `SELECT id FROM appointments
     WHERE dentist_id = ? AND status = 'scheduled'
       AND start_time < ? AND end_time > ?`,
    [data.dentistId, endSql, startSql]
  );

  if (conflict) {
    throw new AppError(409, 'The dentist has a scheduling conflict at this time.');
  }

  const initialStatus = user.role === 'patient' ? 'pending' : 'scheduled';
  const result = await db.run(
    `INSERT INTO appointments (patient_id, dentist_id, start_time, end_time, status, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [finalPatientId, data.dentistId, startSql, endSql, initialStatus, data.notes || null]
  );

  return { id: result.id, message: 'Appointment booked successfully.' };
}

async function updateAppointment({ user, appointmentId, data }) {
  const appt = await db.get('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
  if (!appt) {
    throw new AppError(404, 'Appointment not found.');
  }

  if (user.role === 'patient') {
    if (Number(user.relatedId) !== Number(appt.patient_id)) {
      throw new AppError(403, 'Access denied.');
    }
    if (data.status !== 'cancelled') {
      throw new AppError(400, 'Patients can only cancel appointments.');
    }
    await db.run("UPDATE appointments SET status = 'cancelled' WHERE id = ?", [appointmentId]);
    return { message: 'Appointment updated successfully.' };
  }

  if (data.startTime && data.endTime) {
    await checkDentistAvailability(appt.dentist_id, data.startTime);

    const startSql = db.toSqlDateTime(data.startTime);
    const endSql = db.toSqlDateTime(data.endTime);

    const conflict = await db.get(
      `SELECT id FROM appointments
       WHERE dentist_id = ? AND status = 'scheduled' AND id != ?
         AND start_time < ? AND end_time > ?`,
      [appt.dentist_id, appointmentId, endSql, startSql]
    );

    if (conflict) {
      throw new AppError(409, 'The dentist has a scheduling conflict at this time.');
    }

    await db.run(
      `UPDATE appointments SET start_time = ?, end_time = ?, status = ?, notes = ? WHERE id = ?`,
      [startSql, endSql, data.status || appt.status, data.notes ?? appt.notes, appointmentId]
    );
  } else {
    await db.run(
      `UPDATE appointments SET status = ?, notes = ? WHERE id = ?`,
      [data.status || appt.status, data.notes ?? appt.notes, appointmentId]
    );
  }

  return { message: 'Appointment updated successfully.' };
}

module.exports = {
  toClinicDayAndTime,
  listAppointments,
  createAppointment,
  updateAppointment,
};

