export interface MenuItem {
  item_id: number;
  name: string;
  price: number;
  category: string;
  image_url?: string | null;
  is_best_seller?: boolean;
}

export interface User {
  name: string;
  email: string;
  points: number;
}

export interface CartLine {
  item: MenuItem;
  qty: number;
}
