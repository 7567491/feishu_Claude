#!/usr/bin/env node
/**
 * Check Feishu App Configuration
 */

import lark from '@larksuiteoapi/node-sdk';

const APP_ID = process.env.FeishuCC_App_ID || 'cli_a85b46e11ff6500d';
const APP_SECRET = process.env.FeishuCC_App_Secret || 'GwzMoZf6RMMtJFxBASHYBRbJcwVrCEgN';

console.log('🔍 检查飞书应用配置\n');
console.log('App ID:', APP_ID);
console.log('App Secret:', APP_SECRET.substring(0, 10) + '...\n');

const client = new lark.Client({
  appId: APP_ID,
  appSecret: APP_SECRET,
  domain: lark.Domain.Feishu
});

async function checkConfig() {
  try {
    // 1. 检查 Token
    console.log('📌 1. 检查应用凭证...');
    const tokenRes = await client.auth.tenantAccessToken.internal({
      data: {
        app_id: APP_ID,
        app_secret: APP_SECRET
      }
    });

    if (tokenRes.code === 0) {
      console.log('✅ 凭证有效');
      console.log('   Token:', tokenRes.tenant_access_token.substring(0, 20) + '...\n');
    } else {
      console.log('❌ 凭证无效');
      console.log('   错误:', tokenRes.msg);
      return;
    }

    // 2. 检查机器人信息
    console.log('📌 2. 获取机器人信息...');
    try {
      const botRes = await client.bot.v3.botInfo({});
      if (botRes.code === 0) {
        console.log('✅ 机器人信息:');
        console.log('   名称:', botRes.data?.bot?.app_name);
        console.log('   Open ID:', botRes.data?.bot?.open_id);
        console.log('   状态:', botRes.data?.bot?.status === 2 ? '已启用' : '未启用');
      }
    } catch (err) {
      console.log('⚠️  无法获取机器人信息:', err.message);
    }
    console.log('');

    // 3. 提示配置步骤
    console.log('📌 3. 长连接模式配置检查清单:\n');
    console.log('请在飞书开放平台后台确认以下配置：');
    console.log('https://open.feishu.cn/app\n');

    console.log('✓ 应用功能 → 机器人');
    console.log('  - 启用机器人功能');
    console.log('');

    console.log('✓ 权限管理');
    console.log('  - 获取与发送单聊、群组消息 (im:message)');
    console.log('  - 接收群聊中@机器人消息事件 (im:message.group_at_msg:readonly)');
    console.log('  - 获取与发送私聊消息 (im:message.p2p:readonly)');
    console.log('');

    console.log('✓ 事件订阅');
    console.log('  - 启用"长连接模式"（而不是 Webhook）');
    console.log('  - 订阅事件: im.message.receive_v1');
    console.log('  - 事件配置 → 连接方式 → 选择"长连接"');
    console.log('');

    console.log('✓ 应用发布');
    console.log('  - 确保应用已发布（至少是测试版本）');
    console.log('  - 将测试用户添加到可用范围');
    console.log('');

    console.log('⚠️  重要提示:');
    console.log('  1. 修改配置后，重启服务: npm run feishu');
    console.log('  2. 有些配置需要等待几分钟才能生效');
    console.log('  3. 长连接模式下，无需配置 Webhook URL');

  } catch (error) {
    console.log('❌ 检查失败:', error.message);
    if (error.response) {
      console.log('响应:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkConfig();
