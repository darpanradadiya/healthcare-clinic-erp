const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { faker } = require('@faker-js/faker');

// Delete existing database file if it exists
const dbPath = path.join(__dirname, 'clinic.db');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Deleted existing clinic.db');
}

// Open a fresh database
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Initialize schema
console.log('Creating database schema from schema.sql...');
const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schemaSql);
console.log('Database schema created successfully.');

// Formatting utilities
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

// ----------------------------------------------------
// 1. Seed Locations (4 locations)
// ----------------------------------------------------
const locations = [
  { name: 'Downtown Main Clinic', address: '100 Medical Plaza Dr', city: 'Boston', state: 'MA', zip: '02115', phone: '617-555-0101' },
  { name: 'North Branch', address: '450 Northern Ave', city: 'Boston', state: 'MA', zip: '02129', phone: '617-555-0102' },
  { name: 'Westside Medical Plaza', address: '820 Commonwealth Ave', city: 'Brookline', state: 'MA', zip: '02446', phone: '617-555-0103' },
  { name: 'Eastgate Family Center', address: '12 Saratoga St', city: 'East Boston', state: 'MA', zip: '02128', phone: '617-555-0104' }
];

console.log('Seeding locations...');
const insertLocation = db.prepare(`
  INSERT INTO LOCATION (LOCATION_NAME, ADDRESS_LINE, CITY, STATE, ZIP, PHONE)
  VALUES (?, ?, ?, ?, ?, ?)
`);

db.transaction(() => {
  for (const loc of locations) {
    insertLocation.run(loc.name, loc.address, loc.city, loc.state, loc.zip, loc.phone);
  }
})();
console.log(`Seeded ${locations.length} locations.`);

// ----------------------------------------------------
// 2. Seed Providers (25 providers)
// ----------------------------------------------------
const specialties = [
  'Family Medicine', 'Internal Medicine', 'Cardiology', 'Pediatrics', 'Dermatology',
  'Orthopedics', 'Neurology', 'Psychiatry', 'OB-GYN', 'Endocrinology'
];

console.log('Seeding providers...');
const insertProvider = db.prepare(`
  INSERT INTO PROVIDER (NPI, FIRST_NAME, LAST_NAME, SPECIALTY, PHONE, EMAIL)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const providersList = [];
db.transaction(() => {
  for (let i = 0; i < 25; i++) {
    const spec = specialties[i % specialties.length];
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const npi = faker.string.numeric(10); // ensure 10-digits
    const phone = '617-' + faker.string.numeric(3) + '-' + faker.string.numeric(4);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@northeasternclinic.org`;

    insertProvider.run(npi, firstName, lastName, spec, phone, email);
    providersList.push(i + 1); // IDs are 1-indexed
  }
})();
console.log('Seeded 25 providers.');

