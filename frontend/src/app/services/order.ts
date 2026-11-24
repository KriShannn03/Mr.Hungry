import { Injectable, effect, signal } from '@angular/core';

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

const KEY = 'mr-hungry-last-order';

function load(): PlacedOrder | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PlacedOrder) : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  last = signal<PlacedOrder | null>(load());

  constructor() {
    effect(() => {
      const order = this.last();
      try {
        if (order) localStorage.setItem(KEY, JSON.stringify(order));
        else localStorage.removeItem(KEY);
      } catch {
        // storage unavailable: ignore
      }
    });
  }
}
