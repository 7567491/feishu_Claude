/**
 * Feishu REST API Routes
 *
 * Provides HTTP endpoints for managing the Feishu WebSocket service.
 * All endpoints require authentication.
 */

import express from 'express';
import { FeishuService } from '../feishu-ws.js';
import { feishuDb } from '../database/db.js';

const router = express.Router();

// Singleton service instance
let feishuService = null;

/**
 * GET /api/feishu/status
 * Get service status
 */
router.get('/status', async (req, res) => {
  try {
    if (!feishuService) {
      return res.json({
        isRunning: false,
        message: 'Service not initialized'
      });
    }

    const status = feishuService.getStatus();
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('[Feishu API] Error getting status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/feishu/start
 * Start the Feishu service
 */
router.post('/start', async (req, res) => {
  try {
    if (feishuService && feishuService.isRunning) {
      return res.json({
        success: true,
        message: 'Service is already running'
      });
    }

    // Create service if not exists
    if (!feishuService) {
      feishuService = new FeishuService();
    }

    // Start service
    await feishuService.start();

    res.json({
      success: true,
      message: 'Feishu service started successfully',
      data: feishuService.getStatus()
    });

  } catch (error) {
    console.error('[Feishu API] Error starting service:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/feishu/stop
 * Stop the Feishu service
 */
router.post('/stop', async (req, res) => {
  try {
    if (!feishuService || !feishuService.isRunning) {
      return res.json({
        success: true,
        message: 'Service is not running'
      });
    }

    await feishuService.stop();

    res.json({
      success: true,
      message: 'Feishu service stopped successfully'
    });

  } catch (error) {
    console.error('[Feishu API] Error stopping service:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/feishu/sessions
 * Get all active Feishu sessions
 */
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.user?.id; // From auth middleware

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const sessions = feishuDb.getAllSessions(userId);

    res.json({
      success: true,
      data: {
        sessions,
        total: sessions.length
      }
    });

  } catch (error) {
    console.error('[Feishu API] Error getting sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/feishu/sessions/:id
 * Deactivate a Feishu session
 */
router.delete('/sessions/:id', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);

    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid session ID'
      });
    }

    feishuDb.deactivateSession(sessionId);

    res.json({
      success: true,
      message: 'Session deactivated successfully'
    });

  } catch (error) {
    console.error('[Feishu API] Error deactivating session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/feishu/sessions/:id/messages
 * Get message history for a session
 */
router.get('/sessions/:id/messages', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 100;

    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid session ID'
      });
    }

    const messages = feishuDb.getMessageHistory(sessionId, limit);

    res.json({
      success: true,
      data: {
        messages,
        total: messages.length
      }
    });

  } catch (error) {
    console.error('[Feishu API] Error getting messages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/feishu/stats
 * Get Feishu usage statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user?.id; // From auth middleware

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const stats = feishuDb.getStats(userId);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('[Feishu API] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/feishu/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'feishu',
    timestamp: new Date().toISOString(),
    status: feishuService && feishuService.isRunning ? 'running' : 'stopped'
  });
});

/**
 * GET /api/feishu/config
 * Get Feishu configuration status (without exposing secrets)
 */
router.get('/config', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Check if credentials exist
    const hasEnvVars = !!(process.env.FeishuCC_App_ID && process.env.FeishuCC_App_Secret);

    // Note: We don't expose actual credential values
    res.json({
      success: true,
      data: {
        hasEnvironmentVariables: hasEnvVars,
        configurationSource: hasEnvVars ? 'environment' : 'not_configured'
      }
    });

  } catch (error) {
    console.error('[Feishu API] Error getting config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
