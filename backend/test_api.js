const https = require('https');

function postJSON(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const body = JSON.stringify(data);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getJSON(url, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function test() {
  try {
    console.log('Logging in...');
    const loginData = await postJSON('https://dial-flow-crm.onrender.com/api/auth/login', {
      email: 'vipin@dialflow.com',
      password: 'password123'
    });
    console.log('Login Response:', JSON.stringify(loginData, null, 2));

    if (!loginData.success) {
      console.log('Login failed!');
      return;
    }

    console.log('Fetching next lead...');
    const leadData = await getJSON('https://dial-flow-crm.onrender.com/api/leads/next', loginData.token);
    console.log('Next Lead Response:', JSON.stringify(leadData, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
