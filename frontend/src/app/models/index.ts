export type Role = 'user' | 'cashier' | 'admin';

export interface MenuItem {
  item_id: number;
  name: string;
  description?: string | null;
  price: number;
  category: string;
  image_url?: string | null;
  is_best_seller?: boolean;
}

export interface User {
  user_id: number;
  name: string;
  email: string;
  role: Role;
  points: number;
}

export interface CartLine {
  item: MenuItem;
  qty: number;
}
