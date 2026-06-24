const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

// Setup Middleware
app.use(cors());
app.use(express.json());

// Open SQLite Database on Disk
const dbPath = path.join(__dirname, 'clinic.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
console.log(`Connected to clinic database at: ${dbPath}`);

// -------------------------------------------------------
// AUTO-SEED SAFETY NET
// If the DB has no patients (e.g. fresh Render disk), run seed automatically
// -------------------------------------------------------
try {
  const patientTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='PATIENT'").get();
  const patientCount = patientTable
    ? db.prepare('SELECT COUNT(*) as n FROM PATIENT').get().n
    : 0;

  if (patientCount === 0) {
    console.log('Database is empty — running seed.js automatically...');
    const { execFileSync } = require('child_process');
    execFileSync('node', [path.join(__dirname, 'seed.js')], { stdio: 'inherit' });
    console.log('Seed complete. Reopening database...');
  }
} catch (seedErr) {
  console.error('Auto-seed failed (non-fatal):', seedErr.message);
}


// Self-healing schema migration to support 'Checked In' appointment status constraint
const apptSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='APPOINTMENT'").get();
if (apptSchema && !apptSchema.sql.includes("'Checked In'")) {
  console.log("Migrating APPOINTMENT table check constraint to support 'Checked In' status...");
  db.pragma('foreign_keys = OFF');
  try {
    db.transaction(() => {
      db.prepare(`ALTER TABLE APPOINTMENT RENAME TO APPOINTMENT_old`).run();
      db.prepare(`
        CREATE TABLE APPOINTMENT (
            APPOINTMENT_ID   INTEGER PRIMARY KEY,
            FK_PATIENT_ID    INTEGER NOT NULL,
            FK_PROVIDER_ID   INTEGER NOT NULL,
            FK_LOCATION_ID   INTEGER NOT NULL,
            SCHEDULED_START  TEXT    NOT NULL,
            SCHEDULED_END    TEXT    NOT NULL,
            STATUS           TEXT    NOT NULL DEFAULT 'Scheduled'
                             CHECK (STATUS IN ('Scheduled','Checked In','Completed','Cancelled','No-Show')),
            REASON           TEXT,
            FOREIGN KEY (FK_PATIENT_ID)  REFERENCES PATIENT  (PATIENT_ID),
            FOREIGN KEY (FK_PROVIDER_ID) REFERENCES PROVIDER (PROVIDER_ID),
            FOREIGN KEY (FK_LOCATION_ID) REFERENCES LOCATION (LOCATION_ID)
        )
      `).run();
      db.prepare(`INSERT INTO APPOINTMENT SELECT * FROM APPOINTMENT_old`).run();
      db.prepare(`DROP TABLE APPOINTMENT_old`).run();
    })();
    console.log("APPOINTMENT table status constraint migration completed successfully.");
  } catch (err) {
    console.error("APPOINTMENT check constraint migration failed:", err);
  }
  db.pragma('foreign_keys = ON');
}

// Helper to format Date Objects to SQLite strings
function formatSqlDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatSqlDateTime(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

// Error Handling Wrapper Middleware
const safeRoute = (fn) => (req, res) => {
  try {
    fn(req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
};

// ----------------------------------------------------
// DASHBOARD ENDPOINTS
// ----------------------------------------------------

app.get('/api/dashboard/kpis', safeRoute((req, res) => {
  const totalPatients = db.prepare('SELECT COUNT(*) AS n FROM PATIENT').get().n;
  const scheduledAppointments = db.prepare("SELECT COUNT(*) AS n FROM APPOINTMENT WHERE STATUS='Scheduled'").get().n;
  const totalBilled = db.prepare('SELECT SUM(TOTAL_AMOUNT) AS n FROM INVOICE').get().n || 0;
  const outstandingAR = db.prepare("SELECT SUM(TOTAL_AMOUNT-AMOUNT_PAID) AS n FROM INVOICE WHERE STATUS IN ('Open','Partial')").get().n || 0;

  res.json({
    totalPatients,
    scheduledAppointments,
    totalBilled: parseFloat(totalBilled.toFixed(2)),
    outstandingAR: parseFloat(outstandingAR.toFixed(2))
  });
}));

app.get('/api/dashboard/revenue-by-provider', safeRoute((req, res) => {
  const rows = db.prepare(`
    SELECT pr.LAST_NAME AS provider, 
           ROUND(SUM(i.TOTAL_AMOUNT), 2) AS billed, 
           ROUND(SUM(i.AMOUNT_PAID), 2) AS collected 
    FROM PROVIDER pr 
    JOIN APPOINTMENT a ON a.FK_PROVIDER_ID=pr.PROVIDER_ID 
    JOIN ENCOUNTER e ON e.FK_APPOINTMENT_ID=a.APPOINTMENT_ID 
    JOIN INVOICE i ON i.FK_ENCOUNTER_ID=e.ENCOUNTER_ID 
    GROUP BY pr.PROVIDER_ID 
    ORDER BY billed DESC 
    LIMIT 10
  `).all();
  res.json(rows);
}));

app.get('/api/dashboard/appointment-status', safeRoute((req, res) => {
  const rows = db.prepare(`
    SELECT STATUS as status, COUNT(*) AS count 
    FROM APPOINTMENT 
    GROUP BY STATUS
  `).all();
  res.json(rows);
}));

app.get('/api/dashboard/monthly-revenue', safeRoute((req, res) => {
  const rows = db.prepare(`
    SELECT substr(INVOICE_DATE, 1, 7) AS month, 
           ROUND(SUM(TOTAL_AMOUNT), 2) AS billed, 
           ROUND(SUM(AMOUNT_PAID), 2) AS collected 
    FROM INVOICE 
    GROUP BY month 
    ORDER BY month DESC 
    LIMIT 12
  `).all();
  res.json(rows.reverse()); // Chronological ascending order
}));

// ----------------------------------------------------
// PATIENT ENDPOINTS
// ----------------------------------------------------

app.get('/api/patients', safeRoute((req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  const search = req.query.search || '';
  const date_from = req.query.date_from || '';
  const date_to = req.query.date_to || '';
  const scope = req.query.scope || 'all';
  const isCsv = req.query.export === 'csv';
  const offset = (page - 1) * limit;

  let query = `
    SELECT p.*, pa.IS_ACTIVE as portal_active 
    FROM PATIENT p 
    LEFT JOIN PORTAL_ACCOUNT pa ON pa.FK_PATIENT_ID = p.PATIENT_ID
  `;
  let countQuery = `
    SELECT COUNT(*) as count 
    FROM PATIENT p
    LEFT JOIN PORTAL_ACCOUNT pa ON pa.FK_PATIENT_ID = p.PATIENT_ID
  `;

  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(p.FIRST_NAME LIKE ? OR p.LAST_NAME LIKE ? OR p.MRN LIKE ? OR p.EMAIL LIKE ? OR p.PHONE LIKE ?)');
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
  }

  if (date_from) {
    conditions.push('p.DATE_OF_BIRTH >= ?');
    params.push(date_from);
  }
  if (date_to) {
    conditions.push('p.DATE_OF_BIRTH <= ?');
    params.push(date_to);
  }

  if (conditions.length > 0) {
    const where = ' WHERE ' + conditions.join(' AND ');
    query += where;
    countQuery += where;
  }

  query += ` ORDER BY p.LAST_NAME ASC, p.FIRST_NAME ASC`;

  const total = db.prepare(countQuery).get(...params).count;

  let rows;
  if (isCsv && scope === 'all') {
    rows = db.prepare(query).all(...params);
  } else {
    query += ` LIMIT ? OFFSET ?`;
    rows = db.prepare(query).all(...params, limit, offset);
  }

  const mappedRows = rows.map(r => {
    const portal_status = r.portal_active === 1 
      ? 'Active' 
      : r.portal_active === 0 
        ? 'Inactive' 
        : 'No Account';

    let age = null;
    if (r.DATE_OF_BIRTH) {
      const birthDate = new Date(r.DATE_OF_BIRTH);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    return {
      ...r,
      age,
      portal_status
    };
  });

  if (isCsv) {
    const PATIENT_COLUMNS = {
      MRN: { header: 'MRN', val: r => r.MRN },
      FIRST_NAME: { header: 'First Name', val: r => r.FIRST_NAME },
      LAST_NAME: { header: 'Last Name', val: r => r.LAST_NAME },
      DATE_OF_BIRTH: { header: 'DOB', val: r => r.DATE_OF_BIRTH },
      SEX: { header: 'Sex', val: r => r.SEX || 'O' },
      PHONE: { header: 'Phone', val: r => r.PHONE || '' },
      EMAIL: { header: 'Email', val: r => r.EMAIL || '' },
      portal_status: { header: 'Portal Status', val: r => r.portal_status }
    };

    const requestedKeys = req.query.columns ? req.query.columns.split(',') : Object.keys(PATIENT_COLUMNS);
    const headers = requestedKeys.map(k => PATIENT_COLUMNS[k]?.header || k);
    const csvRows = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',')];

    for (const row of mappedRows) {
      const vals = requestedKeys.map(k => {
        const v = PATIENT_COLUMNS[k] ? PATIENT_COLUMNS[k].val(row) : row[k];
        return `"${String(v ?? '').replace(/"/g, '""')}"`;
      });
      csvRows.push(vals.join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="patients_export.csv"');
    return res.status(200).send(csvRows.join('\n'));
  }

  res.json({ rows: mappedRows, total, page, limit });
}));

app.get('/api/patients/:id', safeRoute((req, res) => {
  const patient = db.prepare(`
    SELECT p.*, pa.USERNAME, pa.IS_ACTIVE as PORTAL_ACTIVE, pa.LAST_LOGIN 
    FROM PATIENT p 
    LEFT JOIN PORTAL_ACCOUNT pa ON pa.FK_PATIENT_ID = p.PATIENT_ID 
    WHERE p.PATIENT_ID = ?
  `).get(req.params.id);

  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  let age = null;
  if (patient.DATE_OF_BIRTH) {
    const birthDate = new Date(patient.DATE_OF_BIRTH);
    const today = new Date();
    age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  }

  patient.age = age;
  patient.portal_status = patient.PORTAL_ACTIVE === 1 
    ? 'Active' 
    : patient.PORTAL_ACTIVE === 0 
      ? 'Inactive' 
      : 'No Account';

  res.json(patient);
}));

app.get('/api/patients/:id/appointments', safeRoute((req, res) => {
  const rows = db.prepare(`
    SELECT a.*, 
           pr.FIRST_NAME||' '||pr.LAST_NAME AS provider_name, 
           pr.SPECIALTY, 
           l.LOCATION_NAME AS location_name 
    FROM APPOINTMENT a 
    JOIN PROVIDER pr ON pr.PROVIDER_ID = a.FK_PROVIDER_ID 
    JOIN LOCATION l ON l.LOCATION_ID = a.FK_LOCATION_ID 
    WHERE a.FK_PATIENT_ID = ? 
    ORDER BY a.SCHEDULED_START DESC
  `).all(req.params.id);
  res.json(rows);
}));

app.get('/api/patients/:id/encounters', safeRoute((req, res) => {
  const rows = db.prepare(`
    SELECT e.*, 
           pr.LAST_NAME AS provider_name, 
           d.ICD10_CODE||' - '||d.DESCRIPTION AS primary_dx 
    FROM ENCOUNTER e 
    JOIN APPOINTMENT a ON a.APPOINTMENT_ID = e.FK_APPOINTMENT_ID 
    JOIN PROVIDER pr ON pr.PROVIDER_ID = a.FK_PROVIDER_ID 
    LEFT JOIN ENCOUNTER_DIAGNOSIS ed ON ed.FK_ENCOUNTER_ID = e.ENCOUNTER_ID AND ed.IS_PRIMARY = 1 
    LEFT JOIN DIAGNOSIS d ON d.DIAGNOSIS_ID = ed.FK_DIAGNOSIS_ID 
    WHERE a.FK_PATIENT_ID = ? 
    ORDER BY e.ENCOUNTER_DATE DESC
  `).all(req.params.id);
  res.json(rows);
}));

app.get('/api/patients/:id/invoices', safeRoute((req, res) => {
  const rows = db.prepare(`
    SELECT i.*, 
           ROUND(i.TOTAL_AMOUNT - i.AMOUNT_PAID, 2) AS balance_due 
    FROM INVOICE i 
    JOIN ENCOUNTER e ON e.ENCOUNTER_ID = i.FK_ENCOUNTER_ID 
    JOIN APPOINTMENT a ON a.APPOINTMENT_ID = e.FK_APPOINTMENT_ID 
    WHERE a.FK_PATIENT_ID = ? 
    ORDER BY i.INVOICE_DATE DESC
  `).all(req.params.id);
  res.json(rows);
}));

app.post('/api/patients', safeRoute((req, res) => {
  const { first_name, last_name, date_of_birth, sex, phone, email, address_line, city, state, zip } = req.body;

  if (!first_name || !last_name || !date_of_birth) {
    return res.status(400).json({ error: 'First name, last name, and date of birth are required.' });
  }

  // Generate unique MRN
  const maxRow = db.prepare('SELECT MAX(PATIENT_ID) as max_id FROM PATIENT').get();
  const nextId = (maxRow.max_id || 0) + 1;
  const mrn = 'MRN' + String(nextId).padStart(6, '0');

  const result = db.prepare(`
    INSERT INTO PATIENT (MRN, FIRST_NAME, LAST_NAME, DATE_OF_BIRTH, SEX, PHONE, EMAIL, ADDRESS_LINE, CITY, STATE, ZIP)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(mrn, first_name, last_name, date_of_birth, sex || null, phone || null, email || null, address_line || null, city || null, state || null, zip || null);

  const newPatient = db.prepare('SELECT * FROM PATIENT WHERE PATIENT_ID = ?').get(result.lastInsertRowid);
  res.status(201).json(newPatient);
}));

app.put('/api/patients/:id', safeRoute((req, res) => {
  const { first_name, last_name, date_of_birth, sex, phone, email, address_line, city, state, zip } = req.body;

  db.prepare(`
    UPDATE PATIENT 
    SET FIRST_NAME = ?, LAST_NAME = ?, DATE_OF_BIRTH = ?, SEX = ?, PHONE = ?, EMAIL = ?, ADDRESS_LINE = ?, CITY = ?, STATE = ?, ZIP = ?
    WHERE PATIENT_ID = ?
  `).run(first_name, last_name, date_of_birth, sex, phone, email, address_line, city, state, zip, req.params.id);

  const updatedPatient = db.prepare('SELECT * FROM PATIENT WHERE PATIENT_ID = ?').get(req.params.id);
  if (!updatedPatient) return res.status(404).json({ error: 'Patient not found' });
  res.json(updatedPatient);
}));

app.delete('/api/patients/:id', safeRoute((req, res) => {
  const apptsCount = db.prepare('SELECT COUNT(*) as c FROM APPOINTMENT WHERE FK_PATIENT_ID = ?').get(req.params.id).c;
  if (apptsCount > 0) {
    return res.status(400).json({ error: 'Cannot delete patient with existing appointment records.' });
  }

  db.prepare('DELETE FROM PORTAL_ACCOUNT WHERE FK_PATIENT_ID = ?').run(req.params.id);
  const result = db.prepare('DELETE FROM PATIENT WHERE PATIENT_ID = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Patient not found' });
  res.json({ message: 'Patient deleted successfully.' });
}));

// ----------------------------------------------------
// PROVIDER ENDPOINTS
// ----------------------------------------------------

app.get('/api/providers', safeRoute((req, res) => {
  const rows = db.prepare(`
    SELECT pr.*, 
           COUNT(DISTINCT e.ENCOUNTER_ID) AS signed_visits, 
           ROUND(COALESCE(SUM(i.TOTAL_AMOUNT), 0), 2) AS gross_billed, 
           ROUND(COALESCE(SUM(i.AMOUNT_PAID), 0), 2) AS collected 
    FROM PROVIDER pr 
    LEFT JOIN APPOINTMENT a ON a.FK_PROVIDER_ID = pr.PROVIDER_ID 
    LEFT JOIN ENCOUNTER e ON e.FK_APPOINTMENT_ID = a.APPOINTMENT_ID AND e.STATUS = 'Signed' 
    LEFT JOIN INVOICE i ON i.FK_ENCOUNTER_ID = e.ENCOUNTER_ID 
    GROUP BY pr.PROVIDER_ID 
    ORDER BY gross_billed DESC
  `).all();

  const mappedRows = rows.map(r => {
    const gross = parseFloat(r.gross_billed || 0);
    const collected = parseFloat(r.collected || 0);
    const collection_rate = gross > 0 ? ((collected / gross) * 100).toFixed(1) : '0.0';
    return {
      ...r,
      collection_rate
    };
  });
  res.json(mappedRows);
}));

app.get('/api/providers/:id', safeRoute((req, res) => {
  const provider = db.prepare('SELECT * FROM PROVIDER WHERE PROVIDER_ID = ?').get(req.params.id);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });
  res.json(provider);
}));

app.post('/api/providers', safeRoute((req, res) => {
  const { npi, first_name, last_name, specialty, phone, email } = req.body;
  const result = db.prepare(`
    INSERT INTO PROVIDER (NPI, FIRST_NAME, LAST_NAME, SPECIALTY, PHONE, EMAIL)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(npi, first_name, last_name, specialty, phone || null, email || null);
  const newProvider = db.prepare('SELECT * FROM PROVIDER WHERE PROVIDER_ID = ?').get(result.lastInsertRowid);
  res.status(201).json(newProvider);
}));

app.put('/api/providers/:id', safeRoute((req, res) => {
  const { npi, first_name, last_name, specialty, phone, email } = req.body;
  db.prepare(`
    UPDATE PROVIDER 
    SET NPI = ?, FIRST_NAME = ?, LAST_NAME = ?, SPECIALTY = ?, PHONE = ?, EMAIL = ?
    WHERE PROVIDER_ID = ?
  `).run(npi, first_name, last_name, specialty, phone, email, req.params.id);
  const updated = db.prepare('SELECT * FROM PROVIDER WHERE PROVIDER_ID = ?').get(req.params.id);
  if (!updated) return res.status(404).json({ error: 'Provider not found' });
  res.json(updated);
}));

// ----------------------------------------------------
// LOCATION ENDPOINTS
// ----------------------------------------------------

app.get('/api/locations', safeRoute((req, res) => {
  const rows = db.prepare('SELECT * FROM LOCATION').all();
  res.json(rows);
}));

app.post('/api/locations', safeRoute((req, res) => {
  const { location_name, address_line, city, state, zip, phone } = req.body;
  const result = db.prepare(`
    INSERT INTO LOCATION (LOCATION_NAME, ADDRESS_LINE, CITY, STATE, ZIP, PHONE)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(location_name, address_line || null, city || null, state || null, zip || null, phone || null);
  const newLoc = db.prepare('SELECT * FROM LOCATION WHERE LOCATION_ID = ?').get(result.lastInsertRowid);
  res.status(201).json(newLoc);
}));

app.put('/api/locations/:id', safeRoute((req, res) => {
  const { location_name, address_line, city, state, zip, phone } = req.body;
  db.prepare(`
    UPDATE LOCATION 
    SET LOCATION_NAME = ?, ADDRESS_LINE = ?, CITY = ?, STATE = ?, ZIP = ?, PHONE = ?
    WHERE LOCATION_ID = ?
  `).run(location_name, address_line, city, state, zip, phone, req.params.id);
  const updated = db.prepare('SELECT * FROM LOCATION WHERE LOCATION_ID = ?').get(req.params.id);
  if (!updated) return res.status(404).json({ error: 'Location not found' });
  res.json(updated);
}));

// ----------------------------------------------------
// APPOINTMENT ENDPOINTS
// ----------------------------------------------------

app.get('/api/appointments', safeRoute((req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  const status = req.query.status || '';
  const search = req.query.search || '';
  const date = req.query.date || '';
  const date_from = req.query.date_from || '';
  const date_to = req.query.date_to || '';
  const scope = req.query.scope || 'all';
  const isCsv = req.query.export === 'csv';
  const offset = (page - 1) * limit;

  let query = `
    SELECT a.*, 
           p.FIRST_NAME||' '||p.LAST_NAME AS patient_name, 
           pr.FIRST_NAME||' '||pr.LAST_NAME AS provider_name, 
           pr.SPECIALTY, 
           l.LOCATION_NAME AS location_name 
    FROM APPOINTMENT a 
    JOIN PATIENT p ON p.PATIENT_ID = a.FK_PATIENT_ID 
    JOIN PROVIDER pr ON pr.PROVIDER_ID = a.FK_PROVIDER_ID 
    JOIN LOCATION l ON l.LOCATION_ID = a.FK_LOCATION_ID
  `;
  let countQuery = `
    SELECT COUNT(*) as count 
    FROM APPOINTMENT a 
    JOIN PATIENT p ON p.PATIENT_ID = a.FK_PATIENT_ID 
    JOIN PROVIDER pr ON pr.PROVIDER_ID = a.FK_PROVIDER_ID 
    JOIN LOCATION l ON l.LOCATION_ID = a.FK_LOCATION_ID
  `;

  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('a.STATUS = ?');
    params.push(status);
  }

  if (date) {
    conditions.push('substr(a.SCHEDULED_START, 1, 10) = ?');
    params.push(date);
  }

  if (date_from) {
    conditions.push('substr(a.SCHEDULED_START, 1, 10) >= ?');
    params.push(date_from);
  }
  if (date_to) {
    conditions.push('substr(a.SCHEDULED_START, 1, 10) <= ?');
    params.push(date_to);
  }

  if (search) {
    conditions.push('(p.FIRST_NAME LIKE ? OR p.LAST_NAME LIKE ? OR pr.FIRST_NAME LIKE ? OR pr.LAST_NAME LIKE ?)');
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  if (conditions.length > 0) {
    const where = ' WHERE ' + conditions.join(' AND ');
    query += where;
    countQuery += where;
  }

  query += ' ORDER BY a.SCHEDULED_START DESC';

  const total = db.prepare(countQuery).get(...params).count;

  let rows;
  if (isCsv && scope === 'all') {
    rows = db.prepare(query).all(...params);
  } else {
    query += ' LIMIT ? OFFSET ?';
    rows = db.prepare(query).all(...params, limit, offset);
  }

  if (isCsv) {
    const APPOINTMENT_COLUMNS = {
      patient_name: { header: 'Patient', val: r => r.patient_name },
      provider_name: { header: 'Provider', val: r => 'Dr. ' + r.provider_name },
      SPECIALTY: { header: 'Specialty', val: r => r.SPECIALTY },
      location_name: { header: 'Location', val: r => r.location_name },
      SCHEDULED_START: { header: 'Start Time', val: r => r.SCHEDULED_START },
      SCHEDULED_END: { header: 'End Time', val: r => r.SCHEDULED_END },
      STATUS: { header: 'Status', val: r => r.STATUS },
      REASON: { header: 'Reason', val: r => r.REASON || '' }
    };

    const requestedKeys = req.query.columns ? req.query.columns.split(',') : Object.keys(APPOINTMENT_COLUMNS);
    const headers = requestedKeys.map(k => APPOINTMENT_COLUMNS[k]?.header || k);
    const csvRows = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',')];

    for (const row of rows) {
      const vals = requestedKeys.map(k => {
        const v = APPOINTMENT_COLUMNS[k] ? APPOINTMENT_COLUMNS[k].val(row) : row[k];
        return `"${String(v ?? '').replace(/"/g, '""')}"`;
      });
      csvRows.push(vals.join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="appointments_export.csv"');
    return res.status(200).send(csvRows.join('\n'));
  }

  res.json({ rows, total, page, limit });
}));

app.get('/api/appointments/:id', safeRoute((req, res) => {
  const appt = db.prepare(`
    SELECT a.*, 
           p.FIRST_NAME||' '||p.LAST_NAME AS patient_name, 
           pr.FIRST_NAME||' '||pr.LAST_NAME AS provider_name, 
           l.LOCATION_NAME AS location_name 
    FROM APPOINTMENT a 
    JOIN PATIENT p ON p.PATIENT_ID = a.FK_PATIENT_ID 
    JOIN PROVIDER pr ON pr.PROVIDER_ID = a.FK_PROVIDER_ID 
    JOIN LOCATION l ON l.LOCATION_ID = a.FK_LOCATION_ID 
    WHERE a.APPOINTMENT_ID = ?
  `).get(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  res.json(appt);
}));

app.post('/api/appointments', safeRoute((req, res) => {
  const { patient_id, provider_id, location_id, scheduled_start, scheduled_end, reason } = req.body;
  const result = db.prepare(`
    INSERT INTO APPOINTMENT (FK_PATIENT_ID, FK_PROVIDER_ID, FK_LOCATION_ID, SCHEDULED_START, SCHEDULED_END, REASON)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(patient_id, provider_id, location_id, scheduled_start, scheduled_end, reason || null);
  const newAppt = db.prepare('SELECT * FROM APPOINTMENT WHERE APPOINTMENT_ID = ?').get(result.lastInsertRowid);
  res.status(201).json(newAppt);
}));

app.put('/api/appointments/:id', safeRoute((req, res) => {
  const { scheduled_start, scheduled_end, status, reason } = req.body;
  db.prepare(`
    UPDATE APPOINTMENT 
    SET SCHEDULED_START = COALESCE(?, SCHEDULED_START), 
        SCHEDULED_END = COALESCE(?, SCHEDULED_END), 
        STATUS = COALESCE(?, STATUS), 
        REASON = COALESCE(?, REASON)
    WHERE APPOINTMENT_ID = ?
  `).run(scheduled_start, scheduled_end, status, reason, req.params.id);
  const updated = db.prepare('SELECT * FROM APPOINTMENT WHERE APPOINTMENT_ID = ?').get(req.params.id);
  if (!updated) return res.status(404).json({ error: 'Appointment not found' });
  res.json(updated);
}));

app.delete('/api/appointments/:id', safeRoute((req, res) => {
  const encCount = db.prepare('SELECT COUNT(*) as c FROM ENCOUNTER WHERE FK_APPOINTMENT_ID = ?').get(req.params.id).c;
  if (encCount > 0) {
    return res.status(400).json({ error: 'Cannot delete appointment with associated encounter records.' });
  }
  const result = db.prepare('DELETE FROM APPOINTMENT WHERE APPOINTMENT_ID = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Appointment not found' });
  res.json({ message: 'Appointment deleted successfully.' });
}));

// ----------------------------------------------------
// ENCOUNTER ENDPOINTS
// ----------------------------------------------------

app.get('/api/encounters', safeRoute((req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  const search = req.query.search || '';
  const date_from = req.query.date_from || '';
  const date_to = req.query.date_to || '';
  const scope = req.query.scope || 'all';
  const isCsv = req.query.export === 'csv';
  const offset = (page - 1) * limit;

  let query = `
    SELECT e.*, 
           p.FIRST_NAME||' '||p.LAST_NAME AS patient_name, 
           pr.FIRST_NAME||' '||pr.LAST_NAME AS provider_name, 
           d.ICD10_CODE||' - '||d.DESCRIPTION AS primary_dx,
           i.TOTAL_AMOUNT AS invoice_total,
           i.STATUS AS billing
    FROM ENCOUNTER e 
    JOIN APPOINTMENT a ON a.APPOINTMENT_ID = e.FK_APPOINTMENT_ID 
    JOIN PATIENT p ON p.PATIENT_ID = a.FK_PATIENT_ID 
    JOIN PROVIDER pr ON pr.PROVIDER_ID = a.FK_PROVIDER_ID 
    LEFT JOIN ENCOUNTER_DIAGNOSIS ed ON ed.FK_ENCOUNTER_ID = e.ENCOUNTER_ID AND ed.IS_PRIMARY = 1 
    LEFT JOIN DIAGNOSIS d ON d.DIAGNOSIS_ID = ed.FK_DIAGNOSIS_ID
    LEFT JOIN INVOICE i ON i.FK_ENCOUNTER_ID = e.ENCOUNTER_ID
  `;
  let countQuery = `
    SELECT COUNT(*) as count 
    FROM ENCOUNTER e 
    JOIN APPOINTMENT a ON a.APPOINTMENT_ID = e.FK_APPOINTMENT_ID 
    JOIN PATIENT p ON p.PATIENT_ID = a.FK_PATIENT_ID 
    JOIN PROVIDER pr ON pr.PROVIDER_ID = a.FK_PROVIDER_ID
  `;

  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(p.FIRST_NAME LIKE ? OR p.LAST_NAME LIKE ? OR pr.FIRST_NAME LIKE ? OR pr.LAST_NAME LIKE ?)');
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  if (date_from) {
    conditions.push('e.ENCOUNTER_DATE >= ?');
    params.push(date_from);
  }
  if (date_to) {
    conditions.push('e.ENCOUNTER_DATE <= ?');
    params.push(date_to);
  }

  if (conditions.length > 0) {
    const where = ' WHERE ' + conditions.join(' AND ');
    query += where;
    countQuery += where;
  }

  query += ' ORDER BY e.ENCOUNTER_DATE DESC';

  const total = db.prepare(countQuery).get(...params).count;

  let rows;
  if (isCsv && scope === 'all') {
    rows = db.prepare(query).all(...params);
  } else {
    query += ' LIMIT ? OFFSET ?';
    rows = db.prepare(query).all(...params, limit, offset);
  }

  if (isCsv) {
    const ENCOUNTER_COLUMNS = {
      patient_name: { header: 'Patient', val: r => r.patient_name },
      ENCOUNTER_DATE: { header: 'Visit Date', val: r => r.ENCOUNTER_DATE },
      provider_name: { header: 'Provider', val: r => 'Dr. ' + r.provider_name },
      primary_dx: { header: 'Primary Diagnosis', val: r => r.primary_dx || 'N/A' },
      invoice_total: { header: 'Invoice Total', val: r => r.invoice_total !== null && r.invoice_total !== undefined ? `$${r.invoice_total.toFixed(2)}` : '$0.00' },
      billing: { header: 'Billing Status', val: r => r.billing || 'Unbilled' }
    };

    const requestedKeys = req.query.columns ? req.query.columns.split(',') : Object.keys(ENCOUNTER_COLUMNS);
    const headers = requestedKeys.map(k => ENCOUNTER_COLUMNS[k]?.header || k);
    const csvRows = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',')];

    for (const row of rows) {
      const vals = requestedKeys.map(k => {
        const v = ENCOUNTER_COLUMNS[k] ? ENCOUNTER_COLUMNS[k].val(row) : row[k];
        return `"${String(v ?? '').replace(/"/g, '""')}"`;
      });
      csvRows.push(vals.join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="encounters_export.csv"');
    return res.status(200).send(csvRows.join('\n'));
  }

  res.json({ rows, total, page, limit });
}));

