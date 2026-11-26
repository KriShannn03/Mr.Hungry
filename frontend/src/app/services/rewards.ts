import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config';

export interface Voucher {
  voucher_id: number;
  title: string;
  points_cost: number;
  discount_type: 'amount' | 'percent';
  discount_value: number;
}

export interface MyVoucher {
  user_voucher_id: number;
  title: string;
  discount_type: 'amount' | 'percent';
  discount_value: number;
  status: 'Available' | 'Reserved' | 'Used';
  claimed_at: string;
}

export function describeVoucher(v: { discount_type: string; discount_value: number }) {
  return v.discount_type === 'percent' ? `${v.discount_value}% off your order` : `₱${v.discount_value} off your order`;
}

@Injectable({ providedIn: 'root' })
export class RewardsService {
  private http = inject(HttpClient);

  catalog() {
    return this.http.get<Voucher[]>(`${API_URL}/rewards`);
  }
  mine() {
    return this.http.get<MyVoucher[]>(`${API_URL}/rewards/mine`);
  }
  claim(id: number) {
    return this.http.post<{ message: string; points: number }>(`${API_URL}/rewards/${id}/claim`, {});
  }
}
