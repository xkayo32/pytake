// PyTake Backend - K6 Load Testing Script
// Usage: k6 run --vus 10 --duration 30s load_test.js

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const loginRate = new Rate('login_success_rate');
const messageRate = new Rate('message_send_success_rate');
const wsConnectionRate = new Rate('websocket_connection_success_rate');
const apiResponseTime = new Trend('api_response_time');
const totalRequests = new Counter('total_requests');

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8081';
const VUS = __ENV.VUS || 10;
const DURATION = __ENV.DURATION || '30s';

// Test scenarios
export const options = {
  scenarios: {
    // API Load Test
    api_load: {
      executor: 'constant-vus',
      vus: parseInt(VUS),
      duration: DURATION,
      tags: { test_type: 'api_load' },
    },
    
    // Spike Test
    api_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5s', target: 50 },
        { duration: '10s', target: 50 },
        { duration: '5s', target: 0 },
      ],
      tags: { test_type: 'spike' },
    },
    
    // WebSocket Test
    websocket_test: {
      executor: 'constant-vus',
      vus: 5,
      duration: '20s',
      exec: 'websocketTest',
      tags: { test_type: 'websocket' },
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.1'], // Error rate must be less than 10%
    login_success_rate: ['rate>0.9'], // Login success rate must be > 90%
    message_send_success_rate: ['rate>0.8'], // Message send success rate > 80%
    websocket_connection_success_rate: ['rate>0.9'], // WebSocket success > 90%
  },
};

// Test data
let testUsers = [];
let accessTokens = [];

export function setup() {
  console.log('Setting up test environment...');
  
  // Create test users
  for (let i = 0; i < 20; i++) {
    const timestamp = Date.now() + i;
    testUsers.push({
      name: `Load Test User ${i}`,
      email: `loadtest${i}+${timestamp}@pytake.com`,
      password: `LoadTest123!${i}`,
      phone: `5511${String(timestamp).slice(-8)}`,
    });
  }
  
  console.log(`Created ${testUsers.length} test users`);
  return { testUsers };
}

export default function(data) {
  group('Authentication Flow', () => {
    const user = data.testUsers[__VU % data.testUsers.length];
    
    // Register user
    group('User Registration', () => {
      const registerPayload = {
        name: user.name,
        email: user.email,
        password: user.password,
        company: 'Load Test Company',
      };
      
      const registerResponse = http.post(
        `${BASE_URL}/api/v1/auth/register`,
        JSON.stringify(registerPayload),
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: '30s',
        }
      );
      
      totalRequests.add(1);
      apiResponseTime.add(registerResponse.timings.duration);
      
      const registerSuccess = check(registerResponse, {
        'registration status is 201': (r) => r.status === 201,
        'registration has token': (r) => JSON.parse(r.body).token !== undefined,
        'registration response time < 2s': (r) => r.timings.duration < 2000,
      });
      
      if (registerSuccess && registerResponse.status === 201) {
        const body = JSON.parse(registerResponse.body);
        accessTokens[__VU] = body.token;
      }
    });
    
    // Login user
    group('User Login', () => {
      if (Math.random() > 0.3) { // 70% chance to login instead of register
        const loginPayload = {
          email: user.email,
          password: user.password,
        };
        
        const loginResponse = http.post(
          `${BASE_URL}/api/v1/auth/login`,
          JSON.stringify(loginPayload),
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: '30s',
          }
        );
        
        totalRequests.add(1);
        apiResponseTime.add(loginResponse.timings.duration);
        
        const loginSuccess = check(loginResponse, {
          'login status is 200': (r) => r.status === 200,
          'login has token': (r) => JSON.parse(r.body).token !== undefined,
          'login response time < 1s': (r) => r.timings.duration < 1000,
        });
        
        loginRate.add(loginSuccess);
        
        if (loginSuccess && loginResponse.status === 200) {
          const body = JSON.parse(loginResponse.body);
          accessTokens[__VU] = body.token;
        }
      }
    });
  });
  
  // WhatsApp API Operations
  if (accessTokens[__VU]) {
    group('WhatsApp Operations', () => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessTokens[__VU]}`,
      };
      
      // Send WhatsApp message
      group('Send Message', () => {
        const user = data.testUsers[__VU % data.testUsers.length];
        const messagePayload = {
          to: user.phone,
          type: 'text',
          text: {
            body: `Load test message from VU ${__VU} at ${new Date().toISOString()}`,
          },
        };
        
        const messageResponse = http.post(
          `${BASE_URL}/api/v1/whatsapp/send`,
          JSON.stringify(messagePayload),
          { headers, timeout: '30s' }
        );
        
        totalRequests.add(1);
        apiResponseTime.add(messageResponse.timings.duration);
        
        const messageSuccess = check(messageResponse, {
          'message send status is 200': (r) => r.status === 200,
          'message has ID': (r) => JSON.parse(r.body).message_id !== undefined,
          'message response time < 3s': (r) => r.timings.duration < 3000,
        });
        
        messageRate.add(messageSuccess);
      });
      
      // List messages
      group('List Messages', () => {
        const listResponse = http.get(
          `${BASE_URL}/api/v1/messages?limit=10`,
          { headers, timeout: '30s' }
        );
        
        totalRequests.add(1);
        apiResponseTime.add(listResponse.timings.duration);
        
        check(listResponse, {
          'message list status is 200': (r) => r.status === 200,
          'message list has data': (r) => JSON.parse(r.body).data !== undefined,
          'message list response time < 1s': (r) => r.timings.duration < 1000,
        });
      });
    });
    
    // Contact Management
    group('Contact Operations', () => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessTokens[__VU]}`,
      };
      
      const user = data.testUsers[__VU % data.testUsers.length];
      const contactPayload = {
        name: `Load Test Contact ${__VU}`,
        phone: user.phone,
        email: `contact${__VU}@loadtest.com`,
        tags: ['load-test', 'automated'],
      };
      
      // Create contact
      const createResponse = http.post(
        `${BASE_URL}/api/v1/contacts`,
        JSON.stringify(contactPayload),
        { headers, timeout: '30s' }
      );
      
      totalRequests.add(1);
      
      if (createResponse.status === 201) {
        const contact = JSON.parse(createResponse.body);
        
        // Update contact
        const updatePayload = {
          name: `Updated Load Test Contact ${__VU}`,
          tags: ['load-test', 'automated', 'updated'],
        };
        
        const updateResponse = http.put(
          `${BASE_URL}/api/v1/contacts/${contact.id}`,
          JSON.stringify(updatePayload),
          { headers, timeout: '30s' }
        );
        
        totalRequests.add(1);
        
        check(updateResponse, {
          'contact update status is 200': (r) => r.status === 200,
        });
      }
    });
    
    // Health checks (lighter load)
    if (Math.random() > 0.7) { // 30% chance
      group('Health Checks', () => {
        const healthResponse = http.get(`${BASE_URL}/health`, { timeout: '10s' });
        totalRequests.add(1);
        
        check(healthResponse, {
          'health check status is 200': (r) => r.status === 200,
          'health check response time < 500ms': (r) => r.timings.duration < 500,
        });
      });
    }
  }
  
  // Random sleep to simulate user thinking time
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 seconds
}

