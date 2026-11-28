import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, CartService, MenuService } from '../../services';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink],
  template: `
    <header class="brand">
      <a class="brand-link" routerLink="/">
        <img class="logo-img" src="/logo.png" alt="Mr. Hungry logo" />
        <p>Mr.Hungry</p>
      </a>
    </header>

    <div class="orange-bar">
      <button type="button" class="menu-btn" (click)="toggleNav()"
              [attr.aria-expanded]="!collapsed()" aria-label="Toggle menu">&#9776;</button>

      <input class="search" type="text" placeholder="Type here" aria-label="Search the menu"
             [value]="search()" (input)="onSearch($event)" />

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

    <nav class="nav" [class.expanded]="!collapsed()">
      <div class="nav-items">
        @for (l of links; track l.path) {
          <button type="button" class="nav-item"
                  [class.hidden]="collapsed() && l.path !== selected()"
                  (click)="pick(l.path)">
            @if (collapsed() && l.path === selected()) {
              <span class="play">&#9654;</span>
            }
            {{ l.label }}
          </button>
        }

        @if (!auth.isLoggedIn()) {
          <a class="nav-register" routerLink="/login" [class.hidden]="collapsed()">REGISTER</a>
        }
      </div>

      <button type="button" class="nav-close" [class.invisible]="!collapsed()"
              (click)="expand()" aria-label="Show all links">&#10005;</button>
    </nav>
  `,
  styles: `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;800;900&family=Krona+One&display=swap');
    :host { display: block; font-family: 'Montserrat', sans-serif; }
    *, *::before, *::after { box-sizing: border-box; }

    /* ---------- brand ---------- */
    .brand { display: flex; align-items: center; padding: 8px 40px; background: white; }
    .brand-link { display: flex; align-items: center; gap: 16px; color: inherit; text-decoration: none; }
    .logo-img { height: 40px; }
    .brand p { margin: 0; font-weight: 900; font-size: 24px; text-transform: uppercase; text-shadow: 2px 2px 4px rgba(0,0,0,.3); }

    /* ---------- orange bar ---------- */
    .orange-bar {
      position: sticky; top: 0; z-index: 20;
      display: flex; align-items: center; gap: 24px;
      background: #e8650c; padding: 8px 40px; box-shadow: 0 0 25px #e8640cb6;
    }
    .menu-btn {
      background: transparent; border: none; cursor: pointer; color: white;
      padding: 0; font-size: 44px; line-height: 1;
      text-shadow: 0 0 6px #fff, 0 0 20px #e8650c, 0 0 40px #e8650c;
    }
    .search {
      flex: 1; min-width: 0; max-width: 720px; margin: 0 auto;
      border: none; border-radius: 999px; padding: 10px 18px;
      background: #fff0e8; font-family: inherit; font-size: 14px;
    }
    .wrap { position: relative; }
    .profile {
      border: none; border-radius: 999px; padding: 8px 14px; background: #ffd9c4;
      font: 800 13px 'Montserrat', sans-serif; white-space: nowrap; cursor: pointer;
    }
    .cart {
      border-radius: 999px; padding: 8px 16px; background: rgba(255,255,255,.35);
      color: #111; text-decoration: none; font-weight: 800; font-size: 16px;
    }
    .popover {
      position: absolute; right: 0; top: 100%; margin-top: 8px; min-width: 200px;
      padding: 12px 14px; background: white; border-radius: 12px;
      box-shadow: 0 6px 18px rgba(0,0,0,.3); font-size: 13px;
    }
    .popover p { margin: 2px 0; }
    .p-name { font-weight: 800; }
    .pop-btn {
      display: block; width: 100%; margin-top: 8px; border: none; border-radius: 999px; padding: 9px 0;
      background: #111; color: white; text-align: center; text-decoration: none;
      font: 800 13px 'Montserrat', sans-serif; cursor: pointer;
    }

    /* ---------- black bar ---------- */
    .nav {
      display: flex; align-items: center; gap: 12px;
      background: linear-gradient(#2a2a2a, #000 60%);
      padding: 12px 40px 12px 100px; overflow: hidden; transition: padding 0.45s ease;
    }
    .nav.expanded { padding: 14px 40px; }
    .nav-items { display: flex; flex: 1; align-items: center; min-width: 0; }

    .nav-item {
      flex: 1 1 0; max-width: 600px; overflow: hidden; white-space: nowrap; padding: 6px 0;
      border: none; background: transparent; color: white;
      font-family: 'Krona One', sans-serif; font-size: 16px;
      text-shadow: 0 0 6px #fff, 0 0 14px #fff; cursor: pointer;
      transition: flex-grow 0.45s ease, max-width 0.45s ease, opacity 0.35s ease;
    }
    .nav-item:hover { color: #e8650c; }
    .nav-item.hidden { flex-grow: 0; max-width: 0; padding: 0; opacity: 0; pointer-events: none; }

    /* the button that stays: always visible, kept on the left */
    .nav-items:has(.hidden) .nav-item:not(.hidden) {
      flex: 0 0 auto; max-width: none; min-width: 140px; text-align: left;
    }

    .play { margin-right: 12px; font-size: 24px; vertical-align: middle; }

    .nav-register {
      flex: none; max-width: 200px; overflow: hidden; white-space: nowrap; margin-left: 12px;
      padding: 8px 22px; border-radius: 999px; background: #1e7a34; color: #111;
      text-decoration: none; font: 800 13px 'Montserrat', sans-serif;
      transition: max-width 0.45s ease, padding 0.45s ease, margin 0.45s ease, opacity 0.35s ease;
    }
    .nav-register.hidden { max-width: 0; padding: 8px 0; margin-left: 0; opacity: 0; pointer-events: none; }

    .nav-close {
      width: 30px; height: 30px; flex: none; border-radius: 50%; border: 2px solid #fbe9c6;
      background: transparent; color: #fbe9c6; font-size: 14px; cursor: pointer; transition: opacity 0.3s;
    }
    .nav-close.invisible { opacity: 0; pointer-events: none; width: 0; border-width: 0; margin: 0; }

    /* ---------- phones ---------- */
    @media (max-width: 767px) {
      .brand { padding: 6px 12px; } .brand p { font-size: 18px; } .logo-img { height: 28px; }
      .orange-bar { padding: 6px 10px; gap: 8px; }
      .menu-btn { font-size: 30px; }
      .search { padding: 7px 12px; font-size: 12px; }
      .profile { max-width: 90px; overflow: hidden; text-overflow: ellipsis; padding: 6px 10px; font-size: 10px; }
      .cart { padding: 6px 10px; font-size: 12px; }
      .nav { padding: 10px 14px; }
      .nav.expanded { padding: 10px 8px; }
      .nav-item { font-size: 10px; }
      .play { margin-right: 6px; font-size: 14px; }
      .nav-register { padding: 5px 10px; font-size: 9px; margin-left: 4px; }
    }
  `,
})
export class SiteHeader {
  auth = inject(AuthService);
  cart = inject(CartService);
  search = inject(MenuService).search;
  private router = inject(Router);

  // the page this header is on, e.g. active="/menu"
  active = input('');
  open = signal(false);

  links = [
    { label: 'Menu', path: '/menu' },
    { label: 'Order', path: '/order' },
    { label: 'Rewards', path: '/rewards' },
    { label: 'History', path: '/history' },
  ];

  navOpen = signal(false);
  private picked = signal('');

  // the link that stays when the bar is collapsed ('' on pages like /account)
  selected = computed(
    () => this.picked() || (this.links.some(l => l.path === this.active()) ? this.active() : '')
  );

  // collapsed = only the current page's link shows, with the arrow and the X
  collapsed = computed(() => !this.navOpen() && this.selected() !== '');

  toggleNav() { this.navOpen.update(v => !v); }
  expand() { this.navOpen.set(true); }

  pick(path: string) {
    if (path === this.selected()) {
      this.navOpen.set(false);
      return;
    }
    this.picked.set(path);
    this.navOpen.set(false);
    setTimeout(() => this.router.navigate([path]), 450);
  }

  onSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
    this.router.navigate(['/menu']);
  }

  logout() {
    this.auth.logout();
    this.open.set(false);
    this.router.navigate(['/']);
  }
}
