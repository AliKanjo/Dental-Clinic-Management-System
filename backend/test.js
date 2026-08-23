const { spawn } = require('child_process');
const http = require('http');

console.log('Starting integration tests...');

// Start the server on port 3001 for testing
const testPort = 3001;
const env = { ...process.env, PORT: testPort, NODE_ENV: 'test' };

const serverProcess = spawn('node', ['server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });

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
    const resHome = await fetch(`http://localhost:${testPort}/`);
    if (resHome.status !== 200) throw new Error(`Home page returned status ${resHome.status}`);
    console.log('✔ Home page resolved successfully.');

    // Test 2: Invalid Login
    console.log('Test 2: Testing invalid login...');
    const resLoginFail = await fetch(`http://localhost:${testPort}/api/auth/login`, {
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
    const resLogin = await fetch(`http://localhost:${testPort}/api/auth/login`, {
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
    const resPatients = await fetch(`http://localhost:${testPort}/api/patients`, {
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
    const resPatDetail = await fetch(`http://localhost:${testPort}/api/patients/${testPatientId}`, {
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
    const resMe = await fetch(`http://localhost:${testPort}/api/auth/me`, {
      headers: { 'Cookie': cookie }
    });
    const me = await resMe.json();
    if (!me.loggedIn || me.user.role !== 'admin') {
      throw new Error('Session check failed to verify admin user.');
    }
    console.log('✔ Session identity verified successfully.');

    console.log('\n--- ALL TEST CASES COMPLETED SUCCESSFULLY (6/6) ---');
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