// ----------------------------------------------------
// 3. Seed Diagnoses (40 ICD-10 codes)
// ----------------------------------------------------
const diagnoses = [
  { code: 'I10', desc: 'Essential (primary) hypertension', cat: 'Circulatory' },
  { code: 'E11.9', desc: 'Type 2 diabetes mellitus without complications', cat: 'Endocrine' },
  { code: 'E78.5', desc: 'Hyperlipidemia, unspecified', cat: 'Endocrine' },
  { code: 'Z00.00', desc: 'Encounter for general adult medical examination without abnormal findings', cat: 'Preventive' },
  { code: 'J06.9', desc: 'Acute upper respiratory infection, unspecified', cat: 'Respiratory' },
  { code: 'M54.5', desc: 'Low back pain', cat: 'Musculoskeletal' },
  { code: 'L70.0', desc: 'Acne vulgaris', cat: 'Dermatology' },
  { code: 'K21.9', desc: 'Gastro-esophageal reflux disease without esophagitis', cat: 'Gastrointestinal' },
  { code: 'F41.1', desc: 'Generalized anxiety disorder', cat: 'Mental Health' },
  { code: 'F32.9', desc: 'Major depressive disorder, single episode, unspecified', cat: 'Mental Health' },
  { code: 'J20.9', desc: 'Acute bronchitis, unspecified', cat: 'Respiratory' },
  { code: 'J45.909', desc: 'Unspecified asthma, uncomplicated', cat: 'Respiratory' },
  { code: 'N39.0', desc: 'Urinary tract infection, site not specified', cat: 'Genitourinary' },
  { code: 'M17.9', desc: 'Osteoarthritis of knee, unspecified', cat: 'Musculoskeletal' },
  { code: 'G43.909', desc: 'Migraine, unspecified, not intractable, without status migrainosus', cat: 'Neurology' },
  { code: 'H66.90', desc: 'Otitis media, unspecified, unspecified ear', cat: 'Otolaryngology' },
  { code: 'D64.9', desc: 'Anemia, unspecified', cat: 'Hematology' },
  { code: 'E03.9', desc: 'Hypothyroidism, unspecified', cat: 'Endocrine' },
  { code: 'R05', desc: 'Cough', cat: 'Symptoms' },
  { code: 'R07.9', desc: 'Chest pain, unspecified', cat: 'Symptoms' },
  { code: 'R51', desc: 'Headache', cat: 'Symptoms' },
  { code: 'M25.561', desc: 'Pain in right knee', cat: 'Musculoskeletal' },
  { code: 'L21.9', desc: 'Seborrheic dermatitis, unspecified', cat: 'Dermatology' },
  { code: 'Z12.11', desc: 'Encounter for screening for malignant neoplasm of colon', cat: 'Preventive' },
  { code: 'I25.10', desc: 'Atherosclerotic heart disease of native coronary artery without angina pectoris', cat: 'Circulatory' },
  { code: 'G47.00', desc: 'Insomnia, unspecified', cat: 'Neurology' },
  { code: 'J30.9', desc: 'Allergic rhinitis, unspecified', cat: 'Respiratory' },
  { code: 'B35.1', desc: 'Tinea unguium', cat: 'Infectious' },
  { code: 'K58.9', desc: 'Irritable bowel syndrome without diarrhea', cat: 'Gastrointestinal' },
  { code: 'M79.7', desc: 'Fibromyalgia', cat: 'Musculoskeletal' },
  { code: 'N91.2', desc: 'Amenorrhea, unspecified', cat: 'Genitourinary' },
  { code: 'Z30.011', desc: 'Encounter for initial prescription of contraceptive pills', cat: 'Preventive' },
  { code: 'E66.9', desc: 'Obesity, unspecified', cat: 'Endocrine' },
  { code: 'R30.0', desc: 'Dysuria', cat: 'Symptoms' },
  { code: 'L30.9', desc: 'Dermatitis, unspecified', cat: 'Dermatology' },
  { code: 'K59.00', desc: 'Constipation, unspecified', cat: 'Gastrointestinal' },
  { code: 'R42', desc: 'Dizziness and giddiness', cat: 'Symptoms' },
  { code: 'M79.1', desc: 'Myalgia', cat: 'Musculoskeletal' },
  { code: 'I48.91', desc: 'Unspecified atrial fibrillation', cat: 'Circulatory' },
  { code: 'E27.9', desc: 'Disorder of adrenal gland, unspecified', cat: 'Endocrine' }
];

console.log('Seeding diagnoses...');
const insertDiagnosis = db.prepare(`
  INSERT INTO DIAGNOSIS (ICD10_CODE, DESCRIPTION, CATEGORY)
  VALUES (?, ?, ?)
`);

db.transaction(() => {
  for (const dx of diagnoses) {
    insertDiagnosis.run(dx.code, dx.desc, dx.cat);
  }
})();
console.log(`Seeded ${diagnoses.length} diagnoses.`);

