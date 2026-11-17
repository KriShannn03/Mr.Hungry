import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, CartService, MenuService } from '../../services';
import { MenuItem } from '../../models';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private router = inject(Router);
  private menuService = inject(MenuService);
  private auth = inject(AuthService);
  cart = inject(CartService);

  user = this.auth.user;           
  isLoggedIn = this.auth.isLoggedIn;
  cartCount = this.cart.count;      
  search = this.menuService.search;

  
  menuOpen = signal(typeof window !== 'undefined' && window.innerWidth >= 768);
  profileOpen = signal(false);
  cartOpen = signal(false);

  
  bestSellers = signal<MenuItem[]>([]);
  mustTry = signal<MenuItem[]>([]);
  loading = signal(true);
  error = signal('');

  steps = [
    {
      title: 'Register or continue as guest',
      text: 'Register to earn points on every order, or continue as a guest. Guests cannot save their points.',
    },
    {
      title: 'Pick your order',
      text: 'Browse the best sellers and must-try items, or go to a food category to build your order.',
    },
    {
      title: 'Place the order and get your QR code',
      text: 'Your order is saved as Pending and you get a one-time QR code. It expires after 30 minutes.',
    },
    {
      title: 'Scan, pay, and earn points',
      text: 'Show your QR code at the kiosk and scan it. After you pay, the order is completed and registered users get their points.',
    },
  ];

  contact = {
    facebook: 'Mr Hungry',
    email: 'add your email here',
    address: 'add your address here',
    phone: 'add your number here',
  };

  ngOnInit() {
  this.load();
}

load() {
  this.loading.set(true);
  this.error.set('');

  this.menuService.items().subscribe({
    next: list => {
      const flagged = list.filter(item => item.is_best_seller);
      const best = (flagged.length ? flagged : list).slice(0, 3);

      this.bestSellers.set(best);
      this.mustTry.set(list.filter(item => !best.includes(item)).slice(0, 3));
      this.loading.set(false);
    },
    error: () => {
      this.error.set("We couldn't load the menu right now.");
      this.loading.set(false);
    },
  });
}
  // ---------- top bar ----------

  toggleMenu() { this.menuOpen.update(v => !v); }
  toggleProfile() { this.profileOpen.update(v => !v); this.cartOpen.set(false); }
  toggleCart() { this.cartOpen.update(v => !v); this.profileOpen.set(false); }

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

  // ---------- search ----------

  onSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }

  // pressing Enter opens the menu page with the search applied
  goSearch() {
    this.router.navigate(['/menu']);
  }

  // ---------- cart ----------

  quantityOf(itemId: number) {
    return this.cart.lines().find(line => line.item.item_id === itemId)?.qty ?? 0;
  }

  addItem(item: MenuItem) {
    this.cart.add(item);
  }

  removeItem(item: MenuItem) {
    this.cart.change(item.item_id, -1);
  }

  // ---------- account ----------

  logout() {
    this.auth.logout();
    this.profileOpen.set(false);
  }
}