#!/usr/bin/env node
/**
 * Test script for auto file send functionality
 *
 * This script simulates file changes and tests the auto-send feature
 */

import { FeishuFileWatcher } from './lib/feishu-file-watcher.js';
import fs from 'fs';
import path from 'path';

// Mock Feishu client
class MockFeishuClient {
  constructor() {
    this.sentFiles = [];
  }

  async sendTextMessage(chatId, text) {
    console.log(`[MockClient] Send text to ${chatId}:`, text);
  }

  async sendFile(chatId, filePath) {
    console.log(`[MockClient] Send file to ${chatId}:`, filePath);
    this.sentFiles.push({ chatId, filePath, time: Date.now() });
  }
}

async function test() {
  console.log('🧪 Testing Auto File Send Functionality\n');

  // Create test directory
  const testDir = path.resolve(process.cwd(), 'test-auto-send-temp');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }
  console.log('📁 Test directory:', testDir);

  // Create mock client
  const mockClient = new MockFeishuClient();

  // Create file watcher
  const watcher = new FeishuFileWatcher(testDir, {
    enabled: true,
    debounceDelay: 1000 // Shorter delay for testing
  });

  watcher.setClient(mockClient);
  watcher.setActiveChatId('test_chat_123');
  watcher.start();

  console.log('👀 File watcher started');
  console.log('⏳ Waiting for watcher to be ready...\n');

  // Wait for watcher to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 1: Create new file
  console.log('Test 1: Creating new file...');
  const testFile1 = path.join(testDir, 'test1.md');
  fs.writeFileSync(testFile1, '# Test 1\nThis is a test file');

  // Wait for debounce
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Modify file
  console.log('\nTest 2: Modifying file...');
  fs.appendFileSync(testFile1, '\n\n## Updated content');

  // Wait for debounce
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Create another file
  console.log('\nTest 3: Creating second file...');
  const testFile2 = path.join(testDir, 'test2.md');
  fs.writeFileSync(testFile2, '# Test 2\nAnother test file');

  // Wait for debounce
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 4: Rapid edits (should only send once)
  console.log('\nTest 4: Rapid edits (should debounce)...');
  for (let i = 0; i < 5; i++) {
    fs.appendFileSync(testFile1, `\nEdit ${i}`);
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Wait for debounce
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Stop watcher
  await watcher.stop();
  console.log('\n👋 File watcher stopped');

  // Show results
  console.log('\n📊 Results:');
  console.log(`   Total files sent: ${mockClient.sentFiles.length}`);
  console.log('   Files:');
  for (const sent of mockClient.sentFiles) {
    console.log(`     - ${path.basename(sent.filePath)}`);
  }

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  fs.rmSync(testDir, { recursive: true, force: true });

  console.log('\n✅ Test completed!\n');
}

// Run test
test().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
