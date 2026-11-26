import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { OrderService } from '../../services';

@Component({
  selector: 'app-active-order',
  imports: [RouterLink],
  template: `
    @if (visible(); as o) {
      <a class="pill" [routerLink]="['/qr', o.order_number]">
        <span class="dot"></span>
        Order #{{ o.order_number }} &middot; Pending &middot; <b>View QR</b>
      </a>
    }
  `,
  styles: `
    .pill {
      position: fixed; right: 16px; bottom: 72px; z-index: 50;
      display: flex; align-items: center; gap: 8px;
      padding: 10px 18px; border-radius: 999px;
      background: #111; color: white; text-decoration: none;
      font-family: 'Montserrat', sans-serif; font-size: 13px;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
    }
    .pill b { color: #35c238; }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: #e8650c; animation: pulse 1.4s infinite; }
    @keyframes pulse { 50% { opacity: 0.3; } }
  `,
})
export class ActiveOrder {
  private orders = inject(OrderService);
  private router = inject(Router);

  private url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  visible = computed(() => {
    const url = this.url();
    const hide = url.startsWith('/qr') || url.startsWith('/history') || url.startsWith('/login');
    return hide ? null : this.orders.active();
  });
}
