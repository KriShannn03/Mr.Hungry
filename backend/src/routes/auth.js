const { validatePassword } = require('../utils/password');
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { pool, tx } = require('../db');
const { sendMail } = require('../utils/mailer');
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
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { message: 'Too many requests. Please try again in a few minutes.' },
});

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const SAME_ANSWER = { message: 'If that email is registered, we sent a password reset link. Check your inbox and spam folder.' };

router.post('/register', limiter, async (req, res) => {
  const b = req.body ?? {};
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');

  if (name.length < 2) throw httpError(400, 'Please enter your name.');
  if (!EMAIL.test(email)) throw httpError(400, 'Enter a valid email address.');
  validatePassword(password);

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
  if (newPassword) validatePassword(newPassword);

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

router.post('/forgot-password', forgotLimiter, async (req, res) => {
  const email = String((req.body ?? {}).email || '').trim().toLowerCase();
  if (!EMAIL.test(email)) throw httpError(400, 'Enter a valid email address.');

  const [rows] = await pool.query('SELECT user_id, name, email FROM users WHERE email = ? AND is_active = 1', [email]);
  const user = rows[0];

  if (user) {
    // at most one email per minute per account
    const [recent] = await pool.query(
      'SELECT 1 FROM password_resets WHERE user_id = ? AND created_at > UTC_TIMESTAMP() - INTERVAL 60 SECOND',
      [user.user_id]
    );

    if (!recent.length) {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + cfg.resetMinutes * 60 * 1000);

      await tx(async conn => {
        await conn.query('DELETE FROM password_resets WHERE user_id = ?', [user.user_id]); // older links stop working
        await conn.query('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)', [user.user_id, sha256(token), expires]);
      });

      const link = `${cfg.appUrl}/reset-password?token=${token}`;
      try {
        // must be awaited: on Vercel the function stops as soon as the response is sent
        await sendMail({
          to: user.email,
          subject: 'Reset your Mr. Hungry password',
          text:
            `Hi ${user.name},\n\nWe received a request to reset your password. ` +
            `Open this link to choose a new one (valid for ${cfg.resetMinutes} minutes):\n\n${link}\n\n` +
            `If you did not ask for this, ignore this email. Your password will not change.\n\nMr. Hungry`,
          html:
            `<p>Hi ${escapeHtml(user.name)},</p>` +
            `<p>We received a request to reset your password. The link below is valid for ${cfg.resetMinutes} minutes.</p>` +
            `<p><a href="${link}" style="display:inline-block;padding:12px 22px;background:#e8650c;color:#fff;text-decoration:none;border-radius:999px;font-weight:bold">Reset password</a></p>` +
            `<p>If the button does not work, copy this link into your browser:<br>${link}</p>` +
            `<p>If you did not ask for this, ignore this email. Your password will not change.</p>`,
        });
      } catch (err) {
        console.error('Could not send reset email:', err.message); // check Vercel Logs if emails never arrive
      }
    }
  }

  res.json(SAME_ANSWER); // identical whether or not the account exists
});

router.post('/reset-password', limiter, async (req, res) => {
  const b = req.body ?? {};
  const token = String(b.token || '');
  if (!/^[a-f0-9]{64}$/.test(token)) throw httpError(400, 'This reset link is invalid or has expired.');

  validatePassword(b.password); // checked first, so a weak password doesn't use up the link
  const hash = await bcrypt.hash(String(b.password), 10);

  const ok = await tx(async conn => {
    const [[r]] = await conn.query(
      'SELECT reset_id, user_id FROM password_resets WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP() FOR UPDATE',
      [sha256(token)]
    );
    if (!r) return false;
    await conn.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [hash, r.user_id]);
    await conn.query('DELETE FROM password_resets WHERE user_id = ?', [r.user_id]); // the link works only once
    return true;
  });

  if (!ok) throw httpError(400, 'This reset link is invalid or has expired.');
  res.json({ message: 'Your password was changed. You can log in now.' });
});

module.exports = router;