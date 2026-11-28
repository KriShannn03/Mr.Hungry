const { pool, tx } = require('../db');
const cfg = require('../config');

const SELECT_ORDER = `
  SELECT o.*,
         COALESCE(u.name, o.customer_name) AS user_name,
         h.name  AS handled_by_name,
         uv.title AS voucher_title
  FROM orders o
  LEFT JOIN users u         ON u.user_id = o.user_id
  LEFT JOIN users h         ON h.user_id = o.handled_by
  LEFT JOIN user_vouchers uv ON uv.user_voucher_id = o.user_voucher_id`;

async function attachLines(rows) {
  if (!rows.length) return [];
  const [items] = await pool.query(
    'SELECT order_id, name, price, qty FROM order_items WHERE order_id IN (?) ORDER BY id',
    [rows.map(r => r.order_id)]
  );
  const byOrder = new Map();
  for (const it of items) {
    if (!byOrder.has(it.order_id)) byOrder.set(it.order_id, []);
    byOrder.get(it.order_id).push(it);
  }
  return rows.map(r => ({ ...r, lines: byOrder.get(r.order_id) || [] }));
}

// withToken is true only for the customer's own endpoints. Staff never need the secret.
function formatOrder(o, { withToken = false } = {}) {
  const out = {
    order_id: o.order_id,
    order_number: o.order_number,
    status: o.status,
    subtotal: o.subtotal,
    discount: o.discount,
    total: o.total,
    points_earned: o.points_earned,
    qr_expires_at: o.qr_expires_at,
    created_at: o.created_at,
    completed_at: o.completed_at,
    ordered_by: o.user_name || 'Guest',
    has_account: !!o.user_id,
    handled_by_name: o.handled_by_name || null,
    voucher_title: o.voucher_title || null,
    lines: (o.lines || []).map(l => ({ name: l.name, price: l.price, qty: l.qty })),
  };
  if (withToken) out.qr_token = o.qr_token;
  return out;
}

async function findOrder(whereSql, args, opts) {
  const [rows] = await pool.query(`${SELECT_ORDER} WHERE ${whereSql} LIMIT 1`, args);
  if (!rows.length) return null;
  const [withLines] = await attachLines(rows);
  return formatOrder(withLines, opts);
}

async function listOrders({ status, q, limit = 30, offset = 0 }) {
  const lim = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const off = Math.max(Number(offset) || 0, 0);
  const where = [];
  const args = [];

  if (['Pending', 'Completed', 'Cancelled', 'Expired'].includes(status)) {
    where.push('o.status = ?');
    args.push(status);
  }
  if (q) {
    const like = `%${String(q).trim()}%`;
    where.push('(o.order_number LIKE ? OR u.name LIKE ? OR o.customer_name LIKE ?)');
    args.push(like, like, like);
  }

  const [rows] = await pool.query(
    `${SELECT_ORDER}
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY COALESCE(o.completed_at, o.created_at) DESC, o.order_id DESC
     LIMIT ? OFFSET ?`,
    [...args, lim + 1, off]
  );
  const hasMore = rows.length > lim;
  const page = await attachLines(rows.slice(0, lim));
  return {
    orders: page.map(o => formatOrder(o)),
    hasMore,
    retention: { completed_days: cfg.keepCompletedDays, expired_days: cfg.keepExpiredDays },
  };
}

// Pending orders past their time become Expired, and any voucher on them is given back.
async function expireStaleOrders() {
  await tx(async conn => {
    await conn.query(
      `UPDATE user_vouchers uv
       JOIN orders o ON o.user_voucher_id = uv.user_voucher_id
       SET uv.status = 'Available'
       WHERE o.status = 'Pending' AND o.qr_expires_at < UTC_TIMESTAMP() AND uv.status = 'Reserved'`
    );
    await conn.query(
      `UPDATE orders SET status = 'Expired'
       WHERE status = 'Pending' AND qr_expires_at < UTC_TIMESTAMP()`
    );
  });
}

// The automatic cleanup that keeps the database small.
async function cleanupOrders() {
  await expireStaleOrders();
  const [a] = await pool.query(
    `DELETE FROM orders WHERE status IN ('Expired','Cancelled')
     AND created_at < UTC_TIMESTAMP() - INTERVAL ? DAY`,
    [cfg.keepExpiredDays]
  );
  const [b] = await pool.query(
    `DELETE FROM orders WHERE status = 'Completed'
     AND completed_at < UTC_TIMESTAMP() - INTERVAL ? DAY`,
    [cfg.keepCompletedDays]
  );

  await pool.query('DELETE FROM password_resets WHERE expires_at < UTC_TIMESTAMP() - INTERVAL 1 DAY');
  
  return { removed_expired_or_cancelled: a.affectedRows, removed_completed: b.affectedRows };
}

module.exports = { SELECT_ORDER, attachLines, formatOrder, findOrder, listOrders, expireStaleOrders, cleanupOrders };