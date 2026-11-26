const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const cfg = require('../config');

// Reads the login token and loads the user fresh from the database,
// so deactivating an account or changing a role takes effect immediately.
async function loadUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, cfg.jwtSecret);
    const [rows] = await pool.query(
      'SELECT user_id, name, email, role, points, is_active FROM users WHERE user_id = ?',
      [payload.sub]
    );
    const user = rows[0];
    return user && user.is_active ? user : null;
  } catch {
    return null;
  }
}

// guests allowed: req.user is the user, or null for a guest
async function optionalAuth(req, res, next) {
  req.user = await loadUser(req);
  next();
}

async function requireAuth(req, res, next) {
  req.user = await loadUser(req);
  if (!req.user) return res.status(401).json({ message: 'Please log in.' });
  next();
}

const requireRole = (...roles) => async (req, res, next) => {
  req.user = await loadUser(req);
  if (!req.user) return res.status(401).json({ message: 'Please log in.' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'You do not have access to this.' });
  next();
};

module.exports = { optionalAuth, requireAuth, requireRole };