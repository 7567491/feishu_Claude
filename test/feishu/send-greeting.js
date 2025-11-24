#!/usr/bin/env node
/**
 * Send greeting message to a Feishu user or group
 * Usage: node send-greeting.js <receive_id>
 */

import lark from '@larksuiteoapi/node-sdk';

const APP_ID = process.env.FeishuCC_App_ID || 'cli_a85b46e11ff6500d';
const APP_SECRET = process.env.FeishuCC_App_Secret || 'GwzMoZf6RMMtJFxBASHYBRbJcwVrCEgN';

// Get receive_id from command line argument
const receiveId = process.argv[2];

if (!receiveId) {
  console.log('❌ 缺少接收方 ID');
  console.log('\n使用方法:');
  console.log('  node send-greeting.js <receive_id>');
  console.log('\n示例:');
  console.log('  node send-greeting.js ou_xxxxx    # 发送给用户');
  console.log('  node send-greeting.js oc_xxxxx    # 发送给群组');
  console.log('\n💡 提示：');
  console.log('  1. 先在飞书中给机器人发送一条消息');
  console.log('  2. 查看日志获取你的 open_id:');
  console.log('     tail -f /tmp/feishu.log | grep "Sender:"');
  process.exit(1);
}

console.log('📤 准备发送问候消息...\n');

const client = new lark.Client({
  appId: APP_ID,
  appSecret: APP_SECRET,
  domain: lark.Domain.Feishu
});

async function sendGreeting() {
  try {
    // 判断接收方类型
    const receiveIdType = receiveId.startsWith('oc_') ? 'chat_id' : 'open_id';
    console.log(`接收方 ID: ${receiveId}`);
    console.log(`接收方类型: ${receiveIdType}`);
    console.log(`消息内容: "你好，我是 CC"\n`);

    const res = await client.im.message.create({
      params: {
        receive_id_type: receiveIdType
      },
      data: {
        receive_id: receiveId,
        content: JSON.stringify({ text: '你好，我是 CC' }),
        msg_type: 'text'
      }
    });

    if (res.code === 0) {
      console.log('✅ 消息发送成功！');
      console.log('消息 ID:', res.data.message_id);
      console.log('发送时间:', new Date(res.data.create_time * 1000).toLocaleString('zh-CN'));
    } else {
      console.log('❌ 消息发送失败:');
      console.log('错误码:', res.code);
      console.log('错误信息:', res.msg);
    }
  } catch (error) {
    console.log('❌ 发送失败:', error.message);
    if (error.response) {
      console.log('响应详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

sendGreeting();
