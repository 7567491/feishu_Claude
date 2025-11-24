#!/usr/bin/env node
/**
 * Diagnose Feishu WebSocket Connection
 * Tests if events are being received
 */

import lark from '@larksuiteoapi/node-sdk';

const APP_ID = process.env.FeishuCC_App_ID || 'cli_a85b46e11ff6500d';
const APP_SECRET = process.env.FeishuCC_App_Secret || 'GwzMoZf6RMMtJFxBASHYBRbJcwVrCEgN';

console.log('🔬 飞书 WebSocket 连接诊断\n');
console.log('App ID:', APP_ID);
console.log('正在建立连接...\n');

const wsClient = new lark.WSClient({
  appId: APP_ID,
  appSecret: APP_SECRET,
  loggerLevel: lark.LoggerLevel.debug
});

// 创建一个通用的事件处理器
const eventDispatcher = new lark.EventDispatcher({
  loggerLevel: lark.LoggerLevel.debug
});

// 注册所有可能的消息事件
eventDispatcher.register({
  // 消息事件
  'im.message.receive_v1': async (data) => {
    console.log('\n🎉 收到消息事件！');
    console.log('=' .repeat(60));
    console.log('事件类型: im.message.receive_v1');
    console.log('消息 ID:', data.message?.message_id);
    console.log('对话 ID:', data.message?.chat_id);
    console.log('对话类型:', data.message?.chat_type);
    console.log('发送者:', data.sender?.sender_id?.open_id);
    console.log('内容:', data.message?.content);
    console.log('=' .repeat(60));
    return { success: true };
  }
});

// 尝试注册通配符事件（如果支持）
try {
  // 监听所有事件
  const originalRegister = eventDispatcher.register.bind(eventDispatcher);
  eventDispatcher.register = function(handlers) {
    console.log('[诊断] 注册事件处理器:', Object.keys(handlers));
    return originalRegister(handlers);
  };
} catch (err) {
  // Ignore
}

async function start() {
  try {
    console.log('📡 启动 WebSocket 客户端...');
    await wsClient.start({ eventDispatcher });
    console.log('✅ WebSocket 已连接\n');

    console.log('📝 诊断信息:');
    console.log('  1. WebSocket 连接状态: 已建立');
    console.log('  2. EventDispatcher: 已注册');
    console.log('  3. 日志级别: DEBUG');
    console.log('');

    console.log('⏳ 等待接收消息事件...');
    console.log('   请在飞书中给机器人发送消息');
    console.log('   如果 60 秒内没有收到任何事件，说明配置有问题\n');

    // 设置超时检查
    let receivedEvent = false;
    const timeout = setTimeout(() => {
      if (!receivedEvent) {
        console.log('\n❌ 60秒内未收到任何事件！\n');
        console.log('可能的原因：');
        console.log('  1. 飞书开放平台后台未启用"长连接模式"');
        console.log('  2. 事件订阅未配置或配置错误');
        console.log('  3. 应用未安装到当前用户的工作区');
        console.log('  4. 应用权限配置不正确\n');
        console.log('请访问: https://open.feishu.cn/app');
        console.log('检查: 事件订阅 → 连接方式 → 必须选择"长连接"');
        console.log('');
        process.exit(1);
      }
    }, 60000);

    // 拦截事件处理
    const origInvoke = eventDispatcher.invoke.bind(eventDispatcher);
    eventDispatcher.invoke = async function(data) {
      receivedEvent = true;
      clearTimeout(timeout);
      console.log('\n✨ EventDispatcher.invoke 被调用！');
      console.log('数据预览:', JSON.stringify(data, null, 2).substring(0, 300));
      return await origInvoke(data);
    };

  } catch (error) {
    console.error('\n❌ 启动失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 捕获退出信号
process.on('SIGINT', () => {
  console.log('\n\n👋 正在退出...');
  process.exit(0);
});

start();
