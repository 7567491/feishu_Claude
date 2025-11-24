#!/usr/bin/env node
import { FeishuMessageWriter } from './server/lib/feishu-message-writer.js';

console.log('🧪 Testing FeishuMessageWriter...\n');

// Mock Feishu client
const mockFeishuClient = {
  async sendTextMessage(chatId, text) {
    console.log(`📤 [Mock] Sending to ${chatId}:`);
    console.log(`   Length: ${text.length} chars`);
    console.log(`   Preview: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
    return { success: true };
  }
};

async function testMessageWriter() {
  const writer = new FeishuMessageWriter(mockFeishuClient, 'test_chat_123');

  // Test 1: Session created
  console.log('\n📝 Test 1: Session created');
  writer.send(JSON.stringify({
    type: 'session-created',
    sessionId: 'test_session_001',
    model: 'claude-3-sonnet',
    cwd: '/test/path'
  }));

  // Test 2: Assistant text delta (streaming)
  console.log('\n📝 Test 2: Text delta (streaming)');
  writer.send(JSON.stringify({
    type: 'claude-response',
    data: {
      type: 'text_delta',
      delta: { text: 'Hello ' }
    }
  }));

  writer.send(JSON.stringify({
    type: 'claude-response',
    data: {
      type: 'text_delta',
      delta: { text: 'from ' }
    }
  }));

  writer.send(JSON.stringify({
    type: 'claude-response',
    data: {
      type: 'text_delta',
      delta: { text: 'Claude!' }
    }
  }));

  // Test 3: Long message (should trigger split)
  console.log('\n📝 Test 3: Long message (split test)');
  const longText = 'A'.repeat(6000); // Exceeds 5000 char limit
  writer.send(JSON.stringify({
    type: 'claude-response',
    data: {
      type: 'text_delta',
      delta: { text: longText }
    }
  }));

  // Force flush
  await writer.flush();

  // Test 4: Complete
  console.log('\n📝 Test 4: Complete');
  await writer.complete();

  // Test 5: Split message function
  console.log('\n📝 Test 5: Split message function');
  const testText = 'Line 1\nLine 2\nLine 3\n' + 'X'.repeat(5000);
  const chunks = writer.splitMessage(testText, 100);
  console.log(`   Split ${testText.length} chars into ${chunks.length} chunks`);
  chunks.forEach((chunk, i) => {
    console.log(`   Chunk ${i + 1}: ${chunk.length} chars`);
  });

  // Cleanup
  writer.destroy();

  console.log('\n✅ All tests completed!\n');
}

testMessageWriter().catch(console.error);
