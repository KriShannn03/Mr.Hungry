import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { API_URL } from '../config';
import { AuthService } from './auth';

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
  subtotal?: number;
  discount?: number;
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
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  orders = signal<PlacedOrder[]>(load());
  now = signal(Date.now());

  last = computed(() => this.orders()[0] ?? null);
  active = computed(
    () => this.orders().find(o => o.status === 'Pending' && !isExpired(o, this.now())) ?? null
  );

  private userId = computed(() => this.auth.user()?.user_id ?? null);
  private hadUser = this.userId() !== null;

  constructor() {
    // keep a copy on this device (guests rely on it to reopen their QR code)
    effect(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.orders()));
      } catch {
        // storage unavailable: ignore
      }
    });

    // logged in -> load my orders from the server. Logged out -> clear them from this device.
    effect(() => {
      const id = this.userId();
      untracked(() => {
        if (id !== null) this.loadMine();
        else if (this.hadUser) this.orders.set([]);
        this.hadUser = id !== null;
      });
    });

    setInterval(() => this.now.set(Date.now()), 15000);
    setInterval(() => this.refreshPending(), 6000); // picks up "Completed" after the cashier scans
  }

  // items are sent as ids and quantities only. The server decides the prices.
  place(items: { item_id: number; qty: number }[], userVoucherId: number | null) {
    return this.http
      .post<PlacedOrder>(`${API_URL}/orders`, { items, user_voucher_id: userVoucherId })
      .pipe(tap(order => this.add(order)));
  }

  add(order: PlacedOrder) {
    this.orders.update(list => [order, ...list]);
  }

  find(number: string) {
    return this.orders().find(o => String(o.order_number) === number) ?? null;
  }

  loadMine() {
    this.http.get<PlacedOrder[]>(`${API_URL}/orders/mine`).subscribe({
      next: list => this.orders.set(list),
      error: () => {},
    });
  }

  refresh(token: string) {
    this.http.get<PlacedOrder>(`${API_URL}/orders/status/${token}`).subscribe({
      next: fresh => {
        const old = this.orders().find(o => o.qr_token === token);
        this.orders.update(list => list.map(o => (o.qr_token === token ? fresh : o)));
        if (old?.status === 'Pending' && fresh.status === 'Completed' && this.auth.isLoggedIn()) {
          this.auth.refresh(); // new points
        }
      },
      error: () => {},
    });
  }

  refreshPending() {
    const cutoff = Date.now() - 60_000;
    for (const o of this.orders()) {
      if (o.status === 'Pending' && Date.parse(o.qr_expires_at) > cutoff) this.refresh(o.qr_token);
    }
  }
}
