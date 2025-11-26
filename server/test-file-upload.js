#!/usr/bin/env node
/**
 * Test script for Feishu file upload functionality
 *
 * Usage:
 *   node server/test-file-upload.js <file_path> [chat_id]
 *
 * Example:
 *   node server/test-file-upload.js ./feicc/group-oc_cbedeb8c0d02262bf51ae0ddfef975d8/spiff.md
 */

import { FeishuClient } from './lib/feishu-client.js';
import { credentialsDb, userDb, initializeDatabase } from './database/db.js';
import path from 'path';

async function testFileUpload() {
  try {
    console.log('🧪 Starting Feishu file upload test...\n');

    // Get file path from command line
    const filePath = process.argv[2];
    const testChatId = process.argv[3]; // Optional: specific chat ID to send to

    if (!filePath) {
      console.error('❌ Error: Please provide a file path');
      console.log('\nUsage: node server/test-file-upload.js <file_path> [chat_id]');
      console.log('Example: node server/test-file-upload.js ./feicc/group-oc_cbedeb8c0d02262bf51ae0ddfef975d8/spiff.md');
      process.exit(1);
    }

    // Resolve absolute path
    const absolutePath = path.resolve(filePath);
    console.log('📁 File to upload:', absolutePath);

    // Initialize database
    await initializeDatabase();

    // Get user credentials
    const user = userDb.getFirstUser();
    if (!user) {
      throw new Error('No user found in database');
    }

    console.log('👤 User:', user.username);

    // Get Feishu credentials
    let appId, appSecret;
    const credentialValue = credentialsDb.getActiveCredential(user.id, 'feishu');
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

    console.log('🔑 App ID:', appId);
    console.log('');

    // Create Feishu client
    const client = new FeishuClient({ appId, appSecret });

    // Test 1: Upload file
    console.log('📤 Test 1: Uploading file...');
    const uploadResult = await client.uploadFile(absolutePath);
    console.log('✅ Upload successful!');
    console.log('   File Key:', uploadResult.file_key);
    console.log('   File Name:', uploadResult.file_name);
    console.log('');

    // Test 2: Send file message (if chat ID provided)
    if (testChatId) {
      console.log('💬 Test 2: Sending file message to chat:', testChatId);
      const sendResult = await client.sendFileMessage(
        testChatId,
        uploadResult.file_key,
        uploadResult.file_name
      );
      console.log('✅ File message sent!');
      console.log('   Message ID:', sendResult.message_id);
      console.log('');
    } else {
      console.log('ℹ️  Test 2: Skipped (no chat_id provided)');
      console.log('   To test sending, provide a chat_id as second argument');
      console.log('');
    }

    // Test 3: Combined sendFile (if chat ID provided)
    if (testChatId) {
      console.log('🚀 Test 3: Testing combined sendFile method...');
      const combinedResult = await client.sendFile(testChatId, absolutePath);
      console.log('✅ Combined send successful!');
      console.log('   File Key:', combinedResult.file_key);
      console.log('   File Name:', combinedResult.file_name);
      console.log('   Message ID:', combinedResult.message_id);
      console.log('');
    }

    console.log('🎉 All tests passed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testFileUpload();
