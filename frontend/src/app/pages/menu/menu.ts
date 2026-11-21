import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, CartService, MenuService } from '../../services';
import { MenuItem } from '../../models';


const SAMPLE_CATEGORIES: Record<string, [string, number][]> = {
  'Pasta': [['Carbonara', 149], ['Spaghetti', 129], ['Baked Mac', 139]],
  'Chicken Wings': [['Buffalo Wings', 189], ['Garlic Parmesan Wings', 199]],
  'Rice Meals': [['Chicken Rice Bowl', 119], ['Pork Silog', 109], ['Beef Tapa', 129]],
  'Snacks': [['French Fries', 79], ['Nachos', 99]],
  'Quesadilla': [['Mr Hungry Special Quesadilla', 149], ['Cheese Quesadilla', 119]],
  'Combo Meals': [['Combo A', 199], ['Combo B', 229]],
  'Salad': [['Garden Salad', 89], ['Caesar Salad', 109]],
};

function buildSample(): MenuItem[] {
  let id = 1;
  const list: MenuItem[] = [];
  for (const [category, foods] of Object.entries(SAMPLE_CATEGORIES)) {
    foods.forEach(([name, price], i) => {
      list.push({ item_id: id++, name, price, category, image_url: null, is_best_seller: i === 0 });
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