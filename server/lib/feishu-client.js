/**
 * Feishu Client
 *
 * Encapsulates Lark SDK for WebSocket connection and message handling.
 * Uses long-lived WebSocket connection (no public domain needed).
 */

import lark from '@larksuiteoapi/node-sdk';

export class FeishuClient {
  constructor(config) {
    this.appId = config.appId;
    this.appSecret = config.appSecret;
    this.loggerLevel = config.loggerLevel || lark.LoggerLevel.error;

    // Create Lark Client for API calls
    this.client = new lark.Client({
      appId: this.appId,
      appSecret: this.appSecret,
      domain: lark.Domain.Feishu
    });

    // Create WebSocket Client for event listening
    this.wsClient = new lark.WSClient({
      appId: this.appId,
      appSecret: this.appSecret,
      loggerLevel: this.loggerLevel
    });

    this.isRunning = false;
    this.messageHandler = null;
    this.botInfo = null; // Bot's own info (to identify mentions)

    console.log('[FeishuClient] Initialized with App ID:', this.appId);
  }

  /**
   * Start the WebSocket connection and listen for messages
   */
  async start(messageHandler) {
    if (this.isRunning) {
      console.log('[FeishuClient] Already running');
      return;
    }

    this.messageHandler = messageHandler;

    // Get bot info
    await this.getBotInfo();

    // Create EventDispatcher and register message handler
    const eventDispatcher = new lark.EventDispatcher({
      loggerLevel: lark.LoggerLevel.debug
    }).register({
      'im.message.receive_v1': async (data) => {
        console.log('[FeishuClient] ✨ EventDispatcher received im.message.receive_v1');
        console.log('[FeishuClient] Raw event data:', JSON.stringify(data, null, 2).substring(0, 500));
        await this.handleMessageEvent(data);
      }
    });

    // Start WebSocket connection with EventDispatcher
    try {
      await this.wsClient.start({ eventDispatcher });
      this.isRunning = true;
      console.log('[FeishuClient] WebSocket started successfully');
    } catch (error) {
      console.error('[FeishuClient] Failed to start WebSocket:', error.message);
      throw error;
    }
  }

  /**
   * Stop the WebSocket connection
   * Note: New SDK version doesn't provide stop() method, connection is managed automatically
   */
  async stop() {
    if (!this.isRunning) {
      console.log('[FeishuClient] Not running');
      return;
    }

    // Mark as not running (SDK will handle reconnection automatically)
    this.isRunning = false;
    console.log('[FeishuClient] WebSocket marked as stopped');
  }


  /**
   * Handle incoming message event
   */
  async handleMessageEvent(data) {
    try {
      const event = data.event || data;

      console.log('[FeishuClient] Received message:');
      console.log('  Message ID:', event.message?.message_id);
      console.log('  Chat ID:', event.message?.chat_id);
      console.log('  Chat Type:', event.message?.chat_type);
      console.log('  Sender:', event.sender?.sender_id?.open_id);

      // Check if this message is for the bot
      if (!this.isMessageForBot(event)) {
        console.log('[FeishuClient] Message not for bot, skipping');
        return;
      }

      // Extract message content
      const content = event.message?.content;
      if (!content) {
        console.log('[FeishuClient] No content in message');
        return;
      }

      let parsedContent;
      try {
        parsedContent = JSON.parse(content);
      } catch (error) {
        console.error('[FeishuClient] Failed to parse message content:', error.message);
        return;
      }

      // Extract text from different message types
      let userText = '';
      if (parsedContent.text) {
        userText = parsedContent.text;
      } else if (parsedContent.content) {
        userText = parsedContent.content;
      }

      // Remove @mentions from text (for group chats)
      userText = this.cleanMentions(userText);

      if (!userText || !userText.trim()) {
        console.log('[FeishuClient] Empty message after cleaning');
        return;
      }

      console.log('[FeishuClient] User text:', userText);

      // Call message handler
      if (this.messageHandler) {
        await this.messageHandler(event, userText.trim());
      }

    } catch (error) {
      console.error('[FeishuClient] Error handling message:', error.message);
      console.error(error.stack);
    }
  }

  /**
   * Check if a message is for the bot
   * Returns true for:
   * - Private chats (chat_type === 'p2p')
   * - Group chats where bot is mentioned
   */
  isMessageForBot(event) {
    const message = event.message;
    if (!message) return false;

    // Private chat - always for bot
    if (message.chat_type === 'p2p') {
      return true;
    }

    // Group chat - check for mentions
    if (message.chat_type === 'group') {
      const mentions = message.mentions;
      if (!mentions || mentions.length === 0) {
        return false;
      }

      // Check if bot is mentioned
      // If we have bot's open_id, check for exact match
      // Otherwise, accept any @ mention as potentially for us
      if (this.botInfo?.open_id) {
        for (const mention of mentions) {
          if (mention.id?.open_id === this.botInfo.open_id) {
            return true;
          }
          if (mention.key === '@_all') {
            return true;
          }
        }
        return false;
      } else {
        // No bot info - accept any mention
        return true;
      }
    }

    // Unknown chat type
    return false;
  }

  /**
   * Clean @mentions from text
   */
  cleanMentions(text) {
    if (!text) return '';

    // Remove @user_name format (e.g., "@Bot ")
    let cleaned = text.replace(/@[^\s]+\s*/g, '');

    // Remove at-mention markers used by Feishu
    cleaned = cleaned.replace(/@_user_\d+/g, '');
    cleaned = cleaned.replace(/@_all/g, '');

    return cleaned.trim();
  }

  /**
   * Get bot's own information
   */
  async getBotInfo() {
    try {
      // For mentions to work properly, we would need bot info
      // But it's not critical for basic functionality
      // Set a placeholder for now
      this.botInfo = { open_id: null };
      console.log('[FeishuClient] Bot info: mentions will match any @');
    } catch (error) {
      console.error('[FeishuClient] Failed to get bot info:', error.message);
      this.botInfo = { open_id: null };
    }
  }

  /**
   * Send a text message to a chat
   */
  async sendTextMessage(chatId, text, retries = 3) {
    const receiveIdType = chatId.startsWith('oc_') ? 'chat_id' : 'open_id';

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await this.client.im.message.create({
          params: {
            receive_id_type: receiveIdType
          },
          data: {
            receive_id: chatId,
            content: JSON.stringify({ text }),
            msg_type: 'text'
          }
        });

        if (res.code === 0) {
          console.log('[FeishuClient] Message sent successfully');
          return {
            success: true,
            message_id: res.data?.message_id
          };
        } else {
          throw new Error(`Feishu API error: ${res.code} - ${res.msg}`);
        }

      } catch (error) {
        console.error(`[FeishuClient] Send message failed (attempt ${attempt}/${retries}):`, error.message);

        if (attempt === retries) {
          throw error; // Re-throw on final attempt
        }

        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Send a reply to a specific message
   */
  async replyToMessage(messageId, text, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await this.client.im.message.reply({
          path: {
            message_id: messageId
          },
          data: {
            content: JSON.stringify({ text }),
            msg_type: 'text'
          }
        });

        if (res.code === 0) {
          console.log('[FeishuClient] Reply sent successfully');
          return {
            success: true,
            message_id: res.data?.message_id
          };
        } else {
          throw new Error(`Feishu API error: ${res.code} - ${res.msg}`);
        }

      } catch (error) {
        console.error(`[FeishuClient] Reply failed (attempt ${attempt}/${retries}):`, error.message);

        if (attempt === retries) {
          throw error;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      botInfo: this.botInfo
    };
  }
}
