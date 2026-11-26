// shape the Angular app expects for a menu item
exports.toDto = m => ({
  item_id: m.item_id,
  name: m.name,
  price: m.price,
  category: m.category,
  is_best_seller: !!m.is_best_seller,
  image_url: m.has_image ? `/api/menu/${m.item_id}/image?v=${m.image_version}` : null,
});

exports.toAdminDto = m => ({
  ...exports.toDto(m),
  category_id: m.category_id,
  is_available: !!m.is_available,
});