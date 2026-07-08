const https = require('https');

function postJSON(url, data, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const body = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch(e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getJSON(url, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'GET',
      headers
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch(e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function test() {
  try {
    console.log('Logging in...');
    const loginRes = await postJSON('https://dial-flow-crm.onrender.com/api/auth/login', {
      email: 'vipin@dialflow.com',
      password: 'password123'
    });
    console.log('Login Status:', loginRes.status);
    console.log('Login Body:', JSON.stringify(loginRes.body, null, 2));

    const token = loginRes.body.token;

    console.log('Checking /api/attendance/today...');
    const todayRes = await getJSON('https://dial-flow-crm.onrender.com/api/attendance/today', token);
    console.log('Today Status:', todayRes.status);
    console.log('Today Body:', todayRes.body || todayRes.raw);

    console.log('Attempting Punch In...');
    const punchRes = await postJSON('https://dial-flow-crm.onrender.com/api/attendance/punch-in', {
      latitude: 26.4499,
      longitude: 80.3319
    }, token);
    console.log('Punch Status:', punchRes.status);
    console.log('Punch Body:', punchRes.body || punchRes.raw);

  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
