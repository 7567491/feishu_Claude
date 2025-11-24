#!/usr/bin/env node
import { FeishuSessionManager } from './server/lib/feishu-session.js';
import { userDb, initializeDatabase } from './server/database/db.js';
import { promises as fs } from 'fs';

console.log('🧪 Testing FeishuSessionManager...\n');

async function cleanup() {
  // Clean up test directories
  try {
    await fs.rm('./feicc-test', { recursive: true, force: true });
  } catch (error) {
    // Ignore errors
  }
}

async function testSessionManager() {
  // Initialize database
  await initializeDatabase();

  // Get user
  const user = userDb.getFirstUser();
  if (!user) {
    console.log('❌ No user found');
    return;
  }

  // Create session manager
  const manager = new FeishuSessionManager(user.id, './feicc-test');
  console.log('✅ SessionManager created\n');

  // Test 1: getConversationId
  console.log('📝 Test 1: getConversationId');
  const privateEvent = {
    message: {
      chat_type: 'p2p',
      message_id: 'msg_001'
    },
    sender: {
      sender_id: {
        open_id: 'ou_test123'
      }
    }
  };

  const groupEvent = {
    message: {
      chat_type: 'group',
      chat_id: 'oc_test456',
      message_id: 'msg_002'
    },
    sender: {
      sender_id: {
        open_id: 'ou_test789'
      }
    }
  };

  const conversationId1 = manager.getConversationId(privateEvent);
  console.log('  Private chat:', conversationId1);
  console.log('  Expected: user-ou_test123');
  console.log('  Result:', conversationId1 === 'user-ou_test123' ? '✅' : '❌');

  const conversationId2 = manager.getConversationId(groupEvent);
  console.log('  Group chat:', conversationId2);
  console.log('  Expected: group-oc_test456');
  console.log('  Result:', conversationId2 === 'group-oc_test456' ? '✅' : '❌\n');

  // Test 2: getSessionType
  console.log('\n📝 Test 2: getSessionType');
  const sessionType1 = manager.getSessionType(privateEvent);
  const sessionType2 = manager.getSessionType(groupEvent);
  console.log('  Private:', sessionType1, sessionType1 === 'private' ? '✅' : '❌');
  console.log('  Group:', sessionType2, sessionType2 === 'group' ? '✅' : '❌');

  // Test 3: getOrCreateSession
  console.log('\n📝 Test 3: getOrCreateSession');
  console.log('  Creating first session...');
  const session1 = await manager.getOrCreateSession(privateEvent);
  console.log('  ✅ Session created:', {
    id: session1.id,
    conversationId: session1.conversationId || session1.conversation_id,
    sessionType: session1.sessionType || session1.session_type,
    projectPath: session1.projectPath || session1.project_path
  });

  // Test 4: Get existing session
  console.log('\n📝 Test 4: Get existing session');
  console.log('  Getting same session again...');
  const session2 = await manager.getOrCreateSession(privateEvent);
  console.log('  Session ID match:', session1.id === session2.id ? '✅' : '❌');

  // Test 5: Directory creation
  console.log('\n📝 Test 5: Directory creation');
  const dirExists = await fs.access(session1.projectPath || session1.project_path)
    .then(() => true)
    .catch(() => false);
  console.log('  Directory exists:', dirExists ? '✅' : '❌');

  // Test 6: isSessionBusy
  console.log('\n📝 Test 6: isSessionBusy');
  const isBusy = manager.isSessionBusy(session1);
  console.log('  Session busy (should be false):', !isBusy ? '✅' : '❌');

  // Test 7: getAllSessions
  console.log('\n📝 Test 7: getAllSessions');
  const allSessions = manager.getAllSessions();
  console.log('  Total sessions:', allSessions.length);
  console.log('  Has our session:', allSessions.some(s => s.id === session1.id) ? '✅' : '❌');

  // Test 8: getStats
  console.log('\n📝 Test 8: getStats');
  const stats = manager.getStats();
  console.log('  Stats:', stats);
  console.log('  Has sessions:', stats.total_sessions > 0 ? '✅' : '❌');

  console.log('\n✅ All tests completed!');
  console.log('\n🧹 Cleaning up test data...');
  await cleanup();
  console.log('✅ Cleanup done\n');
}

testSessionManager().catch((error) => {
  console.error('\n❌ Test failed:', error.message);
  console.error(error.stack);
  cleanup().finally(() => process.exit(1));
});
