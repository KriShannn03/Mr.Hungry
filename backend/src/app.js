const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cfg = require('./config');
const { pool } = require('./db');
const { cleanupOrders } = require('./utils/orders');

const app = express();
app.set('trust proxy', 1); // Vercel sits in front of the app; without this, rate limiting treats everyone as one persons

app.use(cors({ origin: cfg.corsOrigins }));
app.use(express.json());

app.get('/api/health', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/rewards', require('./routes/rewards'));
app.use('/api/cashier', require('./routes/cashier'));
app.use('/api/admin', require('./routes/admin'));

// for hosting where timers don't run (e.g. Vercel Cron). Not needed on localhost.
app.get('/api/cron/cleanup', async (req, res) => {
  if (!cfg.cronSecret || req.headers.authorization !== `Bearer ${cfg.cronSecret}`) {
    return res.status(401).json({ message: 'Not allowed.' });
  }
  res.json(await cleanupOrders());
});

app.use((req, res) => res.status(404).json({ message: 'Not found.' }));

// one place that turns any error into a clean JSON message
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'That image is too large (max 4 MB).' : err.message });
  }
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'That already exists.' });

  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({
    message: status === 500 ? 'Something went wrong on the server.' : err.message,
    ...(err.extra || {}),
  });
});

module.exports = app;