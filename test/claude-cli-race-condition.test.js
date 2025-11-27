/**
 * Test for Race Condition in Claude CLI Session Management
 *
 * 测试场景：验证并发请求是否会导致 "exit code null" 错误
 */

import { queryClaude, isClaudeSessionActive } from '../server/claude-cli.js';
import { strict as assert } from 'assert';

/**
 * 模拟 WebSocket writer
 */
class MockWriter {
  constructor() {
    this.messages = [];
    this.sessionId = null;
  }

  send(data) {
    const message = JSON.parse(data);
    this.messages.push(message);
    console.log('[MockWriter] Received:', message.type);
  }

  setSessionId(sessionId) {
    this.sessionId = sessionId;
    console.log('[MockWriter] Session ID set:', sessionId);
  }

  getMessages(type) {
    return this.messages.filter(m => m.type === type);
  }

  getErrors() {
    return this.messages.filter(m => m.type === 'claude-error');
  }
}

/**
 * 测试 1：验证竞态条件
 *
 * 假设：两个并发请求尝试 resume 同一个 session 时，
 * 第二个请求会因为 Claude CLI 检测到冲突而被中断
 */
async function testConcurrentRequestsToSameSession() {
  console.log('\n=== Test 1: Concurrent Requests to Same Session ===\n');

  const sessionId = 'test-session-' + Date.now();
  const writer1 = new MockWriter();
  const writer2 = new MockWriter();

  const cwd = '/home/ccp/feicc/group-test';

  try {
    // 启动第一个请求
    const promise1 = queryClaude('test message 1', {
      sessionId: null,  // 新会话
      cwd,
      skipPermissions: true
    }, writer1);

    // 等待 100ms 让第一个请求启动
    await new Promise(resolve => setTimeout(resolve, 100));

    // 检查第一个会话是否被注册为活动
    const capturedSessionId = writer1.sessionId;
    console.log('First session ID:', capturedSessionId);

    if (capturedSessionId) {
      const isActive = isClaudeSessionActive(capturedSessionId);
      console.log('Is first session active:', isActive);
      assert.ok(isActive, 'First session should be active');

      // 启动第二个请求，尝试 resume 相同的 session
      const promise2 = queryClaude('test message 2', {
        sessionId: capturedSessionId,  // resume 相同会话
        cwd,
        skipPermissions: true
      }, writer2);

      // 等待两个请求完成或失败
      const results = await Promise.allSettled([promise1, promise2]);

      console.log('\nResults:');
      console.log('Promise 1:', results[0].status, results[0].reason?.message || 'success');
      console.log('Promise 2:', results[1].status, results[1].reason?.message || 'success');

      // 验证：至少有一个请求应该失败
      const hasFailure = results.some(r => r.status === 'rejected');
      const hasNullExitCode = results.some(r =>
        r.status === 'rejected' && r.reason?.message?.includes('exit code null')
      );

      console.log('\nAssertion checks:');
      console.log('Has failure:', hasFailure);
      console.log('Has null exit code:', hasNullExitCode);

      // 假设 1 验证：如果有 null exit code 错误，说明存在竞态条件
      if (hasNullExitCode) {
        console.log('✓ Hypothesis 1 CONFIRMED: Race condition detected');
        console.log('  Concurrent requests to same session cause "exit code null" error');
      } else {
        console.log('✗ Hypothesis 1 NOT CONFIRMED: No null exit code error');
      }

      return { hasFailure, hasNullExitCode };
    } else {
      console.log('Warning: Could not capture session ID from first request');
      await promise1.catch(() => {});
      return { hasFailure: false, hasNullExitCode: false };
    }

  } catch (error) {
    console.error('Test error:', error.message);
    return { hasFailure: true, hasNullExitCode: error.message?.includes('exit code null') };
  }
}

/**
 * 测试 2：验证 signal 处理缺失
 *
 * 假设：close 事件没有处理 signal 参数，
 * 导致被信号终止的进程报告 "exit code null"
 */
