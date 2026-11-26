const router = require('express').Router();
const { tx } = require('../db');
const { requireRole } = require('../middleware/auth');
const { httpError } = require('../utils/http');
const { findOrder, listOrders, expireStaleOrders } = require('../utils/orders');

router.use(requireRole('cashier', 'admin'));

// Find an order from what was scanned (the 32-character QR token) or typed (the 6-digit number)
router.get('/lookup', async (req, res) => {
  const code = String(req.query.code || '').trim();
  if (!code || code.length > 64) throw httpError(400, 'Nothing to look up.');
  await expireStaleOrders();
  const order = await findOrder('o.qr_token = ? OR o.order_number = ?', [code, code]);
  if (!order) throw httpError(404, 'No order found for that code.');
  res.json(order);
});

router.post('/orders/:id/complete', async (req, res) => {
  const id = Number(req.params.id);
  await expireStaleOrders();
  await tx(async conn => {
    const [[o]] = await conn.query('SELECT * FROM orders WHERE order_id = ? FOR UPDATE', [id]);
    if (!o) throw httpError(404, 'Order not found.');
    if (o.status !== 'Pending') throw httpError(409, `This order is already ${o.status.toLowerCase()}.`);

    await conn.query(
      `UPDATE orders SET status = 'Completed', completed_at = UTC_TIMESTAMP(), handled_by = ? WHERE order_id = ?`,
      [req.user.user_id, id]
    );
    // points go to registered users only (guests have no account)
    if (o.user_id && o.points_earned > 0) {
      await conn.query('UPDATE users SET points = points + ? WHERE user_id = ?', [o.points_earned, o.user_id]);
    }
    if (o.user_voucher_id) {
      await conn.query(`UPDATE user_vouchers SET status = 'Used', used_at = UTC_TIMESTAMP() WHERE user_voucher_id = ?`, [o.user_voucher_id]);
    }
  });
  res.json(await findOrder('o.order_id = ?', [id]));
});

// reject an order (customer left, changed their mind, etc.)
router.post('/orders/:id/cancel', async (req, res) => {
  const id = Number(req.params.id);
  await expireStaleOrders();
  await tx(async conn => {
    const [[o]] = await conn.query('SELECT * FROM orders WHERE order_id = ? FOR UPDATE', [id]);
    if (!o) throw httpError(404, 'Order not found.');
    if (o.status !== 'Pending') throw httpError(409, `This order is already ${o.status.toLowerCase()}.`);
    await conn.query(`UPDATE orders SET status = 'Cancelled', handled_by = ? WHERE order_id = ?`, [req.user.user_id, id]);
    if (o.user_voucher_id) {
      await conn.query(`UPDATE user_vouchers SET status = 'Available' WHERE user_voucher_id = ? AND status = 'Reserved'`, [o.user_voucher_id]);
    }
  });
  res.json(await findOrder('o.order_id = ?', [id]));
});

// the history page
router.get('/orders', async (req, res) => {
  await expireStaleOrders();
  res.json(await listOrders(req.query));
});

module.exports = router;