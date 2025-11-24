/**
 * Feishu Webhook Handler
 *
 * Handles incoming events from Feishu via Webhook (HTTP POST)
 * Alternative to WebSocket long-connection mode
 */

import lark from '@larksuiteoapi/node-sdk';
import { FeishuSessionManager } from './lib/feishu-session.js';
import { FeishuMessageWriter } from './lib/feishu-message-writer.js';
import { queryClaude } from './claude-cli.js';
import { credentialsDb, userDb, feishuDb, initializeDatabase } from './database/db.js';

// Global instances
let client = null;
let sessionManager = null;
let userId = null;

/**
 * Initialize Feishu Webhook handler
 */
export async function initializeFeishuWebhook() {
  console.log('[FeishuWebhook] Initializing...');

  // Initialize database
  await initializeDatabase();

  // Get user
  const user = userDb.getFirstUser();
  if (!user) {
    throw new Error('No user found');
  }
  userId = user.id;

  // Get credentials
  let appId, appSecret;
  const credentialValue = credentialsDb.getActiveCredential(userId, 'feishu');
  if (credentialValue) {
    const credentials = JSON.parse(credentialValue);
    appId = credentials.appId;
    appSecret = credentials.appSecret;
  } else {
    appId = process.env.FeishuCC_App_ID;
    appSecret = process.env.FeishuCC_App_Secret;
  }

  if (!appId || !appSecret) {
    throw new Error('Feishu credentials not found');
  }

  // Create client (for sending messages)
  client = new lark.Client({
    appId,
    appSecret,
    domain: lark.Domain.Feishu
  });

  // Create session manager
  sessionManager = new FeishuSessionManager(userId, './feicc');

  console.log('[FeishuWebhook] Initialized successfully');
}

/**
 * Handle incoming message event
 */
async function handleMessageEvent(data) {
  try {
    const event = data.event || data;

    console.log('[FeishuWebhook] Received message:');
    console.log('  Message ID:', event.message?.message_id);
    console.log('  Chat ID:', event.message?.chat_id);
    console.log('  Chat Type:', event.message?.chat_type);
    console.log('  Sender:', event.sender?.sender_id?.open_id);

    // Check if message is for bot
    const chatType = event.message?.chat_type;
    if (chatType === 'group') {
      const mentions = event.message?.mentions || [];
      if (mentions.length === 0) {
        console.log('[FeishuWebhook] Group message without mention, skipping');
        return;
      }
    }

    // Extract text
    const content = event.message?.content;
    if (!content) {
      console.log('[FeishuWebhook] No content in message');
      return;
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (error) {
      console.error('[FeishuWebhook] Failed to parse content:', error.message);
      return;
    }

    let userText = parsedContent.text || parsedContent.content || '';
    // Remove @mentions
    userText = userText.replace(/@[^\s]+\s*/g, '').trim();

    if (!userText) {
      console.log('[FeishuWebhook] Empty message after cleaning');
      return;
    }

    console.log('[FeishuWebhook] User text:', userText);

    // Get or create session
    const session = await sessionManager.getOrCreateSession(event);
    console.log('[FeishuWebhook] Session:', session.id);

    // Get chat ID
    const chatId = event.message?.chat_id || event.sender?.sender_id?.open_id;

    // Check if busy
    if (sessionManager.isSessionBusy(session)) {
      console.log('[FeishuWebhook] Session is busy');
      await sendMessage(chatId, '⏳ 正在处理中，请稍候...');
      return;
    }

    // Log incoming message
    feishuDb.logMessage(
      session.id,
      'incoming',
      'text',
      userText,
      event.message?.message_id
    );

    // Create message writer
    const writer = new FeishuMessageWriter(
      { sendTextMessage: (chatId, text) => sendMessage(chatId, text) },
      chatId,
      session.claude_session_id
    );

    // Call Claude
    const claudeOptions = {
      sessionId: session.claude_session_id,
      cwd: session.project_path,
      skipPermissions: true,
      projectPath: session.project_path
    };

    console.log('[FeishuWebhook] Calling Claude...');
    console.log('[FeishuWebhook] Claude options:', JSON.stringify(claudeOptions, null, 2));

    try {
      await queryClaude(userText, claudeOptions, writer);

      // Update session ID if changed
      if (writer.sessionId && writer.sessionId !== session.claude_session_id) {
        sessionManager.updateClaudeSessionId(session.id, writer.sessionId);
      }

      // Complete message
      await writer.complete();

      // Log success
      feishuDb.logMessage(session.id, 'outgoing', 'text', 'Response sent', null);
      feishuDb.updateSessionActivity(session.id);

      console.log('[FeishuWebhook] Message handled successfully');

    } catch (error) {
      console.error('[FeishuWebhook] Error calling Claude:', error.message);
      await sendMessage(chatId, `❌ 处理失败: ${error.message}`);
      feishuDb.logMessage(session.id, 'outgoing', 'error', error.message, null);
    }

  } catch (error) {
    console.error('[FeishuWebhook] Error handling message:', error.message);
    console.error(error.stack);
  }
}

/**
 * Send message to Feishu
 */
async function sendMessage(chatId, text) {
  const receiveIdType = chatId.startsWith('oc_') ? 'chat_id' : 'open_id';

  try {
    const res = await client.im.message.create({
      params: { receive_id_type: receiveIdType },
      data: {
        receive_id: chatId,
        content: JSON.stringify({ text }),
        msg_type: 'text'
      }
    });

    if (res.code === 0) {
      console.log('[FeishuWebhook] Message sent successfully');
      return { success: true, message_id: res.data?.message_id };
    } else {
      throw new Error(`Feishu API error: ${res.code} - ${res.msg}`);
    }
  } catch (error) {
    console.error('[FeishuWebhook] Failed to send message:', error.message);
    throw error;
  }
}

/**
 * Create Express middleware for Webhook
 */
export function createWebhookHandler() {
  // Get encryption key if configured
  const encryptKey = process.env.FeishuCC_Encrypt_Key || '';

  // Create EventDispatcher
  const eventDispatcher = new lark.EventDispatcher({
    encryptKey,
    loggerLevel: lark.LoggerLevel.debug
  }).register({
    'im.message.receive_v1': handleMessageEvent
  });

  // Return Express middleware
  return lark.adaptExpress(eventDispatcher, {
    autoChallenge: true  // Automatically handle URL verification
  });
}
