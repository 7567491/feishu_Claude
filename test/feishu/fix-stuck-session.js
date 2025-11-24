#!/usr/bin/env node
/**
 * Fix stuck Feishu session by force-cleaning the activeClaudeProcesses Map
 * and optionally killing the stuck process
 */

const sessionId = '84755b35-5478-46c4-8587-5e4b8b5da54a';
const processPid = 1851330;

console.log('🔧 Fixing stuck Feishu session...\n');
console.log('Session ID:', sessionId);
console.log('Process PID:', processPid);
console.log('');

// Option 1: Send abort signal via HTTP API
console.log('Option 1: Try aborting via API');
console.log('  curl -X POST http://localhost:3000/api/claude/abort -H "Content-Type: application/json" -d \'{"sessionId": "' + sessionId + '"}\'');
console.log('');

// Option 2: Kill the process directly
console.log('Option 2: Kill the stuck process');
console.log('  kill -TERM ' + processPid);
console.log('  kill -TERM ' + (processPid + 7)); // child process
console.log('');

// Option 3: Restart the service
console.log('Option 3: Restart claude-code-ui service (will clear all active sessions)');
console.log('  pm2 restart claude-code-ui');
console.log('');

// Check current status
const { spawn } = require('child_process');
const checkProcess = spawn('ps', ['-p', processPid.toString(), '-o', 'pid,etime,stat']);

checkProcess.stdout.on('data', (data) => {
  console.log('Current process status:');
  console.log(data.toString());
});

checkProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Process is still running');
    console.log('');
    console.log('Execute one of the options above to fix the issue.');
  } else {
    console.log('ℹ️  Process already terminated');
  }
});