// WebSocket load test
export function websocketTest() {
  if (!accessTokens[__VU]) {
    console.warn(`VU ${__VU}: No access token for WebSocket test`);
    return;
  }
  
  group('WebSocket Connection', () => {
    const wsUrl = `ws://localhost:8081/ws?token=${accessTokens[__VU]}`;
    
    const response = ws.connect(wsUrl, {}, function(socket) {
      socket.on('open', () => {
        console.log(`VU ${__VU}: WebSocket connected`);
        wsConnectionRate.add(true);
        
        // Send test message
        socket.send(JSON.stringify({
          type: 'ping',
          timestamp: Date.now(),
        }));
      });
      
      socket.on('message', (data) => {
        console.log(`VU ${__VU}: Received WebSocket message:`, data);
      });
      
      socket.on('error', (error) => {
        console.error(`VU ${__VU}: WebSocket error:`, error);
        wsConnectionRate.add(false);
      });
      
      socket.on('close', () => {
        console.log(`VU ${__VU}: WebSocket closed`);
      });
      
      // Keep connection open for testing
      setTimeout(() => {
        socket.close();
      }, 10000); // 10 seconds
    });
    
    check(response, {
      'websocket connection established': (r) => r !== null,
    });
  });
  
  sleep(1);
}

// Teardown function
export function teardown(data) {
  console.log('Tearing down test environment...');
  
  // Optionally cleanup test data
  // This could include deleting test users, contacts, etc.
  console.log('Test completed successfully');
}

// Handle graceful shutdown
export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: `
================================
PyTake Load Test Summary
================================
Total Requests: ${data.metrics.total_requests.values.count}
Request Rate: ${(data.metrics.total_requests.values.rate).toFixed(2)}/s
Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
Error Rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%

Login Success Rate: ${(data.metrics.login_success_rate?.values.rate * 100 || 0).toFixed(2)}%
Message Success Rate: ${(data.metrics.message_send_success_rate?.values.rate * 100 || 0).toFixed(2)}%
WebSocket Success Rate: ${(data.metrics.websocket_connection_success_rate?.values.rate * 100 || 0).toFixed(2)}%
================================
    `,
  };
}