app.get('/api/encounters/:id', safeRoute((req, res) => {
  const encounter = db.prepare(`
    SELECT e.*, 
           p.PATIENT_ID, p.FIRST_NAME||' '||p.LAST_NAME AS patient_name, p.MRN, p.DATE_OF_BIRTH, p.SEX,
           pr.PROVIDER_ID, pr.FIRST_NAME||' '||pr.LAST_NAME AS provider_name, pr.SPECIALTY 
    FROM ENCOUNTER e 
    JOIN APPOINTMENT a ON a.APPOINTMENT_ID = e.FK_APPOINTMENT_ID 
    JOIN PATIENT p ON p.PATIENT_ID = a.FK_PATIENT_ID 
    JOIN PROVIDER pr ON pr.PROVIDER_ID = a.FK_PROVIDER_ID 
    WHERE e.ENCOUNTER_ID = ?
  `).get(req.params.id);

  if (!encounter) return res.status(404).json({ error: 'Encounter not found' });

  const diagnoses = db.prepare(`
    SELECT ed.*, d.ICD10_CODE, d.DESCRIPTION, d.CATEGORY 
    FROM ENCOUNTER_DIAGNOSIS ed 
    JOIN DIAGNOSIS d ON d.DIAGNOSIS_ID = ed.FK_DIAGNOSIS_ID 
    WHERE ed.FK_ENCOUNTER_ID = ?
  `).all(req.params.id);

  res.json({ ...encounter, diagnoses });
}));

