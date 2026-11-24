import { Injectable, signal } from '@angular/core';
import { CartLine } from '../models';

export interface PlacedOrder {
  order_id?: number | string;
  token?: string;
  lines: CartLine[];
  total: number;
  pointsEarned: number;
  status: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  last = signal<PlacedOrder | null>(null);
}
