const http = require('https');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function run() {
  try {
    console.log('1. Logging in to live server...');
    const loginData = JSON.stringify({
      email: 'vipin@dialflow.com',
      password: 'password123'
    });

    const loginRes = await makeRequest({
      hostname: 'dial-flow-crm.onrender.com',
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    }, loginData);

    console.log('Login Response Status:', loginRes.statusCode);
    const loginJson = JSON.parse(loginRes.body);
    if (!loginJson.success) {
      console.error('Login failed:', loginJson);
      return;
    }

    const token = loginJson.token;
    console.log('Login successful! Token acquired.');

    console.log('2. Attempting to apply leave on live server...');
    const leaveData = JSON.stringify({
      leaveType: 'sick',
      startDate: '2026-07-15',
      endDate: '2026-07-17',
      reason: 'Test medical leave request'
    });

    const leaveRes = await makeRequest({
      hostname: 'dial-flow-crm.onrender.com',
      path: '/api/hrms/leave',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(leaveData),
        'Authorization': `Bearer ${token}`
      }
    }, leaveData);

    console.log('HRMS Leave Application Response Status:', leaveRes.statusCode);
    console.log('HRMS Leave Application Response Body:\n', leaveRes.body);

  } catch (error) {
    console.error('Test Execution Failed:', error);
  }
}

run();
