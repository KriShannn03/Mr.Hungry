const { validatePassword } = require('../utils/password');
const router = require('express').Router();
const multer = require('multer');
const sharp = require('sharp');
const bcrypt = require('bcryptjs');
const { pool, tx } = require('../db');
const { requireRole } = require('../middleware/auth');
const { httpError } = require('../utils/http');
const { toAdminDto } = require('../utils/menu');
const { listOrders, expireStaleOrders } = require('../utils/orders');

router.use(requireRole('admin'));

// ---------- photos ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) return cb(null, true);
    cb(httpError(400, 'Only JPG, PNG, WEBP or GIF images are allowed.'));
  },
});

// shrink every upload to a small WebP so the database stays light
const processImage = buffer =>
  sharp(buffer).rotate().resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();

const flag = v => (v === true || v === 'true' || v === '1' || v === 1 ? 1 : 0);

function readItem(body = {}) {
  const name = String(body.name || '').trim();
  const description = String(body.description || '').trim();
  const price = Number(body.price);
  const category_id = Number(body.category_id);
  if (!name) throw httpError(400, 'Item name is required.');
  if (description.length > 200) throw httpError(400, 'Description is too long (max 200 characters).');
  if (!Number.isFinite(price) || price < 0 || price > 99999) throw httpError(400, 'Enter a valid price.');
  if (!Number.isInteger(category_id)) throw httpError(400, 'Choose a category.');
  return {
    name,
    description: description || null,
    price: Math.round(price * 100) / 100,
    category_id,
    is_best_seller: flag(body.is_best_seller),
    is_available: body.is_available === undefined ? 1 : flag(body.is_available),
  };
}

const ADMIN_ITEM = `
  SELECT m.item_id, m.name, m.description, m.price, m.category_id, c.name AS category,
         m.is_best_seller, m.is_available, m.has_image, m.image_version
  FROM menu_items m JOIN categories c ON c.category_id = m.category_id`;

async function getItem(id) {
  const [rows] = await pool.query(`${ADMIN_ITEM} WHERE m.item_id = ?`, [id]);
  return rows[0] ? toAdminDto(rows[0]) : null;
}

// ---------- menu items ----------
router.get('/menu', async (req, res) => {
  const [rows] = await pool.query(`${ADMIN_ITEM} ORDER BY c.sort_order, c.category_id, m.item_id`);
  res.json(rows.map(toAdminDto));
});