// ----------------------------------------------------
// 4. Seed Patients & Portal Accounts (5,000 patients, ~60% portals)
// ----------------------------------------------------
console.log('Seeding patients and portal accounts (5,000)...');
const insertPatient = db.prepare(`
  INSERT INTO PATIENT (MRN, FIRST_NAME, LAST_NAME, DATE_OF_BIRTH, SEX, PHONE, EMAIL, ADDRESS_LINE, CITY, STATE, ZIP)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertPortal = db.prepare(`
  INSERT INTO PORTAL_ACCOUNT (FK_PATIENT_ID, USERNAME, PASSWORD_HASH, LAST_LOGIN, IS_ACTIVE)
  VALUES (?, ?, ?, ?, ?)
`);

// Fixed list of US states to pick from
const states = ['MA', 'NH', 'RI', 'CT', 'ME', 'VT'];

db.transaction(() => {
  for (let i = 0; i < 5000; i++) {
    const sex = faker.helpers.weightedArrayElement([
      { value: 'M', weight: 48 },
      { value: 'F', weight: 48 },
      { value: 'O', weight: 4 }
    ]);
    const firstName = faker.person.firstName(sex === 'M' ? 'male' : sex === 'F' ? 'female' : undefined);
    const lastName = faker.person.lastName();
    const dob = formatSqlDate(faker.date.birthdate({ min: 1, max: 95, mode: 'age' }));
    const mrn = 'MRN' + String(i + 1).padStart(6, '0');
    const phone = faker.string.numeric(3) + '-' + faker.string.numeric(3) + '-' + faker.string.numeric(4);
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    const address = faker.location.streetAddress();
    const city = faker.location.city();
    const state = faker.helpers.arrayElement(states);
    const zip = '0' + faker.string.numeric(4);

    // Insert Patient
    const pResult = insertPatient.run(mrn, firstName, lastName, dob, sex, phone, email, address, city, state, zip);
    const patientId = pResult.lastInsertRowid;

    // Create Portal Account (~60%)
    if (Math.random() < 0.6) {
      const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${patientId}`;
      const passwordHash = '$2a$12$R9h/cIPz0gi.UR1gryz2xOphg5WDWuhOObEQJu0Gg1gE6n2gD4z7q'; // static hash
      const lastLogin = Math.random() < 0.8 
        ? formatSqlDateTime(faker.date.recent({ days: 30 })) 
        : null;
      const isActive = Math.random() < 0.95 ? 1 : 0;

      insertPortal.run(patientId, username, passwordHash, lastLogin, isActive);
    }
  }
})();
console.log('Seeded 5,000 patients and their portal accounts.');

