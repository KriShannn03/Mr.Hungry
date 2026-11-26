const router = require('express').Router();
const { pool, tx } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { httpError } = require('../utils/http');

// vouchers anyone can see
router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT voucher_id, title, points_cost, discount_type, discount_value FROM vouchers WHERE is_active = 1 ORDER BY points_cost'
  );
  res.json(rows);
});

// vouchers I already claimed
router.get('/mine', requireAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT user_voucher_id, title, discount_type, discount_value, status, claimed_at
     FROM user_vouchers WHERE user_id = ?
     ORDER BY FIELD(status, 'Available', 'Reserved', 'Used'), claimed_at DESC`,
    [req.user.user_id]
  );
  res.json(rows);
});

// spend points to claim a voucher
router.post('/:id/claim', requireRole('user'), async (req, res) => {
  const points = await tx(async conn => {
    const [[v]] = await conn.query('SELECT * FROM vouchers WHERE voucher_id = ? AND is_active = 1', [Number(req.params.id)]);
    if (!v) throw httpError(404, 'That voucher is not available.');

    const [r] = await conn.query('UPDATE users SET points = points - ? WHERE user_id = ? AND points >= ?',
      [v.points_cost, req.user.user_id, v.points_cost]);
    if (!r.affectedRows) throw httpError(400, 'You do not have enough points.');

    await conn.query(
      'INSERT INTO user_vouchers (user_id, voucher_id, title, discount_type, discount_value) VALUES (?, ?, ?, ?, ?)',
      [req.user.user_id, v.voucher_id, v.title, v.discount_type, v.discount_value]
    );
    const [[u]] = await conn.query('SELECT points FROM users WHERE user_id = ?', [req.user.user_id]);
    return u.points;
  });
  res.json({ message: 'Voucher claimed!', points });
});

module.exports = router;