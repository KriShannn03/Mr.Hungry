const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const cfg = require('../config');
const { requireAuth } = require('../middleware/auth');
const { httpError } = require('../utils/http');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  message: { message: 'Too many attempts. Please try again in a few minutes.' },
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicUser = u => ({ user_id: u.user_id, name: u.name, email: u.email, role: u.role, points: u.points });
const makeToken = u => jwt.sign({ sub: u.user_id, role: u.role }, cfg.jwtSecret, { expiresIn: cfg.jwtExpiresIn });

router.post('/register', limiter, async (req, res) => {
  const b = req.body ?? {};
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');

  if (name.length < 2) throw httpError(400, 'Please enter your name.');
  if (!EMAIL.test(email)) throw httpError(400, 'Enter a valid email address.');
  if (password.length < 6) throw httpError(400, 'Password must be at least 6 characters.');

  const [exists] = await pool.query('SELECT 1 FROM users WHERE email = ?', [email]);
  if (exists.length) throw httpError(409, 'That email is already registered.');

  const hash = await bcrypt.hash(password, 10);
  const [r] = await pool.query('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, hash]);
  const user = { user_id: r.insertId, name, email, role: 'user', points: 0 };
  res.status(201).json({ token: makeToken(user), user });
});

router.post('/login', limiter, async (req, res) => {
  const b = req.body ?? {};
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  const u = rows[0];
  const ok = u && u.is_active && (await bcrypt.compare(password, u.password_hash));
  if (!ok) throw httpError(401, 'Wrong email or password.');

  res.json({ token: makeToken(u), user: publicUser(u) });
});

router.get('/me', requireAuth, (req, res) => res.json(publicUser(req.user)));

// edit my own information
router.put('/me', requireAuth, async (req, res) => {
  const b = req.body ?? {};
  const [rows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [req.user.user_id]);
  const me = rows[0];

  const name = b.name !== undefined ? String(b.name).trim() : me.name;
  const email = b.email !== undefined ? String(b.email).trim().toLowerCase() : me.email;
  const newPassword = b.new_password ? String(b.new_password) : '';

  if (name.length < 2) throw httpError(400, 'Please enter your name.');
  if (!EMAIL.test(email)) throw httpError(400, 'Enter a valid email address.');
  if (newPassword && newPassword.length < 6) throw httpError(400, 'New password must be at least 6 characters.');

  // changing the email or password needs the current password (400, not 401, so the app doesn't log you out)
  if (email !== me.email || newPassword) {
    const ok = await bcrypt.compare(String(b.current_password || ''), me.password_hash);
    if (!ok) throw httpError(400, 'Enter your current password to change your email or password.');
  }
  if (email !== me.email) {
    const [dup] = await pool.query('SELECT 1 FROM users WHERE email = ? AND user_id <> ?', [email, me.user_id]);
    if (dup.length) throw httpError(409, 'That email is already used by another account.');
  }

  const hash = newPassword ? await bcrypt.hash(newPassword, 10) : me.password_hash;
  await pool.query('UPDATE users SET name = ?, email = ?, password_hash = ? WHERE user_id = ?', [name, email, hash, me.user_id]);
  res.json(publicUser({ ...me, name, email }));
});

module.exports = router;