// ----------------------------------------------------
// 5. Seed Appointments, Encounters, Invoices & Payments (~12,000)
// ----------------------------------------------------
console.log('Seeding appointments (~12,000) and financials...');
const insertAppointment = db.prepare(`
  INSERT INTO APPOINTMENT (FK_PATIENT_ID, FK_PROVIDER_ID, FK_LOCATION_ID, SCHEDULED_START, SCHEDULED_END, STATUS, REASON)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertEncounter = db.prepare(`
  INSERT INTO ENCOUNTER (FK_APPOINTMENT_ID, ENCOUNTER_DATE, CHIEF_COMPLAINT, VISIT_NOTE, STATUS, SIGNED_AT)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertEncounterDiagnosis = db.prepare(`
  INSERT INTO ENCOUNTER_DIAGNOSIS (FK_ENCOUNTER_ID, FK_DIAGNOSIS_ID, IS_PRIMARY, NOTED_DATE)
  VALUES (?, ?, ?, ?)
`);

const insertInvoice = db.prepare(`
  INSERT INTO INVOICE (FK_ENCOUNTER_ID, INVOICE_DATE, TOTAL_AMOUNT, AMOUNT_PAID, STATUS)
  VALUES (?, ?, ?, ?, ?)
`);

const insertPayment = db.prepare(`
  INSERT INTO PAYMENT (FK_INVOICE_ID, PAYMENT_DATE, AMOUNT, METHOD)
  VALUES (?, ?, ?, ?)
`);

// Clinical complaint lists to make encounters realistic
const complaintsList = [
  'Presents with persistent cough and fatigue.',
  'Follow-up for primary hypertension management.',
  'Encounter for annual physical screening.',
  'Experiencing lower back stiffness and mild pain.',
  'Evaluation of acne breakout on face and back.',
  'Reports symptoms of acid reflux and heartburn.',
  'Anxiety symptoms are worsening under recent stress.',
  'Routine diabetic check and A1C evaluation.',
  'Evaluated for dysuria and suspected UTI.',
  'Follow up regarding knee osteoarthritic pain.',
  'Complaining of throbbing unilateral headache.',
  'Ear congestion and discomfort for three days.',
  'Experiencing dizziness when standing quickly.'
];

const visitNotesList = [
  'Patient states symptoms began last week. Exam reveals clear lungs, normal vitals. Instructed to rest and drink fluids.',
  'Reviewed BP logs. Average is 135/85. Discussed dietary modifications and adherence to current lisinopril dosage.',
  'General adult physical exam completed. Heart rate and rhythm regular. Screenings up to date. Labs ordered.',
  'Mild tenderness to palpation in lumbar region. Range of motion slightly limited. Recommended physical therapy exercises.',
  'Moderate inflammatory acne lesions noted. Discussed topical tretinoin therapy and sun protection.',
  'Instructed to avoid triggering foods and raise head of bed. Continuing omeprazole daily for 4 weeks.',
  'Discussed cognitive behavioral strategies and coping mechanisms. Patient to follow up in 2 weeks.',
  'Vitals stable. Discussed insulin adjustment. Retinal screening recommended. Feet examined with normal sensation.',
  'Urinalysis performed. Positive for nitrites and leukocytes. Commenced short course of oral antibiotics.',
  'Tenderness along medial joint line. Recommended ice, NSAIDs, and low-impact activity.',
  'Vitals within normal limits. Reviewed migraine triggers. Prescribed triptan for acute episodes.',
  'Erythema and effusion noted in left tympanic membrane. Patient started on amoxicillin.',
  'Neurological exam normal. Vitals stable. Suspect orthostatic hypotension. Advised hydration and slow positional changes.'
];

const apptReasons = [
  'Annual Physical', 'Follow-up', 'Consultation', 'Urgent Care', 
  'Routine Screening', 'Medication Management', 'Wellness Exam'
];

const paymentMethods = ['Card', 'Cash', 'Check', 'Insurance'];

// Anchor date is June 24, 2026
const anchorDate = new Date('2026-06-24T10:00:00');

db.transaction(() => {
  for (let i = 0; i < 12000; i++) {
    const patientId = faker.number.int({ min: 1, max: 5000 });
    const providerId = faker.number.int({ min: 1, max: 25 });
    const locationId = faker.number.int({ min: 1, max: 4 });
    const reason = faker.helpers.arrayElement(apptReasons);

    // Generate appointment date in the range Jan 2025 to Aug 2026
    const apptDate = faker.date.between({ from: '2025-01-01', to: '2026-08-31' });
    
    // Set minutes to 0, 15, 30, or 45 for realism
    apptDate.setMinutes(faker.helpers.arrayElement([0, 15, 30, 45]));
    apptDate.setSeconds(0);
    
    const startStr = formatSqlDateTime(apptDate);
    
    const duration = faker.helpers.arrayElement([30, 45, 60]); // duration in minutes
    const endDate = new Date(apptDate.getTime() + duration * 60 * 1000);
    const endStr = formatSqlDateTime(endDate);

    let status = 'Scheduled';
    if (apptDate < anchorDate) {
      status = faker.helpers.weightedArrayElement([
        { value: 'Completed', weight: 85 },
        { value: 'Cancelled', weight: 10 },
        { value: 'No-Show', weight: 5 }
      ]);
    } else {
      status = faker.helpers.weightedArrayElement([
        { value: 'Scheduled', weight: 90 },
        { value: 'Cancelled', weight: 10 }
      ]);
    }

    // Insert Appointment
    const apptResult = insertAppointment.run(patientId, providerId, locationId, startStr, endStr, status, reason);
    const apptId = apptResult.lastInsertRowid;

    // Encounters + Billing for Completed Appointments
    if (status === 'Completed') {
      const encounterDateStr = formatSqlDate(apptDate);
      const complaintIndex = i % complaintsList.length;
      const chiefComplaint = complaintsList[complaintIndex];
      const visitNote = visitNotesList[complaintIndex];
      
      const isSigned = Math.random() < 0.95; // 95% signed
      const encounterStatus = isSigned ? 'Signed' : 'Open';
      const signedAt = isSigned 
        ? formatSqlDateTime(new Date(apptDate.getTime() + faker.number.int({ min: 1, max: 2 }) * 3600 * 1000))
        : null;

      // Insert Encounter
      const encResult = insertEncounter.run(apptId, encounterDateStr, chiefComplaint, visitNote, encounterStatus, signedAt);
      const encounterId = encResult.lastInsertRowid;

      // Seeding Encounter Diagnoses (1 to 3 distinct diagnoses)
      const numDx = faker.number.int({ min: 1, max: 3 });
      const selectedDxIndexes = new Set();
      while (selectedDxIndexes.size < numDx) {
        selectedDxIndexes.add(faker.number.int({ min: 0, max: 39 }));
      }

      const dxArray = Array.from(selectedDxIndexes);
      dxArray.forEach((dxIdx, index) => {
        const dxId = dxIdx + 1; // 1-indexed
        const isPrimary = index === 0 ? 1 : 0; // first one is primary
        insertEncounterDiagnosis.run(encounterId, dxId, isPrimary, encounterDateStr);
      });

      // Seeding Financials for Signed Encounters
      if (isSigned) {
        // Amount between $80.00 and $800.00, rounded to 2 decimal places
        const totalAmount = parseFloat(faker.finance.amount({ min: 80, max: 800, dec: 2 }));
        
        // Paid status profile
        const payProfile = faker.helpers.weightedArrayElement([
          { value: 'Full', weight: 75 },
          { value: 'Partial', weight: 15 },
          { value: 'None', weight: 10 }
        ]);

        let amountPaid = 0.00;
        let invoiceStatus = 'Open';

        if (payProfile === 'Full') {
          amountPaid = totalAmount;
          invoiceStatus = 'Paid';
        } else if (payProfile === 'Partial') {
          amountPaid = parseFloat(faker.finance.amount({ min: 10, max: totalAmount - 5, dec: 2 }));
          invoiceStatus = 'Partial';
        }

        // Insert Invoice
        const invResult = insertInvoice.run(encounterId, encounterDateStr, totalAmount, amountPaid, invoiceStatus);
        const invoiceId = invResult.lastInsertRowid;

        // Insert Payment if paid amount > 0
        if (amountPaid > 0) {
          const method = faker.helpers.arrayElement(paymentMethods);
          
          // Payment date: invoice date plus 0-14 days, capped at anchorDate
          const payOffset = faker.number.int({ min: 0, max: 14 }) * 24 * 3600 * 1000;
          let payDate = new Date(apptDate.getTime() + payOffset);
          if (payDate > anchorDate) {
            payDate = anchorDate;
          }
          const payDateStr = formatSqlDate(payDate);

          insertPayment.run(invoiceId, payDateStr, amountPaid, method);
        }
      }
    }
  }
})();
console.log('Seeded 12,000 appointments and associated financial ledger records.');
console.log('Database seeding process completed successfully!');
db.close();
