import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { API_URL, imageUrl } from '../config';
import { Role } from '../models';
import { PlacedLine } from './order';

export interface AdminItem {
  item_id: number;
  name: string;
  description: string | null;
  price: number;
  category_id: number;
  category: string;
  is_best_seller: boolean;
  is_available: boolean;
  image_url: string | null;
}

export interface Category {
  category_id: number;
  name: string;
  item_count: number;
}

export interface VoucherRow {
  voucher_id: number;
  title: string;
  points_cost: number;
  discount_type: 'amount' | 'percent';
  discount_value: number;
  is_active: boolean;
}

export interface UserRow {
  user_id: number;
  name: string;
  email: string;
  role: Role;
  points: number;
  is_active: boolean;
  created_at: string;
}

export interface StaffOrder {
  order_id: number;
  order_number: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  points_earned: number;
  created_at: string;
  completed_at: string | null;
  ordered_by: string;
  has_account: boolean;
  handled_by_name: string | null;
  voucher_title: string | null;
  lines: PlacedLine[];
}

export interface OrderPage {
  orders: StaffOrder[];
  hasMore: boolean;
  retention?: { completed_days: number; expired_days: number };
}

type Params = Record<string, string | number>;

@Injectable({ providedIn: 'root' })
export class StaffApi {
  private http = inject(HttpClient);
  private admin = `${API_URL}/admin`;
  private cashier = `${API_URL}/cashier`;

  // ----- admin: menu -----
  menu() {
    return this.http
      .get<AdminItem[]>(`${this.admin}/menu`)
      .pipe(map(list => list.map(i => ({ ...i, image_url: imageUrl(i.image_url) }))));
  }
  saveItem(id: number | null, form: FormData) {
    return id ? this.http.put(`${this.admin}/menu/${id}`, form) : this.http.post(`${this.admin}/menu`, form);
  }
  deleteItem(id: number) {
    return this.http.delete(`${this.admin}/menu/${id}`);
  }

  // ----- admin: categories -----
  categories() {
    return this.http.get<Category[]>(`${this.admin}/categories`);
  }
  addCategory(name: string) {
    return this.http.post(`${this.admin}/categories`, { name });
  }
  renameCategory(id: number, name: string) {
    return this.http.put(`${this.admin}/categories/${id}`, { name });
  }
  deleteCategory(id: number) {
    return this.http.delete(`${this.admin}/categories/${id}`);
  }

  // ----- admin: vouchers -----
  vouchers() {
    return this.http.get<VoucherRow[]>(`${this.admin}/vouchers`);
  }
  saveVoucher(id: number | null, body: object) {
    return id ? this.http.put(`${this.admin}/vouchers/${id}`, body) : this.http.post(`${this.admin}/vouchers`, body);
  }
  deleteVoucher(id: number) {
    return this.http.delete(`${this.admin}/vouchers/${id}`);
  }

  // ----- admin: logs and accounts -----
  adminOrders(params: Params) {
    return this.http.get<OrderPage>(`${this.admin}/orders`, { params });
  }
  users(role: string, q = '') {
    const params: Record<string, string> = {};
    if (role) params['role'] = role;
    if (q) params['q'] = q;
    return this.http.get<UserRow[]>(`${this.admin}/users`, { params });
  }
  createUser(body: object) {
    return this.http.post(`${this.admin}/users`, body);
  }
  updateUser(id: number, body: object) {
    return this.http.put(`${this.admin}/users/${id}`, body);
  }
  deleteUser(id: number) {
    return this.http.delete(`${this.admin}/users/${id}`);
  }

  // ----- cashier -----
  lookup(code: string) {
    return this.http.get<StaffOrder>(`${this.cashier}/lookup`, { params: { code } });
  }
  complete(id: number) {
    return this.http.post<StaffOrder>(`${this.cashier}/orders/${id}/complete`, {});
  }
  cancel(id: number) {
    return this.http.post<StaffOrder>(`${this.cashier}/orders/${id}/cancel`, {});
  }
  cashierOrders(params: Params) {
    return this.http.get<OrderPage>(`${this.cashier}/orders`, { params });
  }
}
