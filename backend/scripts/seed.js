require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

async function ensure(role, name, email, password) {
  if (!email || !password) {
    console.log(`Skipped ${role}: set ${role.toUpperCase()}_EMAIL and ${role.toUpperCase()}_PASSWORD in .env`);
    return;
  }
  const [rows] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (rows.length) return console.log(`${role} already exists: ${email}`);
  const hash = await bcrypt.hash(password, 10);
  await pool.query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [name, email.toLowerCase(), hash, role]);
  console.log(`Created ${role}: ${email}`);
}

(async () => {
  try {
    await ensure('admin', process.env.ADMIN_NAME || 'Admin', process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
    await ensure('cashier', process.env.CASHIER_NAME || 'Cashier', process.env.CASHIER_EMAIL, process.env.CASHIER_PASSWORD);
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    await pool.end();
  }
})();