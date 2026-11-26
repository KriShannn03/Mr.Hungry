import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { SiteHeader } from '../../components/site-header/site-header';
import { AuthService, MyVoucher, RewardsService, Voucher, describeVoucher } from '../../services';

@Component({
  selector: 'app-rewards',
  imports: [SiteHeader, RouterLink],
  template: `
    <div class="page">
      <app-site-header active="/rewards" />
      <main class="main">
        <h1>Rewards</h1>

        <div class="balance">
          <span>Your points</span>
          <b>{{ auth.user()?.points ?? 0 }}</b>
        </div>

        @if (message()) { <p class="msg" [class.bad]="isError()">{{ message() }}</p> }

        <h2>Claim a voucher</h2>
        <div class="grid">
          @for (v of catalog(); track v.voucher_id) {
            <article class="card">
              <h3>{{ v.title }}</h3>
              <p>{{ describe(v) }}</p>
              <button type="button" [disabled]="busy() || (auth.user()?.points ?? 0) < v.points_cost" (click)="claim(v)">
                Claim &middot; {{ v.points_cost }} pts
              </button>
            </article>
          } @empty {
            <p class="note">No vouchers are available right now.</p>
          }
        </div>

        <h2>My vouchers</h2>
        <div class="grid">
          @for (m of mine(); track m.user_voucher_id) {
            <article class="card mine" [class.used]="m.status === 'Used'">
              <h3>{{ m.title }}</h3>
              <p>{{ describe(m) }}</p>
              <span class="status">{{ m.status === 'Reserved' ? 'In a pending order' : m.status }}</span>
            </article>
          } @empty {
            <p class="note">You haven't claimed any vouchers yet.</p>
          }
        </div>
        <p class="note">Claimed vouchers can be chosen on the <a routerLink="/order">Order</a> page before you place your order.</p>
      </main>
    </div>
  `,
  styles: `
    :host { display: block; }
    .page { min-height: 100vh; background: linear-gradient(#f6dcb4, #fbe9c6 220px); font-family: 'Montserrat', sans-serif; color: #111; }
    .main { max-width: 940px; margin: 0 auto; padding: 24px 16px 60px; }
    h1 { margin: 0 0 16px; color: white; font-weight: 900; font-size: 44px; text-shadow: 3px 3px 0 rgba(0,0,0,.35); }
    h2 { margin: 28px 0 12px; font-size: 20px; font-weight: 800; }
    .balance { display: flex; justify-content: space-between; align-items: center; background: #2c8040; color: white; border-radius: 18px; padding: 18px 28px; font-weight: 600; box-shadow: 0 8px 14px rgba(0,0,0,.15); }
    .balance b { font-size: 40px; }
    .msg { padding: 10px 14px; border-radius: 10px; background: #d6f2dc; color: #14572a; font-weight: 700; }
    .msg.bad { background: #ffd9d4; color: #8a1c10; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
    .card { background: #fdf1ea; border-radius: 16px; padding: 16px 18px; box-shadow: -3px 3px 0 #111; }
    .card h3 { margin: 0 0 4px; font-size: 16px; font-weight: 800; }
    .card p { margin: 0 0 12px; font-size: 14px; }
    .card button { border: none; border-radius: 999px; padding: 9px 18px; background: #111; color: white; font: 800 13px 'Montserrat', sans-serif; cursor: pointer; }
    .card button:disabled { opacity: .4; cursor: default; }
    .mine .status { font-size: 12px; font-weight: 800; color: #1e7a34; }
    .mine.used { opacity: .55; }
    .note { font-size: 14px; font-weight: 600; } .note a { color: #b5471f; font-weight: 800; }
  `,
})
export class Rewards implements OnInit {
  auth = inject(AuthService);
  private rewards = inject(RewardsService);

  catalog = signal<Voucher[]>([]);
  mine = signal<MyVoucher[]>([]);
  busy = signal(false);
  message = signal('');
  isError = signal(false);

  describe = describeVoucher;

  ngOnInit() {
    this.auth.refresh();
    this.rewards.catalog().subscribe(list => this.catalog.set(list));
    this.loadMine();
  }

  loadMine() {
    this.rewards.mine().subscribe(list => this.mine.set(list));
  }

  claim(v: Voucher) {
    this.busy.set(true);
    this.message.set('');
    this.rewards.claim(v.voucher_id).subscribe({
      next: r => {
        this.busy.set(false);
        this.isError.set(false);
        this.message.set(`${r.message} You now have ${r.points} points.`);
        this.auth.refresh();
        this.loadMine();
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.isError.set(true);
        this.message.set(e.error?.message ?? 'Could not claim that voucher.');
      },
    });
  }
}
