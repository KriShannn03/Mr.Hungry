const router = require('express').Router();
const { pool } = require('../db');
const { toDto } = require('../utils/menu');

// public menu (hidden items are not included)
router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT m.item_id, m.name, m.description, m.price, c.name AS category, m.is_best_seller, m.has_image, m.image_version
     FROM menu_items m
     JOIN categories c ON c.category_id = m.category_id
     WHERE m.is_available = 1
     ORDER BY c.sort_order, c.category_id, m.item_id`
  );
  res.json(rows.map(toDto));
});

// the photo itself. The URL includes ?v=version, so browsers can cache it for a year.
router.get('/:id/image', async (req, res) => {
  const [rows] = await pool.query('SELECT mime_type, data FROM menu_item_images WHERE item_id = ?', [Number(req.params.id)]);
  if (!rows.length) return res.status(404).end();
  res.set({ 'Content-Type': rows[0].mime_type, 'Cache-Control': 'public, max-age=31536000, immutable' });
  res.send(rows[0].data);
});

module.exports = router;