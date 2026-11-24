import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import QRCode from 'qrcode';
import { AuthService, CartService, MenuService, OrderService } from '../../services';

@Component({
  selector: 'app-qr',
  imports: [RouterLink],
  templateUrl: './qr.html',
  styleUrl: './qr.css'
})
export class Qr implements OnDestroy {
  auth = inject(AuthService);
  cart = inject(CartService);
  private menuService = inject(MenuService);
  private router = inject(Router);

  order = inject(OrderService).last;

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

  // ---------- QR image ----------
  qrImage = signal('');

  // ---------- countdown ----------
  private now = signal(Date.now());
  private timer = setInterval(() => this.now.set(Date.now()), 1000);

  remaining = computed(() => {
    const expires = Date.parse(this.order()?.qr_expires_at ?? '');
    return Number.isNaN(expires) ? 0 : Math.max(0, expires - this.now());
  });

  countdown = computed(() => {
    const total = Math.floor(this.remaining() / 1000);
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return m + ':' + s;
  });

  expired = computed(() => this.order()?.status === 'Pending' && this.remaining() === 0);
  statusLabel = computed(() => (this.expired() ? 'Expired' : this.order()?.status ?? ''));

  constructor() {
    effect(() => {
      const o = this.order();
      if (!o) {
        this.qrImage.set('');
        return;
      }
      QRCode.toDataURL(o.qr_token, { width: 360, margin: 1 }).then((url: string) =>
        this.qrImage.set(url)
      );
    });
  }

  ngOnDestroy() {
    clearInterval(this.timer);
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