app.post('/api/encounters', safeRoute((req, res) => {
  const { appointment_id, chief_complaint, visit_note } = req.body;

  const appt = db.prepare('SELECT SCHEDULED_START FROM APPOINTMENT WHERE APPOINTMENT_ID = ?').get(appointment_id);
  if (!appt) return res.status(400).json({ error: 'Valid appointment_id required.' });

  const dateStr = appt.SCHEDULED_START.substring(0, 10); // YYYY-MM-DD

  const result = db.prepare(`
    INSERT INTO ENCOUNTER (FK_APPOINTMENT_ID, ENCOUNTER_DATE, CHIEF_COMPLAINT, VISIT_NOTE, STATUS)
    VALUES (?, ?, ?, ?, 'Open')
  `).run(appointment_id, dateStr, chief_complaint || null, visit_note || null);

  const newEnc = db.prepare('SELECT * FROM ENCOUNTER WHERE ENCOUNTER_ID = ?').get(result.lastInsertRowid);
  res.status(201).json(newEnc);
}));

app.put('/api/encounters/:id', safeRoute((req, res) => {
  const { chief_complaint, visit_note, status } = req.body;

  let query = `
    UPDATE ENCOUNTER 
    SET CHIEF_COMPLAINT = COALESCE(?, CHIEF_COMPLAINT), 
        VISIT_NOTE = COALESCE(?, VISIT_NOTE)
  `;
  const params = [chief_complaint, visit_note];

  if (status === 'Signed') {
    query += `, STATUS = 'Signed', SIGNED_AT = ?`;
    params.push(formatSqlDateTime(new Date()));
  }

  query += ` WHERE ENCOUNTER_ID = ?`;
  params.push(req.params.id);

  const result = db.prepare(query).run(...params);
  if (result.changes === 0) return res.status(404).json({ error: 'Encounter not found' });

  const updated = db.prepare('SELECT * FROM ENCOUNTER WHERE ENCOUNTER_ID = ?').get(req.params.id);
  res.json(updated);
}));

