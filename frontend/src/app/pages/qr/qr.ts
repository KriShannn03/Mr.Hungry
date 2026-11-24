import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import QRCode from 'qrcode';
import { AuthService, CartService, OrderService } from '../../services';

@Component({
  selector: 'app-qr',
  imports: [RouterLink],
  templateUrl: './qr.html',
  styleUrl: './qr.css',
})
export class Qr implements OnInit, OnDestroy {
  private router = inject(Router);
  private auth = inject(AuthService);
  cart = inject(CartService);

  user = this.auth.user;            
  cartCount = this.cart.count;
  order = inject(OrderService).last;   
  profileOpen = signal(false);
  cartOpen = signal(false);

  qrImage = signal('');             // the QR code picture
  secondsLeft = signal(0);

  private timer?: ReturnType<typeof setInterval>;

  expired = computed(() => this.secondsLeft() <= 0);

  // 29:45 style countdown
  countdown = computed(() => {
    const minutes = Math.floor(this.secondsLeft() / 60);
    const seconds = String(this.secondsLeft() % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  });

  // Pending, Completed, Expired or Cancelled
  statusLabel = computed(() => {
    const status = this.order()?.status ?? 'pending';
    if (status === 'pending' && this.expired()) return 'Expired';
    return status.charAt(0).toUpperCase() + status.slice(1);
  });

  ngOnInit() {
    const order = this.order();

    // nothing was ordered, so go back to the menu
    if (!order) {
      this.router.navigate(['/menu']);
      return;
    }

    // the QR code holds the one-time token that the kiosk reads
    QRCode.toDataURL(order.qr_token, {
      width: 360,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#111111', light: '#fdf1e8' },
    }).then(url => this.qrImage.set(url));

    this.updateCountdown();
    this.timer = setInterval(() => this.updateCountdown(), 1000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  private updateCountdown() {
    const expiresAt = Date.parse(this.order()?.qr_expires_at ?? '');
    const seconds = Math.floor((expiresAt - Date.now()) / 1000);

    this.secondsLeft.set(Number.isNaN(seconds) ? 0 : Math.max(0, seconds));
  }

  // ---------- top bar ----------

  toggleProfile() {
    this.profileOpen.update(v => !v);
    this.cartOpen.set(false);
  }

  toggleCart() {
    this.cartOpen.update(v => !v);
    this.profileOpen.set(false);
  }

  closeAll() {
    this.profileOpen.set(false);
    this.cartOpen.set(false);
  }

  // click anywhere outside the profile or cart card closes it
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement | null;

    if (!target?.closest('.profile-btn, .cart-btn')) {
      this.closeAll();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeAll();
  }

  logout() {
    this.auth.logout();
    this.profileOpen.set(false);
  }

  // the X button on the black bar goes back to the menu
  closePage() {
    this.router.navigate(['/menu']);
  }
}