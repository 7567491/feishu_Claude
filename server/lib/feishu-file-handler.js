/**
 * Feishu File Command Handler
 *
 * Handles file-related commands in Feishu conversations
 */

import path from 'path';
import fs from 'fs';

export class FeishuFileHandler {
  /**
   * Check if message is a file send command
   * @param {string} userText - User's message text
   * @returns {Object|null} - { command: 'send', fileName: 'xxx' } or null
   */
  static parseFileCommand(userText) {
    const text = userText.trim();

    // Pattern 1: "发送 xxx 文件" or "发送文件 xxx"
    let match = text.match(/(?:发送|传|给我).*?([^\s]+\.(?:md|pdf|doc|docx|xls|xlsx|txt|zip|rar|jpg|png))/i);
    if (match) {
      return { command: 'send', fileName: match[1] };
    }

    // Pattern 2: "send xxx file" or "send file xxx"
    match = text.match(/send.*?([^\s]+\.(?:md|pdf|doc|docx|xls|xlsx|txt|zip|rar|jpg|png))/i);
    if (match) {
      return { command: 'send', fileName: match[1] };
    }

    // Pattern 3: "把 xxx 发给我" or "把 xxx 文件发给我"
    match = text.match(/把\s*([^\s]+\.(?:md|pdf|doc|docx|xls|xlsx|txt|zip|rar|jpg|png))/i);
    if (match) {
      return { command: 'send', fileName: match[1] };
    }

    // Pattern 4: Direct file name mention
    match = text.match(/^([^\s]+\.(?:md|pdf|doc|docx|xls|xlsx|txt|zip|rar|jpg|png))$/i);
    if (match) {
      return { command: 'send', fileName: match[1] };
    }

    return null;
  }

  /**
   * Find file in project directory
   * @param {string} projectPath - Project root path
   * @param {string} fileName - File name to find
   * @returns {string|null} - Full file path or null if not found
   */
  static findFile(projectPath, fileName) {
    // Try direct path first
    const directPath = path.join(projectPath, fileName);
    if (fs.existsSync(directPath)) {
      return directPath;
    }

    // Try searching in subdirectories (non-recursive for safety)
    try {
      const entries = fs.readdirSync(projectPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name === fileName) {
          return path.join(projectPath, entry.name);
        }
      }

      // Search one level deep
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const subPath = path.join(projectPath, entry.name, fileName);
          if (fs.existsSync(subPath)) {
            return subPath;
          }
        }
      }
    } catch (error) {
      console.error('[FileHandler] Error searching for file:', error.message);
    }

    return null;
  }

  /**
   * Handle file send command
   * @param {Object} client - Feishu client instance
   * @param {string} chatId - Chat ID to send to
   * @param {string} projectPath - Project root path
   * @param {string} fileName - File name to send
   * @returns {Promise<Object>} - Result of file send operation
   */
  static async handleFileSend(client, chatId, projectPath, fileName) {
    console.log('[FileHandler] Handling file send:', fileName);

    // Find the file
    const filePath = this.findFile(projectPath, fileName);

    if (!filePath) {
      throw new Error(`文件未找到: ${fileName}`);
    }

    console.log('[FileHandler] Found file at:', filePath);

    // Send the file
    const result = await client.sendFile(chatId, filePath);

    console.log('[FileHandler] File sent successfully:', fileName);
    return result;
  }
}