async function testSignalHandling() {
  console.log('\n=== Test 2: Signal Handling ===\n');

  const writer = new MockWriter();
  const cwd = '/home/ccp/feicc/group-test';

  try {
    // 启动一个长时间运行的请求
    const promise = queryClaude('Write a very long essay about nodejs', {
      sessionId: null,
      cwd,
      skipPermissions: true
    }, writer);

    // 等待会话启动
    await new Promise(resolve => setTimeout(resolve, 500));

    const sessionId = writer.sessionId;
    if (sessionId && isClaudeSessionActive(sessionId)) {
      console.log('Session started:', sessionId);

      // 模拟发送 SIGTERM（通过调用 abort）
      const { abortClaudeSession } = await import('../server/claude-cli.js');
      const aborted = abortClaudeSession(sessionId);
      console.log('Abort called:', aborted);

      // 等待 promise reject
      try {
        await promise;
        console.log('✗ Hypothesis 5 NOT CONFIRMED: Promise did not reject');
        return { signalDetected: false, hasNullExitCode: false };
      } catch (error) {
        console.log('Promise rejected:', error.message);

        const hasNullExitCode = error.message?.includes('exit code null');
        const hasSignalInfo = error.message?.includes('SIGTERM') || error.message?.includes('signal');

        console.log('\nAssertion checks:');
        console.log('Has null exit code:', hasNullExitCode);
        console.log('Has signal info:', hasSignalInfo);

        // 假设 5 验证
        if (hasNullExitCode && !hasSignalInfo) {
          console.log('✓ Hypothesis 5 CONFIRMED: Signal not properly handled');
          console.log('  Error message lacks signal information');
        } else if (hasSignalInfo) {
          console.log('✗ Hypothesis 5 NOT CONFIRMED: Signal IS handled');
        }

        return { signalDetected: hasSignalInfo, hasNullExitCode };
      }
    } else {
      console.log('Warning: Session did not start');
      await promise.catch(() => {});
      return { signalDetected: false, hasNullExitCode: false };
    }

  } catch (error) {
    console.error('Test error:', error.message);
    return { signalDetected: false, hasNullExitCode: false };
  }
}

/**
 * 测试 3：验证 busy 检查的时序
 *
 * 假设：activeClaudeProcesses.set() 在进程启动后才调用，
 * 存在竞态窗口
 */
async function testBusyCheckTiming() {
  console.log('\n=== Test 3: Busy Check Timing ===\n');

  const { getActiveClaudeSessions } = await import('../server/claude-cli.js');

  console.log('Active sessions before:', getActiveClaudeSessions());

  const writer = new MockWriter();
  const cwd = '/home/ccp/feicc/group-test';

  // 启动请求但不 await
  const promise = queryClaude('test', {
    sessionId: null,
    cwd,
    skipPermissions: true
  }, promise);

  // 立即检查是否已注册
  const activeSessions1 = getActiveClaudeSessions();
  console.log('Active sessions immediately after call:', activeSessions1);

  // 等待 50ms
  await new Promise(resolve => setTimeout(resolve, 50));
  const activeSessions2 = getActiveClaudeSessions();
  console.log('Active sessions after 50ms:', activeSessions2);

  // 等待 100ms
  await new Promise(resolve => setTimeout(resolve, 50));
  const activeSessions3 = getActiveClaudeSessions();
  console.log('Active sessions after 100ms:', activeSessions3);

  // 清理
  await promise.catch(() => {});

  // 验证：如果进程不是立即注册，说明存在竞态窗口
  const hasRaceWindow = activeSessions1.length === 0 && activeSessions3.length > 0;

  if (hasRaceWindow) {
    console.log('✓ Hypothesis 1 CONFIRMED: Race window exists');
    console.log('  Process is not registered immediately after spawn');
  } else {
    console.log('✗ Hypothesis 1 NOT CONFIRMED: No race window detected');
  }

  return { hasRaceWindow };
}

// 运行所有测试
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Claude CLI Race Condition Test Suite                 ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const results = {};

  try {
    results.test1 = await testConcurrentRequestsToSameSession();
  } catch (error) {
    console.error('Test 1 failed:', error);
    results.test1 = { error: error.message };
  }

  try {
    results.test2 = await testSignalHandling();
  } catch (error) {
    console.error('Test 2 failed:', error);
    results.test2 = { error: error.message };
  }

  try {
    results.test3 = await testBusyCheckTiming();
  } catch (error) {
    console.error('Test 3 failed:', error);
    results.test3 = { error: error.message };
  }

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  Test Results Summary                                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log(JSON.stringify(results, null, 2));

  process.exit(0);
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { testConcurrentRequestsToSameSession, testSignalHandling, testBusyCheckTiming };
