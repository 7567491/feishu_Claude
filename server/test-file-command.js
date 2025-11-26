#!/usr/bin/env node
/**
 * Test file command parsing
 */

import { FeishuFileHandler } from './lib/feishu-file-handler.js';

const testCases = [
  { input: '发送 spiff.md', expected: 'spiff.md' },
  { input: '给我 spiff.md', expected: 'spiff.md' },
  { input: '把 spiff.md 发给我', expected: 'spiff.md' },
  { input: 'send spiff.md', expected: 'spiff.md' },
  { input: 'spiff.md', expected: 'spiff.md' },
  { input: '发送 FILE_SEND_GUIDE.md', expected: 'FILE_SEND_GUIDE.md' },
  { input: '传 test.pdf', expected: 'test.pdf' },
  { input: 'hello world', expected: null },
  { input: '发送', expected: null },
];

console.log('🧪 Testing file command parsing...\n');

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = FeishuFileHandler.parseFileCommand(testCase.input);
  const fileName = result ? result.fileName : null;
  const success = fileName === testCase.expected;

  if (success) {
    console.log(`✅ "${testCase.input}" → ${fileName || 'null'}`);
    passed++;
  } else {
    console.log(`❌ "${testCase.input}" → Expected: ${testCase.expected}, Got: ${fileName}`);
    failed++;
  }
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All tests passed!\n');
} else {
  console.log('❌ Some tests failed\n');
  process.exit(1);
}
