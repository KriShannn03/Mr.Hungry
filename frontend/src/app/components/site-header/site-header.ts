import { Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, CartService, MenuService } from '../../services';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink],
  template: `
    <header class="brand">
      <a class="brand-link" routerLink="/">
        <img class="logo-img" src="/logo.png" alt="Mr. Hungry logo" />
        <p>Mr. Hungry</p>
      </a>
    </header>

    <div class="orange-bar">
      <input class="search" type="text" placeholder="Search the menu" aria-label="Search the menu" (input)="onSearch($event)" />

      <div class="wrap">
        <button type="button" class="profile" (click)="open.set(!open())">&#128100; {{ auth.user()?.name ?? 'Guest' }}</button>
        @if (open()) {
          <div class="popover">
            @if (auth.user(); as u) {
              <p class="p-name">{{ u.name }}</p>
              <p>{{ u.email }}</p>
              @if (u.role === 'user') { <p>{{ u.points }} points</p> }
              <a class="pop-btn" routerLink="/account">My account</a>
              @if (u.role === 'admin') { <a class="pop-btn" routerLink="/admin">Admin dashboard</a> }
              @if (u.role !== 'user') { <a class="pop-btn" routerLink="/cashier">Cashier dashboard</a> }
              <button type="button" class="pop-btn" (click)="logout()">Log out</button>
            } @else {
              <p>You are ordering as a guest. Register to earn points.</p>
              <a class="pop-btn" routerLink="/login">Login or Register</a>
            }
          </div>
        }
      </div>

      <a class="cart" routerLink="/order">{{ cart.count() }} &#128722;</a>
    </div>

    <nav class="nav">
      @for (l of links; track l.path) {
        <a [routerLink]="l.path" [class.on]="l.path === active()">{{ l.label }}</a>
      }
      @if (!auth.isLoggedIn()) { <a routerLink="/login" class="register">REGISTER</a> }
    </nav>
  `,
  styles: `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;800;900&family=Krona+One&display=swap');
    :host { display: block; font-family: 'Montserrat', sans-serif; }
    .brand { display: flex; align-items: center; padding: 8px 40px; background: white; }
    .brand-link { display: flex; align-items: center; gap: 16px; color: inherit; text-decoration: none; }
    .logo-img { height: 40px; }
    .brand p { margin: 0; font-weight: 900; font-size: 24px; text-transform: uppercase; text-shadow: 2px 2px 4px rgba(0,0,0,.3); }
    .orange-bar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 16px; background: #e8650c; padding: 8px 40px; box-shadow: 0 0 25px #e8640cb6; }
    .search { flex: 1; min-width: 0; max-width: 720px; margin: 0 auto; border: none; border-radius: 999px; padding: 10px 18px; background: #fff0e8; font-family: inherit; font-size: 14px; }
    .wrap { position: relative; }
    .profile { border: none; border-radius: 999px; padding: 8px 14px; background: #ffd9c4; font: 800 13px 'Montserrat', sans-serif; white-space: nowrap; cursor: pointer; }
    .cart { border-radius: 999px; padding: 8px 16px; background: rgba(255,255,255,.35); color: #111; text-decoration: none; font-weight: 800; font-size: 16px; }
    .popover { position: absolute; right: 0; top: 100%; margin-top: 8px; min-width: 200px; padding: 12px 14px; background: white; border-radius: 12px; box-shadow: 0 6px 18px rgba(0,0,0,.3); font-size: 13px; }
    .popover p { margin: 2px 0; }
    .p-name { font-weight: 800; }
    .pop-btn { display: block; width: 100%; margin-top: 8px; border: none; border-radius: 999px; padding: 9px 0; background: #111; color: white; text-align: center; text-decoration: none; font: 800 13px 'Montserrat', sans-serif; cursor: pointer; }
    .nav { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 28px; background: linear-gradient(#2a2a2a, #000 60%); padding: 12px 40px; }
    .nav a { color: white; text-decoration: none; font: 16px 'Krona One', sans-serif; text-shadow: 0 0 6px #fff, 0 0 14px #fff; }
    .nav a:hover, .nav a.on { color: #e8650c; }
    .nav .register { margin-left: auto; background: #1e7a34; color: #111; padding: 8px 22px; border-radius: 999px; font: 800 13px 'Montserrat', sans-serif; text-shadow: none; }
    @media (max-width: 767px) {
      .brand { padding: 6px 12px; } .brand p { font-size: 18px; } .logo-img { height: 28px; }
      .orange-bar { padding: 6px 10px; gap: 8px; } .profile { max-width: 90px; overflow: hidden; text-overflow: ellipsis; font-size: 10px; }
      .nav { padding: 10px 14px; gap: 6px 16px; } .nav a { font-size: 11px; }
    }
  `,
})
export class SiteHeader {
  auth = inject(AuthService);
  cart = inject(CartService);
  private menu = inject(MenuService);
  private router = inject(Router);

  active = input('');
  open = signal(false);

  links = [
    { label: 'Menu', path: '/menu' },
    { label: 'Order', path: '/order' },
    { label: 'Rewards', path: '/rewards' },
    { label: 'History', path: '/history' },
  ];

  onSearch(event: Event) {
    this.menu.search.set((event.target as HTMLInputElement).value);
    this.router.navigate(['/menu']);
  }

  logout() {
    this.auth.logout();
    this.open.set(false);
    this.router.navigate(['/']);
  }
}
