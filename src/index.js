'use strict';

require('dotenv').config();

const express = require('express');
const { setupLineWebhook } = require('./webhook');

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

setupLineWebhook(app);

const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
