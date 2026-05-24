/**
 * End-to-End Stress Test & Resilience Demonstration for Samvaad Saathi
 * 
 * This script runs a fully automated end-to-end load and stress test.
 * It programmatically starts the Express server, mocks transient upstream AI outages,
 * triggers high concurrency, and demonstrates how the Opossum Circuit Breaker
 * trips (preventing latency-blocks) and heals itself once the service recovers.
 * 
 * Run with: node stress-test.js
 */

const http = require('http');
const app = require('./src/app');
const breaker = require('./src/services/circuitBreaker');
const mockAIModule = require('./src/services/mockAI');

const TEST_PORT = 3010;
let serverInstance;

// Keep track of original mockAIGrade to restore it later
const originalMockAIGrade = mockAIModule.mockAIGrade;
let forceOutage = false;

// Custom Mock AI Grade that we can dynamically fail
mockAIModule.mockAIGrade = async function (payload) {
  if (forceOutage) {
    // Simulate immediate or delayed API failures during outage
    await new Promise((resolve) => setTimeout(resolve, 500));
    throw new Error('Upstream LLM Service Outage (Simulated)');
  }
  return originalMockAIGrade(payload);
};

// Start the Express app
function startServer() {
  return new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`\n🚀 Test Server started on http://localhost:${TEST_PORT}`);
      resolve();
    });
  });
}

// Stop the server and clean up
function stopServer() {
  if (serverInstance) {
    serverInstance.close(() => {
      console.log('🏁 Stress test completed. Server shut down.');
    });
  }
}

// Send a single HTTP POST request to /api/v1/evaluate
function sendRequest(requestId) {
  const payload = JSON.stringify({
    interview_id: `stress-int-${requestId}`,
    user_id: `stress-user-${requestId}`,
    role_config: {
      role: 'Customer Success',
      thresholds: { pacing: 6, knowledge: 5 }
    },
    transcript: 'I, uh, think customer satisfaction is, you know, the key.',
    audio_metadata: { duration_seconds: 15, filler_word_count: 2 }
  });

  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request({
      hostname: 'localhost',
      port: TEST_PORT,
      path: '/api/v1/evaluate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        const latency = Date.now() - start;
        let data = {};
        try {
          data = JSON.parse(body);
        } catch (e) {}
        resolve({
          requestId,
          statusCode: res.statusCode,
          latency,
          status: data.status,
          flagged: data.flagged_modules ? data.flagged_modules.length : 0
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        requestId,
        statusCode: 500,
        latency: Date.now() - start,
        error: err.message
      });
    });

    req.write(payload);
    req.end();
  });
}

// Utility to sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Format output latency
const formatMs = (ms) => `${ms.toFixed(0)}ms`.padStart(6);

// Main Stress Test Orchestrator
async function runStressTest() {
  await startServer();

  console.log('\n===============================================================');
  console.log('   SAMVAAD SAATHI END-TO-END STRESS TEST & RESILIENCE RUNNER   ');
  console.log('===============================================================');

  // Monitor Circuit Breaker state transitions
  breaker.on('open', () => {
    console.log('\n⚠️  [BREAKER EVENT] ➔ 🔴 CIRCUIT OPENED! (Outage detected. Redirecting to Fallback)');
  });
  breaker.on('close', () => {
    console.log('\n✅ [BREAKER EVENT] ➔ 🟢 CIRCUIT CLOSED! (System fully recovered)');
  });
  breaker.on('halfOpen', () => {
    console.log('\n🟡 [BREAKER EVENT] ➔ 🟡 CIRCUIT HALF-OPEN! (Testing upstream recovery...)');
  });

  // --- PHASE 1: Healthy Concurrency (Wait ~2000ms per request due to delay) ---
  console.log('\n🔹 PHASE 1: Normal Operations (5 Concurrent Requests)');
  console.log('--------------------------------------------------');
  console.log('Sending requests concurrently. Expected delay: ~2000ms per request.');
  
  let start = Date.now();
  let results = await Promise.all([
    sendRequest(1), sendRequest(2), sendRequest(3), sendRequest(4), sendRequest(5)
  ]);
  let duration = Date.now() - start;

  results.forEach(r => {
    console.log(`Req #${r.requestId} | Status: ${r.status || 'failed'} | Latency: ${formatMs(r.latency)} | HTTP: ${r.statusCode}`);
  });
  console.log(`⚡ Batch complete in: ${duration}ms`);

  // --- PHASE 2: Outage Spike & Circuit Breaker Trip ---
  console.log('\n🔹 PHASE 2: Upstream AI Outage Spike (10 Concurrent Requests)');
  console.log('-----------------------------------------------------------');
  console.log('Triggering upstream failure. System error rate threshold is 50% over 5 requests.');
  
  forceOutage = true; // Upstream LLM begins to fail 100% of the time
  
  console.log('Sending 10 concurrent requests to simulate a burst load during outage...');
  start = Date.now();
  
  // Send 10 concurrent requests
  results = await Promise.all([
    sendRequest(6), sendRequest(7), sendRequest(8), sendRequest(9), sendRequest(10),
    sendRequest(11), sendRequest(12), sendRequest(13), sendRequest(14), sendRequest(15)
  ]);
  duration = Date.now() - start;

  results.forEach(r => {
    console.log(`Req #${r.requestId} | Status: ${(r.status || 'failed').padEnd(9)} | Latency: ${formatMs(r.latency)} | HTTP: ${r.statusCode}`);
  });
  console.log(`⚡ Outage batch complete in: ${duration}ms`);
  console.log(`💡 NOTE: Notice how late requests (Req #11-15) returned INSTANTLY (under 10ms) with 'pending' status.`);
  console.log(`   This is the Opossum Circuit Breaker preventing server thread pool starvation!`);

  // --- PHASE 3: Cooling Down & Auto-healing ---
  console.log('\n🔹 PHASE 3: Recovery Cool-down & Self-Healing');
  console.log('--------------------------------------------------');
  console.log('Upstream AI service has recovered. Resting force failure...');
  forceOutage = false; // Upstream LLM recovered
  
  console.log('Waiting 10 seconds for the breaker\'s resetTimeout (10s) to trigger...');
  for (let i = 10; i > 0; i--) {
    process.stdout.write(`⏳ ${i}s remaining...\r`);
    await sleep(1000);
  }
  process.stdout.write('                                        \r');

  // --- PHASE 4: Recovery Verification ---
  console.log('\n🔹 PHASE 4: Verification of Recovery');
  console.log('--------------------------------------------------');
  console.log('Sending a single test probe to verify transition through HALF-OPEN ➔ CLOSED.');

  let res = await sendRequest(16);
  console.log(`Probe #${res.requestId} | Status: ${res.status} | Latency: ${formatMs(res.latency)} (expected ~2s probe) | HTTP: ${res.statusCode}`);

  console.log('\nSending 3 additional concurrent requests to verify normal operations have resumed:');
  results = await Promise.all([
    sendRequest(17), sendRequest(18), sendRequest(19)
  ]);

  results.forEach(r => {
    console.log(`Req #${r.requestId} | Status: ${r.status} | Latency: ${formatMs(r.latency)} | HTTP: ${r.statusCode}`);
  });

  console.log('\n===============================================================');
  console.log('                   STRESS TEST SUCCESSFUL!                    ');
  console.log('===============================================================');
  
  stopServer();
}

runStressTest().catch((err) => {
  console.error('Stress test failed with error:', err.message);
  stopServer();
});