router.post('/menu', upload.single('image'), async (req, res) => {
  const d = readItem(req.body);
  const img = req.file ? await processImage(req.file.buffer) : null;

  const id = await tx(async conn => {
      const [r] = await conn.query(
      `INSERT INTO menu_items (category_id, name, description, price, is_best_seller, is_available, has_image, image_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [d.category_id, d.name, d.description, d.price, d.is_best_seller, d.is_available, img ? 1 : 0]
    );
    if (img) await conn.execute('INSERT INTO menu_item_images (item_id, mime_type, data) VALUES (?, ?, ?)', [r.insertId, 'image/webp', img]);
    return r.insertId;
  });
  res.status(201).json(await getItem(id));
});

router.put('/menu/:id', upload.single('image'), async (req, res) => {
  const id = Number(req.params.id);
  const d = readItem(req.body);
  const img = req.file ? await processImage(req.file.buffer) : null;
  const removeImg = flag((req.body ?? {}).remove_image) === 1;

  await tx(async conn => {
    const [[exists]] = await conn.query('SELECT item_id FROM menu_items WHERE item_id = ?', [id]);
    if (!exists) throw httpError(404, 'Item not found.');

      await conn.query(
      'UPDATE menu_items SET category_id = ?, name = ?, description = ?, price = ?, is_best_seller = ?, is_available = ? WHERE item_id = ?',
      [d.category_id, d.name, d.description, d.price, d.is_best_seller, d.is_available, id]
    );
    if (img) {
      await conn.execute(
        `INSERT INTO menu_item_images (item_id, mime_type, data) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE mime_type = VALUES(mime_type), data = VALUES(data)`,
        [id, 'image/webp', img]
      );
      await conn.query('UPDATE menu_items SET has_image = 1, image_version = image_version + 1 WHERE item_id = ?', [id]);
    } else if (removeImg) {
      await conn.query('DELETE FROM menu_item_images WHERE item_id = ?', [id]);
      await conn.query('UPDATE menu_items SET has_image = 0, image_version = image_version + 1 WHERE item_id = ?', [id]);
    }
  });
  res.json(await getItem(id));
});

// deleting an item also deletes its photo (ON DELETE CASCADE). Old orders keep their copied name and price.
router.delete('/menu/:id', async (req, res) => {
  await pool.query('DELETE FROM menu_items WHERE item_id = ?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// ---------- categories ----------
router.get('/categories', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.category_id, c.name,
            (SELECT COUNT(*) FROM menu_items m WHERE m.category_id = c.category_id) AS item_count
     FROM categories c ORDER BY c.sort_order, c.category_id`
  );
  res.json(rows);
});

router.post('/categories', async (req, res) => {
  const name = String((req.body ?? {}).name || '').trim();
  if (!name) throw httpError(400, 'Category name is required.');
  await pool.query('INSERT INTO categories (name, sort_order) SELECT ?, COALESCE(MAX(sort_order), 0) + 1 FROM categories', [name]);
  res.status(201).json({ ok: true });
});

router.put('/categories/:id', async (req, res) => {
  const name = String((req.body ?? {}).name || '').trim();
  if (!name) throw httpError(400, 'Category name is required.');
  await pool.query('UPDATE categories SET name = ? WHERE category_id = ?', [name, Number(req.params.id)]);
  res.json({ ok: true });
});

router.delete('/categories/:id', async (req, res) => {
  const id = Number(req.params.id);
  const [[c]] = await pool.query('SELECT COUNT(*) AS n FROM menu_items WHERE category_id = ?', [id]);
  if (c.n > 0) throw httpError(409, 'Move or delete the items in this category first.');
  await pool.query('DELETE FROM categories WHERE category_id = ?', [id]);
  res.json({ ok: true });
});

// ---------- vouchers ----------
function readVoucher(b = {}) {
  const title = String(b.title || '').trim();
  const points_cost = Number(b.points_cost);
  const discount_type = b.discount_type === 'percent' ? 'percent' : 'amount';
  const discount_value = Number(b.discount_value);
  if (!title) throw httpError(400, 'Voucher title is required.');
  if (!Number.isInteger(points_cost) || points_cost < 1) throw httpError(400, 'Points cost must be a whole number, 1 or more.');
  if (!(discount_value > 0) || (discount_type === 'percent' && discount_value > 100)) throw httpError(400, 'Enter a valid discount.');
  return { title, points_cost, discount_type, discount_value, is_active: b.is_active === false || b.is_active === 0 ? 0 : 1 };
}

router.get('/vouchers', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM vouchers ORDER BY points_cost');
  res.json(rows.map(v => ({ ...v, is_active: !!v.is_active })));
});

router.post('/vouchers', async (req, res) => {
  const v = readVoucher(req.body);
  await pool.query(
    'INSERT INTO vouchers (title, points_cost, discount_type, discount_value, is_active) VALUES (?, ?, ?, ?, ?)',
    [v.title, v.points_cost, v.discount_type, v.discount_value, v.is_active]
  );
  res.status(201).json({ ok: true });
});

router.put('/vouchers/:id', async (req, res) => {
  const v = readVoucher(req.body);
  await pool.query(
    'UPDATE vouchers SET title = ?, points_cost = ?, discount_type = ?, discount_value = ?, is_active = ? WHERE voucher_id = ?',
    [v.title, v.points_cost, v.discount_type, v.discount_value, v.is_active, Number(req.params.id)]
  );
  res.json({ ok: true });
});

router.delete('/vouchers/:id', async (req, res) => {
  await pool.query('DELETE FROM vouchers WHERE voucher_id = ?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// ---------- order logs ("Ordered by Guest" / "Ordered by <name>") ----------
router.get('/orders', async (req, res) => {
  await expireStaleOrders();
  res.json(await listOrders(req.query));
});

// ---------- accounts ----------
router.get('/users', async (req, res) => {
  const where = [];
  const args = [];

  if (['user', 'cashier', 'admin'].includes(req.query.role)) {
    where.push('role = ?');
    args.push(req.query.role);
  }

  const q = String(req.query.q || '').trim();
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`;   // treat % and _ as plain characters
    where.push('(name LIKE ? OR email LIKE ?)');
    args.push(like, like);
  }

  const [rows] = await pool.query(
    `SELECT user_id, name, email, role, points, is_active, created_at FROM users
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY FIELD(role, 'admin', 'cashier', 'user'), name
     LIMIT 200`,
    args
  );
  res.json(rows.map(u => ({ ...u, is_active: !!u.is_active })));
});

// create a cashier or another admin
router.post('/users', async (req, res) => {
  const b = req.body ?? {};
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  const role = b.role === 'admin' ? 'admin' : 'cashier';
  if (name.length < 2) throw httpError(400, 'Enter a name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, 'Enter a valid email address.');
  validatePassword(password);
  const hash = await bcrypt.hash(password, 10);
  await pool.query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [name, email, hash, role]);
  res.status(201).json({ ok: true });
});

router.put('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body ?? {};
  if (id === req.user.user_id) throw httpError(400, 'Use "My account" to change your own account.');

  const sets = [];
  const args = [];
  if (b.is_active !== undefined) { sets.push('is_active = ?'); args.push(b.is_active ? 1 : 0); }
  if (['user', 'cashier', 'admin'].includes(b.role)) { sets.push('role = ?'); args.push(b.role); }
  if (b.new_password) {
    validatePassword(b.new_password);
    sets.push('password_hash = ?');
    args.push(await bcrypt.hash(String(b.new_password), 10));
  }
  if (!sets.length) throw httpError(400, 'Nothing to change.');
  await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE user_id = ?`, [...args, id]);
  res.json({ ok: true });
});

router.delete('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.user_id) throw httpError(400, "You can't delete your own account.");
  await pool.query('DELETE FROM users WHERE user_id = ?', [id]);
  res.json({ ok: true });
});

module.exports = router;