app.post('/api/encounters/:id/diagnoses', safeRoute((req, res) => {
  const { diagnosis_id, is_primary } = req.body;
  const encounterId = req.params.id;

  const runTx = db.transaction(() => {
    if (is_primary === 1) {
      // Clear previous primary flag for this encounter
      db.prepare('UPDATE ENCOUNTER_DIAGNOSIS SET IS_PRIMARY = 0 WHERE FK_ENCOUNTER_ID = ?').run(encounterId);
    }

    const notedDate = formatSqlDate(new Date());

    db.prepare(`
      INSERT INTO ENCOUNTER_DIAGNOSIS (FK_ENCOUNTER_ID, FK_DIAGNOSIS_ID, IS_PRIMARY, NOTED_DATE)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(FK_ENCOUNTER_ID, FK_DIAGNOSIS_ID) DO UPDATE SET IS_PRIMARY = excluded.IS_PRIMARY
    `).run(encounterId, diagnosis_id, is_primary || 0, notedDate);
  });

  runTx();

  const diagnoses = db.prepare(`
    SELECT ed.*, d.ICD10_CODE, d.DESCRIPTION, d.CATEGORY 
    FROM ENCOUNTER_DIAGNOSIS ed 
    JOIN DIAGNOSIS d ON d.DIAGNOSIS_ID = ed.FK_DIAGNOSIS_ID 
    WHERE ed.FK_ENCOUNTER_ID = ?
  `).all(encounterId);

  res.json(diagnoses);
}));

