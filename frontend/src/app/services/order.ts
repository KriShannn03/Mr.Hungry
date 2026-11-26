import { Injectable, computed, effect, signal } from '@angular/core';

export interface PlacedLine {
  name: string;
  price: number;
  qty: number;
}

export interface PlacedOrder {
  order_id?: number | string;
  order_number: string | number;
  qr_token: string;
  qr_expires_at: string;
  lines: PlacedLine[];
  total: number;
  points_earned: number;
  status: string;
  created_at: string;
}

const KEY = 'mr-hungry-orders';

function load(): PlacedOrder[] {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function isExpired(order: PlacedOrder, now = Date.now()) {
  return order.status === 'Pending' && Date.parse(order.qr_expires_at) <= now;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  orders = signal<PlacedOrder[]>(load());
  now = signal(Date.now());

  last = computed(() => this.orders()[0] ?? null);
  active = computed(
    () => this.orders().find(o => o.status === 'Pending' && !isExpired(o, this.now())) ?? null
  );

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.orders()));
      } catch {
        // storage unavailable: ignore
      }
    });
    setInterval(() => this.now.set(Date.now()), 15000);
  }

  add(order: PlacedOrder) {
    this.orders.update(list => [order, ...list]);
  }

  find(number: string) {
    return this.orders().find(o => String(o.order_number) === number) ?? null;
  }
}
