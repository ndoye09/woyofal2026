#!/usr/bin/env node

/**
 * Post-Deployment Verification Script
 * Teste que le site fonctionne correctement en production
 */

const http = require('http');
const https = require('https');

// Colors pour terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Configuration
const config = {
  frontendUrl: process.argv[2] || 'http://localhost:5173',
  apiUrl: process.argv[3] || 'http://localhost:5000/api'
};

console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════════`);
console.log(`🔍 POST-DEPLOYMENT VERIFICATION`);
console.log(`═══════════════════════════════════════════════════════════════${colors.reset}\n`);

console.log(`Frontend: ${config.frontendUrl}`);
console.log(`API:      ${config.apiUrl}\n`);

// Helper function pour faire des requêtes HTTP/HTTPS
function makeRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Woyofal-Verification/1.0'
      },
      timeout: 10000
    };

    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
            raw: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: null,
            raw: data
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Tests à exécuter
const tests = [
  {
    name: 'Frontend Homepage',
    url: config.frontendUrl,
    validate: (res) => res.status === 200 && res.raw.includes('html')
  },
  {
    name: 'API Health Check',
    url: `${config.apiUrl}/health`,
    validate: (res) => res.status === 200 && res.body?.status === 'ok'
  },
  {
    name: 'API Login Endpoint',
    url: `${config.apiUrl}/auth/login`,
    method: 'POST',
    body: { email: 'test@example.com', password: 'password123' },
    validate: (res) => res.status === 200 && res.body?.access_token
  },
  {
    name: 'API Simulation Endpoint',
    url: `${config.apiUrl}/simulation/tarifs`,
    validate: (res) => res.status === 200 && res.body?.tarifs
  },
  {
    name: 'API Chatbot Endpoint',
    url: `${config.apiUrl}/ai/chat`,
    method: 'POST',
    body: { message: 'Bonjour', history: [] },
    validate: (res) => res.status === 200 && res.body?.response
  }
];

// Exécuter les tests
async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const res = await makeRequest(
        test.url,
        test.method || 'GET',
        test.body
      );

      const isValid = test.validate(res);

      if (isValid) {
        console.log(`${colors.green}✅${colors.reset} ${test.name}`);
        console.log(`   └─ Status: ${res.status}`);
        passed++;
      } else {
        console.log(`${colors.red}❌${colors.reset} ${test.name}`);
        console.log(`   └─ Status: ${res.status} (unexpected)`);
        failed++;
      }
    } catch (error) {
      console.log(`${colors.red}❌${colors.reset} ${test.name}`);
      console.log(`   └─ Error: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset} | ${colors.red}Failed: ${failed}${colors.reset}`);

  if (failed === 0) {
    console.log(`\n${colors.green}🎉 All tests passed! Your deployment is working correctly.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.yellow}⚠️  Some tests failed. Check your deployment.${colors.reset}\n`);
    process.exit(1);
  }
}

// Lancer les tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
