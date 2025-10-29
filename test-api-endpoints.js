#!/usr/bin/env node

/**
 * 🧪 Telegram API Endpoint Testing Script
 * Tests all API endpoints with the configured token
 */

const http = require('http');
const handler = require('./api/index.js');

// Set token
process.env.TELEGRAM_BOT_TOKEN = '8223995698:AAHcCFig-Zgci-B7Wib84eyxElibI_jYEsw';

async function testEndpoint(method, path, body) {
  return new Promise((resolve) => {
    const testReq = {
      method,
      url: path,
      body,
      headers: { 'content-type': 'application/json' }
    };

    const testRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      setHeader: function() { return this; },
      json: function(data) {
        resolve({ code: this.statusCode || 200, data });
        return this;
      },
      end: function() {
        resolve({ code: this.statusCode || 200, data: null });
        return this;
      }
    };

    handler(testReq, testRes);
  });
}

async function runTests() {
  console.log('🚀 Testing Telegram API Endpoints\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Health Check
    console.log('\n✅ Test 1: Health Check (GET /api/)');
    const health = await testEndpoint('GET', '/');
    console.log(`Status: ${health.code}`);
    console.log(`Response:`, JSON.stringify(health.data, null, 2));

    // Test 2: getMe
    console.log('\n✅ Test 2: Bot Info - getMe (POST /api/telegram)');
    const getMe = await testEndpoint('POST', '/telegram', { method: 'getMe', params: {} });
    console.log(`Status: ${getMe.code}`);
    if (getMe.data?.ok) {
      console.log(`Bot: ${getMe.data.result.first_name} (@${getMe.data.result.username})`);
      console.log(`Bot ID: ${getMe.data.result.id}`);
    } else {
      console.log(`Response:`, JSON.stringify(getMe.data, null, 2));
    }

    // Test 3: Get Messages/Updates
    console.log('\n✅ Test 3: Get Recent Messages (GET /api/telegram/updates)');
    const updates = await testEndpoint('GET', '/telegram/updates?limit=5');
    console.log(`Status: ${updates.code}`);
    if (updates.data?.messages) {
      console.log(`Messages found: ${updates.data.messages.length}`);
      updates.data.messages.slice(0, 3).forEach((msg, i) => {
        console.log(`  ${i + 1}. ${msg.text.substring(0, 50)}${msg.text.length > 50 ? '...' : ''}`);
      });
    } else {
      console.log(`Response:`, JSON.stringify(updates.data, null, 2));
    }

    // Test 4: Secure Endpoint
    console.log('\n✅ Test 4: Secure Endpoint (POST /api/telegram/secure)');
    const secure = await testEndpoint('POST', '/telegram/secure', { method: 'getMe', params: {} });
    console.log(`Status: ${secure.code}`);
    if (secure.data?.ok) {
      console.log(`✅ Secure endpoint working - Bot: ${secure.data.result.first_name}`);
    } else {
      console.log(`Response:`, JSON.stringify(secure.data, null, 2));
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!\n');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

runTests();
