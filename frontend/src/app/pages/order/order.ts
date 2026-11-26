import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService, CartService, MenuService, MyVoucher, OrderService, RewardsService } from '../../services';
import { MenuItem } from '../../models';
import { PESOS_PER_POINT } from '../../config';

@Component({
  selector: 'app-order',
  imports: [RouterLink],
  templateUrl: './order.html',
  styleUrl: './order.css'
})
export class Order implements OnInit {
  auth = inject(AuthService);
  cart = inject(CartService);
  private menuService = inject(MenuService);
  private router = inject(Router);
  private orders = inject(OrderService);
  private rewards = inject(RewardsService);

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

  // ---------- vouchers (registered users only) ----------
  vouchers = signal<MyVoucher[]>([]);
  voucherId = signal<number | null>(null);

  ngOnInit() {
    if (this.auth.user()?.role === 'user') {
      this.rewards.mine().subscribe({
        next: list => this.vouchers.set(list.filter(v => v.status === 'Available')),
        error: () => {},
      });
    }
  }

  onVoucher(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.voucherId.set(value ? Number(value) : null);
  }

  // ---------- order summary ----------
  subtotal = computed(() => this.cart.subtotal());

  rewardDiscount = computed(() => {
    const v = this.vouchers().find(x => x.user_voucher_id === this.voucherId());
    if (!v) return 0;
    const sub = this.subtotal();
    const d = v.discount_type === 'percent' ? Math.round(sub * v.discount_value) / 100 : v.discount_value;
    return Math.min(d, sub);
  });

  total = computed(() => Math.max(0, this.subtotal() - this.rewardDiscount()));
  pointsEarned = computed(() =>
    this.auth.user()?.role === 'user' ? Math.floor(this.total() / PESOS_PER_POINT) : 0
  );

  placing = signal(false);
  error = signal('');

  placeOrder() {
    if (this.cart.count() === 0 || this.placing()) return;
    this.placing.set(true);
    this.error.set('');

    // only ids and quantities are sent. The server looks up the real prices.
    const items = this.cart.lines().map(l => ({ item_id: l.item.item_id, qty: l.qty }));

    this.orders.place(items, this.voucherId()).subscribe({
      next: order => {
        this.cart.clear();
        this.placing.set(false);
        this.router.navigate(['/qr', order.order_number]);
      },
      error: (e: HttpErrorResponse) => {
        this.placing.set(false);
        // drop items the admin removed or hid since they were added to the cart
        for (const id of (e.error?.unavailable ?? []) as number[]) {
          const qty = this.cart.quantityOf(id);
          if (qty) this.cart.change(id, -qty);
        }
        this.error.set(e.error?.message ?? 'Could not place your order. Please try again.');
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
