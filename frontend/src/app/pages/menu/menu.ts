import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, CartService, MenuService } from '../../services';
import { MenuItem } from '../../models';


// the official Mr Hungry menu (name, price)
const SAMPLE_CATEGORIES: Record<string, [string, number][]> = {
  'Pasta': [
    ['Classic Spaghetti', 119],
    ['Cheesy Baked Spaghetti', 149],
    ['Creamy Carbonara', 139],
    ['Creamy Tuna Pesto', 139],
  ],
  'Chicken Wings': [
    ['CW Solo (4 pcs, 1 flavor)', 115],
    ['CW Barkada (8 pcs, 3 flavors)', 225],
    ['CW Family (12 pcs, 3 flavors)', 335],
    ['CW 4 pcs with Fries', 209],
  ],
  'Rice Meals': [
    ['Classic Grilled Liempo Plate', 129],
    ['Signature Grilled Chicken Plate', 129],
    ['Tonkatsu Meal', 139],
    ['Creamy Beef and Mushroom Plate', 169],
    ['Hungarian Sausage with Egg', 129],
    ['Longganisa with Egg', 99],
    ['Japanese Sausage with Egg', 99],
    ['Chicken Poppers with Egg', 99],
    ['2 pcs Chicken Wings with Rice', 99],
  ],
  'Snacks': [
    ['French Fries Regular', 99],
    ['French Fries Overload', 139],
    ['Nachos Overload', 139],
    ['Loaded Hungarian Sausage', 139],
    ['Hungarian Sausage Sandwich', 109],
    ['Tacos (1 pc)', 99],
    ['Tacos (2 pcs)', 189],
    ['Tacos (3 pcs)', 278],
  ],
  'Quesadilla': [
    ['Cheese Quesadilla', 109],
    ['Pepperoni Quesadilla', 139],
    ['Hawaiian Quesadilla', 129],
    ['Mr Hungry Supreme Quesadilla', 149],
  ],
  'Combo Meals': [
    ['Italian Spaghetti with 2 pcs Chicken Wings', 199],
    ['Baked Spaghetti with 2 pcs Chicken Wings', 219],
    ['Carbonara with 2 pcs Chicken Wings', 209],
    ['Tuna Pesto with 2 pcs Chicken Wings', 219],
  ],
  'Salad': [
    ['Egg and Crabstick Salad', 139],
    ['Tuna Salad', 139],
  ],
  'Student Meals': [
    ['Ham and Egg with Rice', 79],
    ['Chicken Poppers with Rice', 79],
    ['Longganisa with Rice', 79],
    ['Japanese Sausage with Rice', 79],
    ['2 pcs Chicken Wings with Rice', 89],
    ['Hungarian Sausage with Rice', 99],
    ['Spam and Egg with Rice', 99],
  ],
  'Add-Ons': [
    ['Rice', 20],
    ['Fried Egg', 20],
    ['Cheese', 20],
    ['Coke', 20],
    ['Garlic Bread', 15],
  ],
};

// items with a crown on the printed menu (these show on the home page as Best Sellers)
const BEST_SELLERS = [
  'Creamy Carbonara',
  'Tonkatsu Meal',
  'French Fries Overload',
  'Mr Hungry Supreme Quesadilla',
  'Chicken Poppers with Rice',
];

function buildSample(): MenuItem[] {
  let id = 1;
  const list: MenuItem[] = [];
  for (const [category, foods] of Object.entries(SAMPLE_CATEGORIES)) {
    foods.forEach(([name, price]) => {
      list.push({ item_id: id++, name, price, category, image_url: null, is_best_seller: BEST_SELLERS.includes(name) });
    });
  }
  return list;
}

@Component({
  selector: 'app-menu',
  imports: [RouterLink],
  templateUrl: './menu.html',
  styleUrl: './menu.css'
})
export class Menu {
  auth = inject(AuthService);
  cart = inject(CartService);
  private menuService = inject(MenuService);
  private router = inject(Router);

  profileOpen = signal(false);
  cartOpen = signal(false);

  // ---------- black bar ----------
  links = [
    { label: 'Home', path: '/' },
    { label: 'Menu', path: '/menu' },
    { label: 'Order', path: '/order' },
    { label: 'Rewards', path: '/rewards' },
    { label: 'History', path: '/history' },
  ];

  navOpen = signal(false);
  selected = signal('/menu');

  toggleNav() { this.navOpen.update(v => !v); }
  expandNav() { this.navOpen.set(true); }

  pick(path: string) {
    this.selected.set(path);
    this.navOpen.set(false);    // the others slide away

    if (path !== '/menu') {
      setTimeout(() => this.router.navigate([path]), 450);
    }
  }

  // ---------- menu data ----------
  items = signal<MenuItem[]>([]);
  loading = signal(true);
  search = this.menuService.search;
  activeCategory = signal('');

  categories = computed(() => [...new Set(this.items().map(i => i.category))]);

  visibleItems = computed(() => {
    const text = this.search().trim().toLowerCase();
    if (text) {
      return this.items().filter(i => i.name.toLowerCase().includes(text));
    }
    return this.items().filter(i => i.category === this.activeCategory());
  });

  constructor() {
    this.menuService.items().subscribe({
      next: data => this.show(data),
      error: () => this.show(buildSample()),
    });
  }

  private show(data: MenuItem[]) {
    this.items.set(data);
    this.activeCategory.set(data[0]?.category ?? '');
    this.loading.set(false);
  }

  // ---------- top bar ----------
  toggleProfile() { this.profileOpen.update(v => !v); this.cartOpen.set(false); }
  toggleCart() { this.cartOpen.update(v => !v); this.profileOpen.set(false); }

  logout() {
    this.auth.logout();
    this.profileOpen.set(false);
  }

  // ---------- search and cart ----------
  onSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }

  selectCategory(category: string) {
    this.search.set('');
    this.activeCategory.set(category);
  }

  quantityOf(id: number) { return this.cart.quantityOf(id); }
  addItem(item: MenuItem) { this.cart.add(item); }
  removeItem(item: MenuItem) { this.cart.change(item.item_id, -1); }
}