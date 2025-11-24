#!/usr/bin/env node
import { feishuDb, userDb, initializeDatabase } from './server/database/db.js';

console.log('🧪 Testing Feishu Database Extensions...\n');

try {
  // Initialize database
  await initializeDatabase();
  console.log('✅ Database initialized');

  // Get first user for testing
  const user = userDb.getFirstUser();
  if (!user) {
    console.log('❌ No user found. Please create a user first.');
    process.exit(1);
  }
  console.log(`✅ Using user: ${user.username} (ID: ${user.id})`);

  // Test creating a session
  console.log('\n📝 Testing createSession...');
  const testSession = feishuDb.createSession(
    'test-user-123',
    'ou_test123',
    'private',
    './feicc/test-user-123',
    user.id
  );
  console.log('✅ Session created:', testSession);

  // Test getting session
  console.log('\n🔍 Testing getSession...');
  const retrieved = feishuDb.getSession('test-user-123');
  console.log('✅ Session retrieved:', retrieved);

  // Test logging a message
  console.log('\n💬 Testing logMessage...');
  const message = feishuDb.logMessage(
    testSession.id,
    'incoming',
    'text',
    'Hello from test',
    'msg_test123'
  );
  console.log('✅ Message logged:', message);

  // Test updating activity
  console.log('\n⏰ Testing updateSessionActivity...');
  feishuDb.updateSessionActivity(testSession.id);
  console.log('✅ Activity updated');

  // Test getting all sessions
  console.log('\n📋 Testing getAllSessions...');
  const allSessions = feishuDb.getAllSessions(user.id);
  console.log(`✅ Found ${allSessions.length} session(s)`);

  // Test getting stats
  console.log('\n📊 Testing getStats...');
  const stats = feishuDb.getStats(user.id);
  console.log('✅ Stats:', stats);

  // Test getting message history
  console.log('\n📜 Testing getMessageHistory...');
  const history = feishuDb.getMessageHistory(testSession.id);
  console.log(`✅ Found ${history.length} message(s)`);

  // Cleanup test data
  console.log('\n🧹 Cleaning up test data...');
  feishuDb.deactivateSession(testSession.id);
  console.log('✅ Test session deactivated');

  console.log('\n🎉 All tests passed! Database extension successful.\n');
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
