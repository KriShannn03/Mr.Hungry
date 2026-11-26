import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService, CartService, MenuService, OrderService } from '../../services';
import { PlacedOrder, isExpired } from '../../services/order';

@Component({
  selector: 'app-history',
  imports: [RouterLink, DatePipe],
  templateUrl: './history.html',
  styleUrl: './history.css'
})
export class History {
  auth = inject(AuthService);
  cart = inject(CartService);
  private menuService = inject(MenuService);
  private router = inject(Router);
  private orderService = inject(OrderService);

  orders = this.orderService.orders;

  profileOpen = signal(false);
  cartOpen = signal(false);

  // ---------- black bar ----------
  links = [
    { label: 'Menu', path: '/menu' },
    { label: 'Order', path: '/order' },
    { label: 'Rewards', path: '/rewards' },
    { label: 'History', path: '/history' },
  ];

  navOpen = signal(false);
  selected = signal('/history');

  toggleNav() { this.navOpen.update(v => !v); }
  expandNav() { this.navOpen.set(true); }

  pick(path: string) {
    this.selected.set(path);
    this.navOpen.set(false);
    if (path !== '/history') {
      setTimeout(() => this.router.navigate([path]), 450);
    }
  }

  // ---------- orders ----------
  openNumber = signal('');

  statusOf(o: PlacedOrder) {
    return isExpired(o, this.orderService.now()) ? 'Expired' : o.status;
  }

  isPending(o: PlacedOrder) { return this.statusOf(o) === 'Pending'; }
  isOpen(o: PlacedOrder) { return this.openNumber() === String(o.order_number); }

  toggle(o: PlacedOrder) {
    const n = String(o.order_number);
    this.openNumber.update(v => (v === n ? '' : n));
  }

  clearHistory() {
    if (confirm('Delete all past orders from this device?')) {
      this.orderService.orders.set([]);
    }
  }

  // ---------- top bar ----------
  toggleProfile() { this.profileOpen.update(v => !v); this.cartOpen.set(false); }
  toggleCart() { this.cartOpen.update(v => !v); this.profileOpen.set(false); }

  logout() {
    this.auth.logout();
    this.profileOpen.set(false);
  }

  search = this.menuService.search;
  onSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
    this.router.navigate(['/menu']);
  }
}
