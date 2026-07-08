const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).type('text/plain').send('Hello, World!\n');
});

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

module.exports = router;
