import { Injectable, computed, signal } from '@angular/core';
import { CartLine, MenuItem } from '../models';

@Injectable({ providedIn: 'root' })
export class CartService {
  lines = signal<CartLine[]>([]);

  count = computed(() => this.lines().reduce((n, l) => n + l.qty, 0));
  subtotal = computed(() => this.lines().reduce((s, l) => s + l.item.price * l.qty, 0));

  quantityOf(id: number) {
    return this.lines().find(l => l.item.item_id === id)?.qty ?? 0;
  }

  add(item: MenuItem) {
    this.lines.update(lines => {
      const found = lines.find(l => l.item.item_id === item.item_id);
      return found
        ? lines.map(l => (l === found ? { ...l, qty: l.qty + 1 } : l))
        : [...lines, { item, qty: 1 }];
    });
  }

  change(itemId: number, amount: number) {
    this.lines.update(lines =>
      lines
        .map(l => (l.item.item_id === itemId ? { ...l, qty: l.qty + amount } : l))
        .filter(l => l.qty > 0)
    );
  }

  clear() {
    this.lines.set([]);
  }
}
