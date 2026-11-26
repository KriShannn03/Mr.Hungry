import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, CartService, MenuService } from '../../services';
import { MenuItem } from '../../models';

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

  // ---------- menu data (comes from the database) ----------
  items = signal<MenuItem[]>([]);
  loading = signal(true);
  error = signal('');
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
      next: data => {
        this.items.set(data);
        this.activeCategory.set(data[0]?.category ?? '');
        this.loading.set(false);
      },
      error: () => {
        this.error.set("We couldn't load the menu right now. Please try again in a moment.");
        this.loading.set(false);
      },
    });
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
