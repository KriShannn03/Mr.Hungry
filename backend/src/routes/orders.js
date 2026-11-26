const router = require('express').Router();
const crypto = require('crypto');
const { pool, tx } = require('../db');
const cfg = require('../config');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const { httpError, round2 } = require('../utils/http');
const { SELECT_ORDER, attachLines, formatOrder, findOrder, expireStaleOrders } = require('../utils/orders');

// Place an order. Works for guests too (no token needed).
router.post('/', optionalAuth, async (req, res) => {
  const body = req.body ?? {};
  const raw = Array.isArray(body.items) ? body.items : [];

  const wanted = new Map(); // item_id -> qty
  for (const r of raw) {
    const id = Number(r.item_id);
    const qty = Number(r.qty);
    if (!Number.isInteger(id) || !Number.isInteger(qty) || qty < 1 || qty > 50) throw httpError(400, 'Some items in your order are invalid.');
    wanted.set(id, (wanted.get(id) || 0) + qty);
  }
  if (wanted.size === 0 || wanted.size > 40) throw httpError(400, 'Your order is empty.');

  // only regular customers earn points and use vouchers
  const customer = req.user && req.user.role === 'user' ? req.user : null;
  const voucherId = body.user_voucher_id ? Number(body.user_voucher_id) : null;
  if (voucherId && !customer) throw httpError(400, 'Log in to use a voucher.');

  const orderId = await tx(async conn => {
    // prices ALWAYS come from the database, never from the browser
    const [menu] = await conn.query(
      'SELECT item_id, name, price FROM menu_items WHERE is_available = 1 AND item_id IN (?)',
      [[...wanted.keys()]]
    );
    const found = new Map(menu.map(m => [m.item_id, m]));
    const missing = [...wanted.keys()].filter(id => !found.has(id));
    if (missing.length) {
      throw httpError(400, 'Some items are no longer available and were removed from your order.', { unavailable: missing });
    }

    let subtotal = 0;
    const lines = [];
    for (const [id, qty] of wanted) {
      const m = found.get(id);
      subtotal += m.price * qty;
      lines.push([id, m.name, m.price, qty]);
    }
    subtotal = round2(subtotal);

    let discount = 0;
    if (voucherId) {
      const [[v]] = await conn.query(
        `SELECT * FROM user_vouchers WHERE user_voucher_id = ? AND user_id = ? AND status = 'Available' FOR UPDATE`,
        [voucherId, customer.user_id]
      );
      if (!v) throw httpError(400, 'That voucher cannot be used.');
      discount = v.discount_type === 'percent' ? round2((subtotal * v.discount_value) / 100) : v.discount_value;
      discount = Math.min(discount, subtotal);
    }

    const total = round2(subtotal - discount);
    const points = customer ? Math.floor(total / cfg.pesosPerPoint) : 0;
    const token = crypto.randomBytes(16).toString('hex');
    const expires = new Date(Date.now() + cfg.qrMinutes * 60 * 1000);

    let id = null;
    for (let attempt = 0; attempt < 8 && id === null; attempt++) {
      try {
        const [r] = await conn.query(
          `INSERT INTO orders (order_number, qr_token, user_id, customer_name, subtotal, discount, total,
                               points_earned, user_voucher_id, qr_expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [String(crypto.randomInt(100000, 1000000)), token, customer ? customer.user_id : null,
           customer ? customer.name : null, subtotal, discount, total, points, voucherId, expires]
        );
        id = r.insertId;
      } catch (e) {
        if (e.code !== 'ER_DUP_ENTRY' || attempt === 7) throw e; // order number taken, try another
      }
    }

    await conn.query('INSERT INTO order_items (order_id, item_id, name, price, qty) VALUES ?', [lines.map(l => [id, ...l])]);
    if (voucherId) await conn.query(`UPDATE user_vouchers SET status = 'Reserved' WHERE user_voucher_id = ?`, [voucherId]);
    return id;
  });

  res.status(201).json(await findOrder('o.order_id = ?', [orderId], { withToken: true }));
});

// a registered user's own orders
router.get('/mine', requireAuth, async (req, res) => {
  await expireStaleOrders();
  const [rows] = await pool.query(`${SELECT_ORDER} WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT 50`, [req.user.user_id]);
  const withLines = await attachLines(rows);
  res.json(withLines.map(o => formatOrder(o, { withToken: true })));
});

// anyone holding the QR token (guest or user) can check their order's status
router.get('/status/:token', async (req, res) => {
  if (!/^[a-f0-9]{32}$/.test(req.params.token)) throw httpError(404, 'Order not found.');
  await expireStaleOrders();
  const order = await findOrder('o.qr_token = ?', [req.params.token], { withToken: true });
  if (!order) throw httpError(404, 'Order not found.');
  res.json(order);
});

module.exports = router;