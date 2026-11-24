import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, CartService, MenuService } from '../../services';
import { MenuItem } from '../../models';

const PESOS_PER_POINT = 10; // assumption: 1 point for every P10 spent. Change to match your rewards rule.

@Component({
  selector: 'app-order',
  imports: [RouterLink],
  templateUrl: './order.html',
  styleUrl: './order.css'
})
export class Order {
  auth = inject(AuthService);
  cart = inject(CartService);
  private menuService = inject(MenuService);
  private router = inject(Router);

  profileOpen = signal(false);
  cartOpen = signal(false);

  // ---------- black bar (same as menu) ----------
  links = [
    { label: 'Menu', path: '/menu' },
    { label: 'Order', path: '/order' },
    { label: 'Rewards', path: '/rewards' },
    { label: 'History', path: '/history' },
  ];

  navOpen = signal(false);
  selected = signal('/order');

  toggleNav() { this.navOpen.update(v => !v); }
  expandNav() { this.navOpen.set(true); }

  pick(path: string) {
    this.selected.set(path);
    this.navOpen.set(false);

    if (path !== '/order') {
      setTimeout(() => this.router.navigate([path]), 450);
    }
  }

  // ---------- order summary ----------
  subtotal = computed(() => this.cart.subtotal());
  rewardDiscount = computed(() => 0);   // TODO: replace with the real reward discount
  total = computed(() => Math.max(0, this.subtotal() - this.rewardDiscount()));
  pointsEarned = computed(() => this.auth.isLoggedIn() ? Math.floor(this.total() / PESOS_PER_POINT) : 0);

  placing = signal(false);

  placeOrder() {
    if (this.cart.count() === 0 || this.placing()) return;
    this.placing.set(true);
    // TODO: send the order with your order service, then go to your QR code page
  }

  // ---------- top bar ----------
  toggleProfile() { this.profileOpen.update(v => !v); this.cartOpen.set(false); }
  toggleCart() { this.cartOpen.update(v => !v); this.profileOpen.set(false); }

  logout() {
    this.auth.logout();
    this.profileOpen.set(false);
  }

  // typing in the search bar sends the person to the menu with the results
  search = this.menuService.search;
  onSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
    this.router.navigate(['/menu']);
  }

  // ---------- cart lines ----------
  addItem(item: MenuItem) { this.cart.add(item); }
  removeItem(item: MenuItem) { this.cart.change(item.item_id, -1); }
}