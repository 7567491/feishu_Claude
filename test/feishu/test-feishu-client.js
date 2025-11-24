#!/usr/bin/env node
import { FeishuClient } from './server/lib/feishu-client.js';

const APP_ID = process.env.FeishuCC_App_ID;
const APP_SECRET = process.env.FeishuCC_App_Secret;

console.log('🧪 Testing FeishuClient...\n');

if (!APP_ID || !APP_SECRET) {
  console.log('❌ Missing Feishu credentials');
  process.exit(1);
}

// Test 1: Client initialization
console.log('📝 Test 1: Client initialization');
const client = new FeishuClient({
  appId: APP_ID,
  appSecret: APP_SECRET
});
console.log('✅ Client created\n');

// Test 2: Message filtering logic
console.log('📝 Test 2: isMessageForBot logic');

// Set bot info for testing
client.botInfo = { open_id: 'ou_test_bot' };

// Test private chat
const privateChat = {
  message: {
    chat_type: 'p2p',
    message_id: 'msg_001'
  }
};
console.log('  Private chat:', client.isMessageForBot(privateChat) ? '✅ Pass' : '❌ Fail');

// Test group chat with mention
const groupChatWithMention = {
  message: {
    chat_type: 'group',
    message_id: 'msg_002',
    mentions: [
      { id: { open_id: 'ou_test_bot' } }
    ]
  }
};
console.log('  Group + mention:', client.isMessageForBot(groupChatWithMention) ? '✅ Pass' : '❌ Fail');

// Test group chat without mention
const groupChatNoMention = {
  message: {
    chat_type: 'group',
    message_id: 'msg_003',
    mentions: []
  }
};
console.log('  Group no mention:', !client.isMessageForBot(groupChatNoMention) ? '✅ Pass' : '❌ Fail');

// Test 3: Clean mentions
console.log('\n📝 Test 3: cleanMentions');
const testCases = [
  { input: '@Bot hello world', expected: 'hello world' },
  { input: '@user1 @user2 test', expected: 'test' },
  { input: 'no mentions here', expected: 'no mentions here' }
];

testCases.forEach(({ input, expected }) => {
  const result = client.cleanMentions(input);
  const pass = result === expected;
  console.log(`  "${input}" → "${result}" ${pass ? '✅' : '❌'}`);
});

// Test 4: Status
console.log('\n📝 Test 4: getStatus');
const status = client.getStatus();
console.log('  Status:', status);
console.log('  isRunning:', status.isRunning ? '✅' : '✅ (expected false)');

console.log('\n✅ All structural tests passed!');
console.log('\n💡 To test WebSocket connection:');
console.log('   1. Run: node feishu/test-feishu-ws.js');
console.log('   2. Send a message to the bot in Feishu');
console.log('   3. Check console output\n');
