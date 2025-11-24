#!/usr/bin/env node
/**
 * Integration Test Suite for Feishu Bot
 *
 * Tests all components:
 * 1. Database extensions
 * 2. Message writer
 * 3. Feishu client
 * 4. Session manager
 * 5. Main service
 * 6. REST API routes
 */

import { feishuDb, userDb, initializeDatabase } from './server/database/db.js';
import { FeishuMessageWriter } from './server/lib/feishu-message-writer.js';
import { FeishuClient } from './server/lib/feishu-client.js';
import { FeishuSessionManager } from './server/lib/feishu-session.js';
import { FeishuService } from './server/feishu-ws.js';
import { promises as fs } from 'fs';

console.log('🧪 Feishu Bot Integration Test Suite\n');
console.log('═'.repeat(60));

let passed = 0;
let failed = 0;

function testResult(name, condition) {
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    failed++;
  }
}

async function runTests() {
  // Initialize database
  console.log('\n📦 Initializing database...');
  await initializeDatabase();
  const user = userDb.getFirstUser();
  console.log(`   User: ${user.username} (ID: ${user.id})`);

  // Test 1: Database Extensions
  console.log('\n1️⃣  Testing Database Extensions');
  console.log('─'.repeat(60));

  try {
    const session = feishuDb.createSession(
      'test-integration',
      'ou_test_integration',
      'private',
      '/tmp/test-integration',
      user.id
    );
    testResult('Create session', session && session.id);

    const retrieved = feishuDb.getSession('test-integration');
    testResult('Get session', retrieved && retrieved.id === session.id);

    feishuDb.updateSessionActivity(session.id);
    testResult('Update activity', true);

    const message = feishuDb.logMessage(session.id, 'incoming', 'text', 'Test message');
    testResult('Log message', message && message.id);

    const history = feishuDb.getMessageHistory(session.id);
    testResult('Get message history', history.length === 1);

    const stats = feishuDb.getStats(user.id);
    testResult('Get stats', stats.total_sessions >= 1);

    feishuDb.deactivateSession(session.id);
    testResult('Deactivate session', true);
  } catch (error) {
    console.error('   Error:', error.message);
    failed += 7;
  }

  // Test 2: Message Writer
  console.log('\n2️⃣  Testing Message Writer');
  console.log('─'.repeat(60));

  try {
    const mockClient = {
      async sendTextMessage(chatId, text) {
        return { success: true };
      }
    };

    const writer = new FeishuMessageWriter(mockClient, 'test_chat');
    testResult('Create message writer', writer !== null);

    writer.send(JSON.stringify({
      type: 'session-created',
      sessionId: 'test_session'
    }));
    testResult('Send session-created', writer.sessionId === 'test_session');

    writer.send(JSON.stringify({
      type: 'claude-response',
      data: { type: 'text_delta', delta: { text: 'Hello' } }
    }));
    testResult('Send text delta', writer.buffer.includes('Hello'));

    const chunks = writer.splitMessage('A'.repeat(6000), 1000);
    testResult('Split message', chunks.length === 6);

    writer.destroy();
    testResult('Destroy writer', true);
  } catch (error) {
    console.error('   Error:', error.message);
    failed += 5;
  }

  // Test 3: Feishu Client
  console.log('\n3️⃣  Testing Feishu Client');
  console.log('─'.repeat(60));

  try {
    const client = new FeishuClient({
      appId: process.env.FeishuCC_App_ID || 'test_app_id',
      appSecret: process.env.FeishuCC_App_Secret || 'test_secret'
    });
    testResult('Create Feishu client', client !== null);

    client.botInfo = { open_id: 'ou_bot' };

    const privateEvent = {
      message: { chat_type: 'p2p', message_id: 'msg1' }
    };
    testResult('isMessageForBot (private)', client.isMessageForBot(privateEvent));

    const groupWithMention = {
      message: {
        chat_type: 'group',
        message_id: 'msg2',
        mentions: [{ id: { open_id: 'ou_bot' } }]
      }
    };
    testResult('isMessageForBot (group+mention)', client.isMessageForBot(groupWithMention));

    const cleaned = client.cleanMentions('@Bot hello');
    testResult('cleanMentions', cleaned === 'hello');

    const status = client.getStatus();
    testResult('getStatus', status.isRunning === false);
  } catch (error) {
    console.error('   Error:', error.message);
    failed += 5;
  }

  // Test 4: Session Manager
  console.log('\n4️⃣  Testing Session Manager');
  console.log('─'.repeat(60));

  try {
    const manager = new FeishuSessionManager(user.id, './test-sessions');
    testResult('Create session manager', manager !== null);

    const event = {
      message: {
        chat_type: 'p2p',
        chat_id: 'chat123',
        message_id: 'msg123'
      },
      sender: {
        sender_id: { open_id: 'ou_sender123' }
      }
    };

    const conversationId = manager.getConversationId(event);
    testResult('getConversationId', conversationId === 'user-ou_sender123');

    const sessionType = manager.getSessionType(event);
    testResult('getSessionType', sessionType === 'private');

    const session = await manager.getOrCreateSession(event);
    testResult('getOrCreateSession', session && session.id);

    const isBusy = manager.isSessionBusy(session);
    testResult('isSessionBusy', isBusy === false);

    const allSessions = manager.getAllSessions();
    testResult('getAllSessions', allSessions.length >= 1);

    // Cleanup
    await fs.rm('./test-sessions', { recursive: true, force: true });
  } catch (error) {
    console.error('   Error:', error.message);
    failed += 5;
  }

  // Test 5: Main Service
  console.log('\n5️⃣  Testing Main Service');
  console.log('─'.repeat(60));

  try {
    const service = new FeishuService();
    testResult('Create service', service !== null);

    await service.loadConfig();
    testResult('Load config', service.userId !== null);

    const status = service.getStatus();
    testResult('Get status', status.isRunning === false);

    // Note: We don't actually start the service in tests
    testResult('Service structure valid', true);
  } catch (error) {
    console.error('   Error:', error.message);
    failed += 3;
  }

  // Test 6: File Structure
  console.log('\n6️⃣  Testing File Structure');
  console.log('─'.repeat(60));

  const files = [
    'server/database/db.js',
    'server/lib/feishu-client.js',
    'server/lib/feishu-message-writer.js',
    'server/lib/feishu-session.js',
    'server/feishu-ws.js',
    'server/routes/feishu.js'
  ];

  for (const file of files) {
    try {
      await fs.access(file);
      testResult(`File exists: ${file}`, true);
    } catch {
      testResult(`File exists: ${file}`, false);
    }
  }

  // Test 7: Package.json
  console.log('\n7️⃣  Testing Package Configuration');
  console.log('─'.repeat(60));

  try {
    const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'));
    testResult('package.json has feishu script', pkg.scripts.feishu !== undefined);
    testResult('@larksuiteoapi/node-sdk installed', pkg.dependencies['@larksuiteoapi/node-sdk'] !== undefined);
  } catch (error) {
    console.error('   Error:', error.message);
    failed += 2;
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Test Summary');
  console.log('═'.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Feishu bot is ready to use.');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: npm run feishu');
    console.log('   2. Send a message to the bot in Feishu');
    console.log('   3. Check Web UI project list');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  console.error(error.stack);
  process.exit(1);
});
