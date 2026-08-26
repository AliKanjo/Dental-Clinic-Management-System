const { spawn } = require('child_process');
const http = require('http');

console.log('Starting integration tests...');

// Start the server on port 3001 for testing
const testPort = 3001;
const env = { ...process.env, PORT: testPort, NODE_ENV: 'test' };

const serverProcess = spawn('node', ['server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'], shell: true });

let stdout = '';
let stderr = '';

serverProcess.stdout.on('data', (data) => {
  stdout += data.toString();
  console.log('[Server STDOUT]:', data.toString().trim());
});

serverProcess.stderr.on('data', (data) => {
  stderr += data.toString();
  console.error('[Server STDERR]:', data.toString().trim());
});

// Wait for server to start, then run tests
setTimeout(async () => {
  try {
    console.log('Running test suite...');

    // Test 1: Health check (serve index.html)
    console.log('Test 1: Fetching index.html...');
    const resHome = await fetch(`http://127.0.0.1:${testPort}/`);
    if (resHome.status !== 200) throw new Error(`Home page returned status ${resHome.status}`);
    console.log('✔ Home page resolved successfully.');

    // Test 2: Invalid Login
    console.log('Test 2: Testing invalid login...');
    const resLoginFail = await fetch(`http://127.0.0.1:${testPort}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bad@user.com', password: 'wrongpassword' })
    });
    const dataLoginFail = await resLoginFail.json();
    if (resLoginFail.status === 200 || !dataLoginFail.error) {
      throw new Error('Invalid login should have failed but succeeded.');
    }
    console.log('✔ Invalid login rejected correctly:', dataLoginFail.error);

    // Test 3: Successful Login (Admin)
    console.log('Test 3: Testing admin login...');
    const resLogin = await fetch(`http://127.0.0.1:${testPort}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@dental.com', password: 'admin123' })
    });
    const dataLogin = await resLogin.json();
    if (resLogin.status !== 200) {
      throw new Error(`Admin login failed with status ${resLogin.status}: ${dataLogin.error}`);
    }
    console.log(`✔ Admin logged in successfully as: ${dataLogin.name}`);

    // Extract cookie
    const cookieHeader = resLogin.headers.get('set-cookie');
    if (!cookieHeader) throw new Error('No authentication cookie returned from login.');
    const cookie = cookieHeader.split(';')[0];

    // Test 4: Fetch Patients List (Authenticated)
    console.log('Test 4: Fetching patients database with auth token...');
    const resPatients = await fetch(`http://127.0.0.1:${testPort}/api/patients`, {
      headers: { 'Cookie': cookie }
    });
    const patients = await resPatients.json();
    if (resPatients.status !== 200) {
      throw new Error(`Patients fetch failed: ${patients.error}`);
    }
    console.log(`✔ Patients database fetched. Count: ${patients.length}`);

    // Test 5: Fetch single patient (John Doe)
    const testPatientId = patients[0].id;
    console.log(`Test 5: Fetching Patient 360 profile for Patient ID ${testPatientId}...`);
    const resPatDetail = await fetch(`http://127.0.0.1:${testPort}/api/patients/${testPatientId}`, {
      headers: { 'Cookie': cookie }
    });
    const patDetail = await resPatDetail.json();
    if (resPatDetail.status !== 200) {
      throw new Error(`Patient 360 fetch failed: ${patDetail.error}`);
    }
    console.log(`✔ Patient 360 detail verified for: ${patDetail.patient.first_name} ${patDetail.patient.last_name}`);
    console.log(`✔ Checked Patient plans count: ${patDetail.treatmentPlans.length}`);

    // Test 6: Authenticated User verification check
    console.log('Test 6: Testing /api/auth/me session check...');
    const resMe = await fetch(`http://127.0.0.1:${testPort}/api/auth/me`, {
      headers: { 'Cookie': cookie }
    });
    const me = await resMe.json();
    if (!me.loggedIn || me.user.role !== 'admin') {
      throw new Error('Session check failed to verify admin user.');
    }
    console.log('✔ Session identity verified successfully.');

    // Test 7: Admin User/Role Management CRUD
    console.log('Test 7: Testing User/Role Management API (Admin only)...');
    
    // 7.1: Retrieve users list
    const resUsers = await fetch(`http://127.0.0.1:${testPort}/api/users`, {
      headers: { 'Cookie': cookie }
    });
    const users = await resUsers.json();
    if (resUsers.status !== 200 || !Array.isArray(users)) {
      throw new Error(`Users list retrieve failed: ${users.error || resUsers.status}`);
    }
    console.log(`✔ Users list retrieved. Initial count: ${users.length}`);

    // 7.2: Create new user (Dentist)
    const resCreateUser = await fetch(`http://127.0.0.1:${testPort}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({
        email: 'test.dentist@dental.com',
        password: 'dentistpassword123',
        role: 'dentist',
        firstName: 'Test',
        lastName: 'Dentist',
        phone: '555-9999',
        specialization: 'Pediatric Dentistry',
        licenseNumber: 'LIC-TEST999',
        colorCode: '#e11d48'
      })
    });
    const createdUser = await resCreateUser.json();
    if (resCreateUser.status !== 201 || !createdUser.id) {
      throw new Error(`Create dentist user failed: ${createdUser.error || resCreateUser.status}`);
    }
    const newUserId = createdUser.id;
    console.log(`✔ Dentist user created successfully with ID: ${newUserId}`);

    // 7.3: Update the created user
    const resUpdateUser = await fetch(`http://127.0.0.1:${testPort}/api/users/${newUserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({
        email: 'test.dentist@dental.com',
        role: 'dentist',
        firstName: 'TestUpdated',
        lastName: 'Dentist',
        phone: '555-8888',
        specialization: 'Updated Pediatric',
        licenseNumber: 'LIC-TEST999',
        colorCode: '#e11d48'
      })
    });
    const updateResult = await resUpdateUser.json();
    if (resUpdateUser.status !== 200) {
      throw new Error(`Update user failed: ${updateResult.error || resUpdateUser.status}`);
    }
    console.log('✔ Dentist user updated successfully.');

    // 7.4: Delete the user
    const resDeleteUser = await fetch(`http://127.0.0.1:${testPort}/api/users/${newUserId}`, {
      method: 'DELETE',
      headers: { 'Cookie': cookie }
    });
    const deleteResult = await resDeleteUser.json();
    if (resDeleteUser.status !== 200) {
      throw new Error(`Delete user failed: ${deleteResult.error || resDeleteUser.status}`);
    }
    console.log('✔ Dentist user deleted successfully.');

    // Test 8: AI Smart Assistant API Integration
    console.log('Test 8: Testing AI Smart Assistant API Integration...');

    // 8.1: Test suggest-plan
    console.log('Test 8.1: Querying AI care plan suggestions...');
    const resAiPlan = await fetch(`http://127.0.0.1:${testPort}/api/ai/suggest-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({ symptoms: 'Patient has a deep cavity in tooth #14 and wants teeth whitening.' })
    });
    const aiPlan = await resAiPlan.json();
    if (resAiPlan.status !== 200) {
      throw new Error(`AI plan suggestions failed: ${aiPlan.error || resAiPlan.status}`);
    }
    if (!Array.isArray(aiPlan) || aiPlan.length === 0) {
      throw new Error('AI plan did not return a valid list of suggested procedures.');
    }
    console.log(`✔ AI suggested ${aiPlan.length} care procedures successfully.`);
    console.log('AI suggestion item example:', aiPlan[0]);

    // 8.2: Test optimize-notes
    console.log('Test 8.2: Querying AI clinical notes optimization...');
    const resAiOptimize = await fetch(`http://127.0.0.1:${testPort}/api/ai/optimize-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({ notes: 'pt has tooth ache in lower jaw. allergic to penicillin.' })
    });
    const aiOptimize = await resAiOptimize.json();
    if (resAiOptimize.status !== 200) {
      throw new Error(`AI notes optimization failed: ${aiOptimize.error || resAiOptimize.status}`);
    }
    if (!aiOptimize.formattedNotes || !aiOptimize.allergies) {
      throw new Error('AI notes optimization returned incomplete object properties.');
    }
    console.log('✔ AI clinical note optimized and allergies extracted successfully.');
    console.log('AI extracted allergies:', aiOptimize.allergies);

    // Test 9: Extended System Views (CRM, Prescriptions, Treatments Catalog, Stock)
    console.log('Test 9: Testing Extended System Views API endpoints...');

    // 9.1: Fetch follow-ups
    console.log('Test 9.1: Fetching CRM follow-ups...');
    const resFollowups = await fetch(`http://127.0.0.1:${testPort}/api/followups`, {
      headers: { 'Cookie': cookie }
    });
    const followups = await resFollowups.json();
    if (resFollowups.status !== 200 || !Array.isArray(followups)) {
      throw new Error(`Fetch follow-ups failed: ${resFollowups.status}`);
    }
    console.log('✔ CRM follow-ups fetched successfully.');

    // 9.2: Fetch prescriptions & Add a new prescription
    console.log('Test 9.2: Fetching and creating doctor prescriptions...');
    const resPrescriptions = await fetch(`http://127.0.0.1:${testPort}/api/prescriptions`, {
      headers: { 'Cookie': cookie }
    });
    const prescriptions = await resPrescriptions.json();
    if (resPrescriptions.status !== 200 || !Array.isArray(prescriptions)) {
      throw new Error(`Fetch prescriptions failed: ${resPrescriptions.status}`);
    }
    console.log(`✔ Initial prescriptions count: ${prescriptions.length}`);

    const resAddPresc = await fetch(`http://127.0.0.1:${testPort}/api/prescriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({
        patientId: 1,
        dentistId: 2,
        medication: 'Paracetamol 500mg',
        dosage: '1 tablet 2 times daily',
        instructions: 'After meals'
      })
    });
    const addPrescRes = await resAddPresc.json();
    if (resAddPresc.status !== 201) {
      throw new Error(`Create prescription failed: ${addPrescRes.error || resAddPresc.status}`);
    }
    console.log('✔ Prescription written successfully.');

    // 9.3: Add treatment catalog service
    console.log('Test 9.3: Adding a new treatment procedure to catalog...');
    const resAddSrv = await fetch(`http://127.0.0.1:${testPort}/api/treatments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({
        name: 'Invisalign Consultation',
        description: '3D scanning and aligners mock consultation fee',
        baseCost: 99.0
      })
    });
    const addSrvRes = await resAddSrv.json();
    if (resAddSrv.status !== 201) {
      throw new Error(`Create treatment service failed: ${addSrvRes.error || resAddSrv.status}`);
    }
    console.log('✔ Invisalign Consultation added to treatments catalog.');

    // 9.4: Fetch medical stock and update inventory
    console.log('Test 9.4: Fetching stock inventory and updating level...');
    const resStock = await fetch(`http://127.0.0.1:${testPort}/api/stock`, {
      headers: { 'Cookie': cookie }
    });
    const stockList = await resStock.json();
    if (resStock.status !== 200 || !Array.isArray(stockList)) {
      throw new Error(`Fetch stock failed: ${resStock.status}`);
    }
    console.log(`✔ Initial stock unique items count: ${stockList.length}`);

    const stockItem = stockList[0];
    const resUpdateStock = await fetch(`http://127.0.0.1:${testPort}/api/stock/${stockItem.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({
        itemName: stockItem.item_name,
        category: stockItem.category,
        quantity: stockItem.quantity + 10,
        unit: stockItem.unit,
        reorderLevel: stockItem.reorder_level
      })
    });
    const updateStockRes = await resUpdateStock.json();
    if (resUpdateStock.status !== 200) {
      throw new Error(`Update stock level failed: ${updateStockRes.error || resUpdateStock.status}`);
    }
    console.log('✔ Stock level updated successfully.');

    console.log('\n--- ALL TEST CASES COMPLETED SUCCESSFULLY (9/9) ---');
    cleanup(0);
  } catch (err) {
    console.error('\n❌ TEST CASE FAILED:', err.message);
    cleanup(1);
  }
}, 4000); // Allow 4 seconds for server setup and seeding

function cleanup(exitCode) {
  console.log('Shutting down test server...');
  serverProcess.kill('SIGINT');
  process.exit(exitCode);
}
