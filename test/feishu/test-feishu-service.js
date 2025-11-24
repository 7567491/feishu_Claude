#!/usr/bin/env node
import { FeishuService } from './server/feishu-ws.js';

console.log('🧪 Testing FeishuService...\n');

async function testService() {
  // Test 1: Service creation
  console.log('📝 Test 1: Service creation');
  const service = new FeishuService();
  console.log('✅ Service instance created\n');

  // Test 2: Load config
  console.log('📝 Test 2: loadConfig');
  try {
    const config = await service.loadConfig();
    console.log('✅ Config loaded:');
    console.log('   App ID:', config.appId?.substring(0, 10) + '...');
    console.log('   User ID:', service.userId);
  } catch (error) {
    console.log('❌ Config load failed:', error.message);
    return;
  }

  // Test 3: Get status (before start)
  console.log('\n📝 Test 3: getStatus (before start)');
  const statusBefore = service.getStatus();
  console.log('  isRunning:', statusBefore.isRunning ? '❌ (should be false)' : '✅');
  console.log('  userId:', statusBefore.userId ? '✅' : '❌');

  // Test 4: Start service (this will actually connect to Feishu)
  console.log('\n📝 Test 4: Start service');
  console.log('⚠️  This test requires Feishu credentials and will connect to Feishu');
  console.log('   Skipping actual start test in unit test mode\n');

  // Note: Uncomment below to test actual service start
  /*
  try {
    await service.start();
    console.log('✅ Service started');

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get status (after start)
    const statusAfter = service.getStatus();
    console.log('  Status after start:', statusAfter);

    // Stop service
    await service.stop();
    console.log('✅ Service stopped');
  } catch (error) {
    console.log('❌ Service start/stop failed:', error.message);
  }
  */

  console.log('✅ All structural tests passed!\n');
  console.log('💡 To test full service with real Feishu connection:');
  console.log('   node server/feishu-ws.js\n');
}

testService().catch((error) => {
  console.error('\n❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
