'use strict';

const { Client, middleware } = require('@line/bot-sdk');
const { handleLineEvents } = require('./lineHandler');

/**
 * Creates an Express router for LINE webhook handling.
 *
 * The LINE SDK middleware validates the X-Line-Signature header against the
 * raw request body using HMAC-SHA256 before the body is JSON-parsed.
 *
 * @param {object} app - Express app instance
 */
function setupLineWebhook(app) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET || '';
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

  const lineMiddleware = middleware({ channelSecret, channelAccessToken });
  const client = new Client({ channelAccessToken });

  app.post('/webhook', lineMiddleware, (req, res) => {
    const events = req.body.events || [];
    handleLineEvents(events, client)
      .then(() => res.status(200).json({ status: 'ok' }))
      .catch((err) => {
        console.error('Error handling LINE events:', err);
        res.status(500).json({ error: 'Internal server error' });
      });
  });
}

module.exports = { setupLineWebhook };