app.delete('/api/encounters/:id/diagnoses/:edId', safeRoute((req, res) => {
  const result = db.prepare('DELETE FROM ENCOUNTER_DIAGNOSIS WHERE ENCOUNTER_DIAGNOSIS_ID = ? AND FK_ENCOUNTER_ID = ?').run(req.params.edId, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Diagnosis mapping not found' });
  res.json({ message: 'Diagnosis removed successfully' });
}));

// ----------------------------------------------------
// DIAGNOSIS ENDPOINTS
// ----------------------------------------------------

app.get('/api/diagnoses', safeRoute((req, res) => {
  const search = req.query.search || '';
  let rows;
  if (search) {
    rows = db.prepare('SELECT * FROM DIAGNOSIS WHERE ICD10_CODE LIKE ? OR DESCRIPTION LIKE ? LIMIT 100').all(`%${search}%`, `%${search}%`);
  } else {
    rows = db.prepare('SELECT * FROM DIAGNOSIS LIMIT 100').all();
  }
  res.json(rows);
}));

app.get('/api/diagnoses/top', safeRoute((req, res) => {
  const rows = db.prepare(`
    SELECT d.ICD10_CODE as icd10, 
           d.DESCRIPTION as description, 
           d.CATEGORY as category, 
           COUNT(*) AS times_recorded, 
           SUM(ed.IS_PRIMARY) AS times_primary 
    FROM ENCOUNTER_DIAGNOSIS ed 
    JOIN DIAGNOSIS d ON d.DIAGNOSIS_ID = ed.FK_DIAGNOSIS_ID 
    GROUP BY d.DIAGNOSIS_ID 
    ORDER BY times_recorded DESC
  `).all();
  res.json(rows);
}));

// ----------------------------------------------------
// BILLING & INVOICING ENDPOINTS
// ----------------------------------------------------

app.get('/api/invoices', safeRoute((req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  const status = req.query.status || '';
  const search = req.query.search || '';
  const date_from = req.query.date_from || '';
  const date_to = req.query.date_to || '';
  const scope = req.query.scope || 'all';
  const isCsv = req.query.export === 'csv';
  const offset = (page - 1) * limit;

  let query = `
    SELECT i.*, 
           p.FIRST_NAME||' '||p.LAST_NAME AS patient_name,
           ROUND(i.TOTAL_AMOUNT - i.AMOUNT_PAID, 2) AS balance_due
    FROM INVOICE i 
    JOIN ENCOUNTER e ON e.ENCOUNTER_ID = i.FK_ENCOUNTER_ID 
    JOIN APPOINTMENT a ON a.APPOINTMENT_ID = e.FK_APPOINTMENT_ID 
    JOIN PATIENT p ON p.PATIENT_ID = a.FK_PATIENT_ID
  `;
  let countQuery = `
    SELECT COUNT(*) as count 
    FROM INVOICE i 
    JOIN ENCOUNTER e ON e.ENCOUNTER_ID = i.FK_ENCOUNTER_ID 
    JOIN APPOINTMENT a ON a.APPOINTMENT_ID = e.FK_APPOINTMENT_ID 
    JOIN PATIENT p ON p.PATIENT_ID = a.FK_PATIENT_ID
  `;

  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('i.STATUS = ?');
    params.push(status);
  }

  if (search) {
    conditions.push('(p.FIRST_NAME LIKE ? OR p.LAST_NAME LIKE ? OR p.MRN LIKE ?)');
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  if (date_from) {
    conditions.push('i.INVOICE_DATE >= ?');
    params.push(date_from);
  }
  if (date_to) {
    conditions.push('i.INVOICE_DATE <= ?');
    params.push(date_to);
  }

  if (conditions.length > 0) {
    const where = ' WHERE ' + conditions.join(' AND ');
    query += where;
    countQuery += where;
  }

  query += ' ORDER BY balance_due DESC';

  const total = db.prepare(countQuery).get(...params).count;

  let rows;
  if (isCsv && scope === 'all') {
    rows = db.prepare(query).all(...params);
  } else {
    query += ' LIMIT ? OFFSET ?';
    rows = db.prepare(query).all(...params, limit, offset);
  }

  if (isCsv) {
    const INVOICE_COLUMNS = {
      INVOICE_ID: { header: 'Invoice ID', val: r => `INV-${r.INVOICE_ID}` },
      patient_name: { header: 'Patient Name', val: r => r.patient_name },
      INVOICE_DATE: { header: 'Invoice Date', val: r => r.INVOICE_DATE },
      TOTAL_AMOUNT: { header: 'Total Amount', val: r => r.TOTAL_AMOUNT.toFixed(2) },
      AMOUNT_PAID: { header: 'Amount Paid', val: r => r.AMOUNT_PAID.toFixed(2) },
      balance_due: { header: 'Balance Due', val: r => r.balance_due.toFixed(2) },
      STATUS: { header: 'Status', val: r => r.STATUS }
    };

    const requestedKeys = req.query.columns ? req.query.columns.split(',') : Object.keys(INVOICE_COLUMNS);
    const headers = requestedKeys.map(k => INVOICE_COLUMNS[k]?.header || k);
    const csvRows = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',')];

    for (const row of rows) {
      const vals = requestedKeys.map(k => {
        const v = INVOICE_COLUMNS[k] ? INVOICE_COLUMNS[k].val(row) : row[k];
        return `"${String(v ?? '').replace(/"/g, '""')}"`;
      });
      csvRows.push(vals.join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="invoices_export.csv"');
    return res.status(200).send(csvRows.join('\n'));
  }

  res.json({ rows, total, page, limit });
}));

app.get('/api/invoices/:id', safeRoute((req, res) => {
  const invoice = db.prepare(`
    SELECT i.*, 
           p.FIRST_NAME||' '||p.LAST_NAME AS patient_name, p.MRN,
           ROUND(i.TOTAL_AMOUNT - i.AMOUNT_PAID, 2) AS balance_due 
    FROM INVOICE i 
    JOIN ENCOUNTER e ON e.ENCOUNTER_ID = i.FK_ENCOUNTER_ID 
    JOIN APPOINTMENT a ON a.APPOINTMENT_ID = e.FK_APPOINTMENT_ID 
    JOIN PATIENT p ON p.PATIENT_ID = a.FK_PATIENT_ID 
    WHERE i.INVOICE_ID = ?
  `).get(req.params.id);

  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const payments = db.prepare('SELECT * FROM PAYMENT WHERE FK_INVOICE_ID = ? ORDER BY PAYMENT_DATE DESC').all(req.params.id);
  res.json({ ...invoice, payments });
}));

app.post('/api/invoices', safeRoute((req, res) => {
  const { encounter_id, total_amount } = req.body;

  const enc = db.prepare('SELECT * FROM ENCOUNTER WHERE ENCOUNTER_ID = ?').get(encounter_id);
  if (!enc) return res.status(400).json({ error: 'Valid encounter_id required.' });

  const invoiceDate = formatSqlDate(new Date());
  const result = db.prepare(`
    INSERT INTO INVOICE (FK_ENCOUNTER_ID, INVOICE_DATE, TOTAL_AMOUNT, AMOUNT_PAID, STATUS)
    VALUES (?, ?, ?, 0.00, 'Open')
  `).run(encounter_id, invoiceDate, total_amount);

  const newInvoice = db.prepare('SELECT * FROM INVOICE WHERE INVOICE_ID = ?').get(result.lastInsertRowid);
  res.status(201).json(newInvoice);
}));

app.put('/api/invoices/:id', safeRoute((req, res) => {
  const { total_amount } = req.body;

  const inv = db.prepare('SELECT AMOUNT_PAID FROM INVOICE WHERE INVOICE_ID = ?').get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  const amountPaid = inv.AMOUNT_PAID;
  let status = 'Open';
  if (amountPaid >= total_amount) {
    status = 'Paid';
  } else if (amountPaid > 0) {
    status = 'Partial';
  }

  db.prepare('UPDATE INVOICE SET TOTAL_AMOUNT = ?, STATUS = ? WHERE INVOICE_ID = ?').run(total_amount, status, req.params.id);
  const updated = db.prepare('SELECT * FROM INVOICE WHERE INVOICE_ID = ?').get(req.params.id);
  res.json(updated);
}));

app.post('/api/invoices/:id/payments', safeRoute((req, res) => {
  const { amount, method, payment_date } = req.body;
  const invoiceId = req.params.id;
  const payDate = payment_date || formatSqlDate(new Date());

  const runTx = db.transaction(() => {
    db.prepare('INSERT INTO PAYMENT (FK_INVOICE_ID, PAYMENT_DATE, AMOUNT, METHOD) VALUES (?, ?, ?, ?)').run(invoiceId, payDate, amount, method);

    const sumRow = db.prepare('SELECT SUM(AMOUNT) as total_paid FROM PAYMENT WHERE FK_INVOICE_ID = ?').get(invoiceId);
    const totalPaid = sumRow.total_paid || 0;

    const invoiceRow = db.prepare('SELECT TOTAL_AMOUNT FROM INVOICE WHERE INVOICE_ID = ?').get(invoiceId);
    if (!invoiceRow) throw new Error('Invoice not found');

    const totalAmount = invoiceRow.TOTAL_AMOUNT;
    let invoiceStatus = 'Open';

    if (totalPaid >= totalAmount) {
      invoiceStatus = 'Paid';
    } else if (totalPaid > 0) {
      invoiceStatus = 'Partial';
    }

    db.prepare('UPDATE INVOICE SET AMOUNT_PAID = ?, STATUS = ? WHERE INVOICE_ID = ?').run(totalPaid, invoiceStatus, invoiceId);
  });

  runTx();

  const updatedInvoice = db.prepare('SELECT * FROM INVOICE WHERE INVOICE_ID = ?').get(invoiceId);
  const payments = db.prepare('SELECT * FROM PAYMENT WHERE FK_INVOICE_ID = ?').all(invoiceId);
  res.json({ invoice: updatedInvoice, payments });
}));

app.get('/api/payments', safeRoute((req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  const offset = (page - 1) * limit;

  const total = db.prepare('SELECT COUNT(*) as count FROM PAYMENT').get().count;
  const rows = db.prepare(`
    SELECT py.*, 
           p.FIRST_NAME||' '||p.LAST_NAME AS patient_name,
           py.FK_INVOICE_ID as invoice_id
    FROM PAYMENT py 
    JOIN INVOICE i ON i.INVOICE_ID = py.FK_INVOICE_ID
    JOIN ENCOUNTER e ON e.ENCOUNTER_ID = i.FK_ENCOUNTER_ID 
    JOIN APPOINTMENT a ON a.APPOINTMENT_ID = e.FK_APPOINTMENT_ID 
    JOIN PATIENT p ON p.PATIENT_ID = a.FK_PATIENT_ID
    ORDER BY py.PAYMENT_DATE DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
  res.json({ rows, total, page, limit });
}));

// ----------------------------------------------------
// GLOBAL SEARCH
// ----------------------------------------------------

app.get('/api/search', safeRoute((req, res) => {
  const q = req.query.q || '';
  if (!q) return res.json([]);
  const searchParam = `%${q}%`;

  const patients = db.prepare(`
    SELECT PATIENT_ID as id, FIRST_NAME||' '||LAST_NAME AS label, MRN as sublabel 
    FROM PATIENT 
    WHERE FIRST_NAME LIKE ? OR LAST_NAME LIKE ? OR MRN LIKE ? 
    LIMIT 10
  `).all(searchParam, searchParam, searchParam).map(item => ({ type: 'patient', ...item }));

  const providers = db.prepare(`
    SELECT PROVIDER_ID as id, FIRST_NAME||' '||LAST_NAME AS label, SPECIALTY as sublabel 
    FROM PROVIDER 
    WHERE FIRST_NAME LIKE ? OR LAST_NAME LIKE ? OR SPECIALTY LIKE ? 
    LIMIT 10
  `).all(searchParam, searchParam, searchParam).map(item => ({ type: 'provider', ...item }));

  res.json([...patients, ...providers]);
}));

// ----------------------------------------------------
// METADATA SCHEMAS
// ----------------------------------------------------

app.get('/api/meta/schema', safeRoute((req, res) => {
  const tables = ['PATIENT', 'PORTAL_ACCOUNT', 'PROVIDER', 'LOCATION', 'APPOINTMENT', 'ENCOUNTER', 'DIAGNOSIS', 'ENCOUNTER_DIAGNOSIS', 'INVOICE', 'PAYMENT'];
  const metadata = tables.map(table => {
    const schemaRow = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(table);
    const countRow = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
    return {
      table,
      sql: schemaRow ? schemaRow.sql : '',
      count: countRow ? countRow.count : 0
    };
  });
  res.json(metadata);
}));

app.get('/api/meta/queries', safeRoute((req, res) => {
  res.json({
    dashboardKpis: {
      description: "Fetches core clinical and financial KPIs for the aggregate status dashboard cards.",
      sql: `SELECT COUNT(*) AS totalPatients FROM PATIENT;
SELECT COUNT(*) AS scheduledAppointments FROM APPOINTMENT WHERE STATUS='Scheduled';
SELECT SUM(TOTAL_AMOUNT) AS totalBilled FROM INVOICE;
SELECT SUM(TOTAL_AMOUNT-AMOUNT_PAID) AS outstandingAR FROM INVOICE WHERE STATUS IN ('Open','Partial');`
    },
    revenueByProvider: {
      description: "Aggregates life-time billing and payment collections by physician, sorting by highest generated billing.",
      sql: `SELECT pr.LAST_NAME AS provider, 
       ROUND(SUM(i.TOTAL_AMOUNT), 2) AS billed, 
       ROUND(SUM(i.AMOUNT_PAID), 2) AS collected 
FROM PROVIDER pr 
JOIN APPOINTMENT a ON a.FK_PROVIDER_ID=pr.PROVIDER_ID 
JOIN ENCOUNTER e ON e.FK_APPOINTMENT_ID=a.APPOINTMENT_ID 
JOIN INVOICE i ON i.FK_ENCOUNTER_ID=e.ENCOUNTER_ID 
GROUP BY pr.PROVIDER_ID 
ORDER BY billed DESC 
LIMIT 10;`
    },
    appointmentStatus: {
      description: "Counts patient bookings grouped by scheduling states to plot appointment status volume charts.",
      sql: `SELECT STATUS as status, COUNT(*) AS count 
FROM APPOINTMENT 
GROUP BY STATUS;`
    },
    monthlyRevenue: {
      description: "Queries historical totals of invoices generated versus payments collected, grouped by month (last 12 months).",
      sql: `SELECT substr(INVOICE_DATE, 1, 7) AS month, 
       ROUND(SUM(TOTAL_AMOUNT), 2) AS billed, 
       ROUND(SUM(AMOUNT_PAID), 2) AS collected 
FROM INVOICE 
GROUP BY month 
ORDER BY month DESC 
LIMIT 12;`
    },
    patientsList: {
      description: "Retrieves patient registry with search matching and row pagination constraints.",
      sql: `SELECT p.*, pa.IS_ACTIVE as portal_active 
FROM PATIENT p 
LEFT JOIN PORTAL_ACCOUNT pa ON pa.FK_PATIENT_ID = p.PATIENT_ID
WHERE p.FIRST_NAME LIKE ? OR p.LAST_NAME LIKE ? OR p.MRN LIKE ? OR p.EMAIL LIKE ? OR p.PHONE LIKE ?
ORDER BY p.LAST_NAME ASC, p.FIRST_NAME ASC 
LIMIT ? OFFSET ?;`
    },
    patientAppointments: {
      description: "Gathers appointments for a specific patient, joining provider and location details.",
      sql: `SELECT a.*, 
       pr.FIRST_NAME||' '||pr.LAST_NAME AS provider_name, 
       pr.SPECIALTY, 
       l.LOCATION_NAME AS location_name 
FROM APPOINTMENT a 
JOIN PROVIDER pr ON pr.PROVIDER_ID = a.FK_PROVIDER_ID 
JOIN LOCATION l ON l.LOCATION_ID = a.FK_LOCATION_ID 
WHERE a.FK_PATIENT_ID = ? 
ORDER BY a.SCHEDULED_START DESC;`
    },
    providerProductivity: {
      description: "Retrieves physician roster and summarizes signed consultation volumes, billing, and collected payments.",
      sql: `SELECT pr.*, 
       COUNT(DISTINCT e.ENCOUNTER_ID) AS signed_visits, 
       ROUND(COALESCE(SUM(i.TOTAL_AMOUNT), 0), 2) AS gross_billed, 
       ROUND(COALESCE(SUM(i.AMOUNT_PAID), 0), 2) AS collected 
FROM PROVIDER pr 
LEFT JOIN APPOINTMENT a ON a.FK_PROVIDER_ID = pr.PROVIDER_ID 
LEFT JOIN ENCOUNTER e ON e.FK_APPOINTMENT_ID = a.APPOINTMENT_ID AND e.STATUS = 'Signed' 
LEFT JOIN INVOICE i ON i.FK_ENCOUNTER_ID = e.ENCOUNTER_ID 
GROUP BY pr.PROVIDER_ID 
ORDER BY gross_billed DESC;`
    },
    invoicesList: {
      description: "Queries patient accounts receivable invoices by pagination and status/search filters.",
      sql: `SELECT i.*, 
       p.FIRST_NAME||' '||p.LAST_NAME AS patient_name,
       ROUND(i.TOTAL_AMOUNT - i.AMOUNT_PAID, 2) AS balance_due
FROM INVOICE i 
JOIN ENCOUNTER e ON e.ENCOUNTER_ID = i.FK_ENCOUNTER_ID 
JOIN APPOINTMENT a ON a.APPOINTMENT_ID = e.FK_APPOINTMENT_ID 
JOIN PATIENT p ON p.PATIENT_ID = a.FK_PATIENT_ID
WHERE (p.FIRST_NAME LIKE ? OR p.LAST_NAME LIKE ? OR p.MRN LIKE ?)
ORDER BY balance_due DESC 
LIMIT ? OFFSET ?;`
    },
    topDiagnoses: {
      description: "Analyzes primary and secondary clinical ICD-10 code frequencies recorded across patient encounters.",
      sql: `SELECT d.ICD10_CODE as icd10, 
       d.DESCRIPTION as description, 
       d.CATEGORY as category, 
       COUNT(*) AS times_recorded, 
       SUM(ed.IS_PRIMARY) AS times_primary 
FROM ENCOUNTER_DIAGNOSIS ed 
JOIN DIAGNOSIS d ON d.DIAGNOSIS_ID = ed.FK_DIAGNOSIS_ID 
GROUP BY d.DIAGNOSIS_ID 
ORDER BY times_recorded DESC;`
    },
    patientVisitSummary: {
      description: "Aggregates detailed individual encounters with attending doctor, primary ICD-10 diagnosis, and invoice total.",
      sql: `SELECT e.*, 
       p.FIRST_NAME||' '||p.LAST_NAME AS patient_name, 
       pr.FIRST_NAME||' '||pr.LAST_NAME AS provider_name, 
       d.ICD10_CODE||' - '||d.DESCRIPTION AS primary_dx,
       i.TOTAL_AMOUNT AS invoice_total,
       i.STATUS AS billing
FROM ENCOUNTER e 
JOIN APPOINTMENT a ON a.APPOINTMENT_ID = e.FK_APPOINTMENT_ID 
JOIN PATIENT p ON p.PATIENT_ID = a.FK_PATIENT_ID 
JOIN PROVIDER pr ON pr.PROVIDER_ID = a.FK_PROVIDER_ID 
LEFT JOIN ENCOUNTER_DIAGNOSIS ed ON ed.FK_ENCOUNTER_ID = e.ENCOUNTER_ID AND ed.IS_PRIMARY = 1 
LEFT JOIN DIAGNOSIS d ON d.DIAGNOSIS_ID = ed.FK_DIAGNOSIS_ID
LEFT JOIN INVOICE i ON i.FK_ENCOUNTER_ID = e.ENCOUNTER_ID
WHERE p.FIRST_NAME LIKE ? OR p.LAST_NAME LIKE ? OR pr.FIRST_NAME LIKE ? OR pr.LAST_NAME LIKE ?
ORDER BY e.ENCOUNTER_DATE DESC 
LIMIT ? OFFSET ?;`
    }
  });
}));

// -------------------------------------------------------
// PRODUCTION: serve the built React frontend
// -------------------------------------------------------
if (IS_PROD) {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  // Catch-all — return index.html for any non-/api route (SPA routing)
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start Express Server
app.listen(PORT, () => {
  console.log(`Express clinic API server is running on http://localhost:${PORT}`);
  if (IS_PROD) console.log('Serving built React app from ../dist');
});
