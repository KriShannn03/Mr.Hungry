import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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

  menuOpen = signal(false);
  profileOpen = signal(false);
  cartOpen = signal(false);

  items = signal<MenuItem[]>([]);
  loading = signal(true);
  error = signal('');
  search = this.menuService.search;
  activeCategory = signal('All');

  categories = computed(() => [
    'All',
    ...new Set(this.items().map(i => i.category)),
  ]);

  visibleItems = computed(() => {
    const text = this.search().trim().toLowerCase();
    if (text) {
      return this.items().filter(i => i.name.toLowerCase().includes(text));
    }
    const cat = this.activeCategory();
    return cat === 'All' ? this.items() : this.items().filter(i => i.category === cat);
  });

  constructor() {
    this.menuService.items().subscribe({
      next: data => { this.items.set(data); this.loading.set(false); },
      error: () => { this.error.set('Could not load the menu.'); this.loading.set(false); },
    });
  }

  toggleMenu() { this.menuOpen.update(v => !v); }
  closeMenu() { this.menuOpen.set(false); }
  toggleProfile() { this.profileOpen.update(v => !v); }
  toggleCart() { this.cartOpen.update(v => !v); }

  logout() {
    this.auth.logout();
    this.profileOpen.set(false);
  }

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
