import { Component, ElementRef, OnDestroy, OnInit, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import jsQR from 'jsqr';
import { AuthService } from '../../services';
import { StaffApi, StaffOrder } from '../../services/staff';

type Tab = 'scan' | 'history';

@Component({
  selector: 'app-cashier',
  imports: [FormsModule, DatePipe, RouterLink],
  styleUrl: '../staff.css',
  template: `
    <header class="top">
      <div class="logo"><img src="/logo.png" alt="" /> Mr. Hungry <span class="tag">CASHIER</span></div>
      <nav class="tabs">
        <button type="button" [class.on]="tab() === 'scan'" (click)="go('scan')">Scan order</button>
        <button type="button" [class.on]="tab() === 'history'" (click)="go('history')">History</button>
      </nav>
      <div class="who">
        <span>{{ auth.user()?.name }}</span>
        @if (auth.user()?.role === 'admin') { <a routerLink="/admin">Admin</a> }
        <a routerLink="/account">My account</a>
        <button type="button" class="btn dark" (click)="logout()">Log out</button>
      </div>
    </header>

    <main class="body">
      @if (info()) { <p class="alert good">{{ info() }}</p> }
      @if (error()) { <p class="alert bad">{{ error() }}</p> }

      <!-- the video element stays in the page so the camera can attach to it -->
      <section class="panel" [hidden]="tab() !== 'scan'">
        <div class="scan-grid">

          <div>
            <h2>Scan the customer's QR code</h2>
            <div class="video-box">
              <video #video playsinline muted [hidden]="!scanning()"></video>
              @if (!scanning()) { <span>Camera is off</span> }
            </div>
            <div class="row">
              @if (!scanning()) {
                <button type="button" class="btn" (click)="startCamera()">Start camera</button>
              } @else {
                <button type="button" class="btn ghost" (click)="stopCamera()">Stop camera</button>
              }
            </div>

            <h2 style="margin-top:20px">Or type / scan with a barcode scanner</h2>
            <div class="row">
              <input #code class="inp" style="flex:1" placeholder="Order number or scanned code" autofocus
                     (keydown.enter)="lookup(code.value); code.value = ''" />
              <button type="button" class="btn" (click)="lookup(code.value); code.value = ''">Find</button>
            </div>
          </div>

          <div>
            @if (order(); as o) {
              <div class="ticket">
                <h2>
                  <span>Order #{{ o.order_number }}</span>
                  <span class="pill" [class]="'pill ' + o.status.toLowerCase()">{{ o.status }}</span>
                </h2>

                <div class="who-box">
                  @if (o.has_account) {
                    Member: <b>{{ o.ordered_by }}</b> &middot; earns <b>+{{ o.points_earned }} points</b>
                  } @else {
                    <b>Guest</b> &middot; no points for this order
                  }
                  <div class="muted">Placed {{ o.created_at | date: 'h:mm a' }}</div>
                </div>

                @for (l of o.lines; track $index) {
                  <div class="t-row"><span>{{ l.qty }} x {{ l.name }}</span><span>&#8369;{{ l.qty * l.price }}</span></div>
                }
                @if (o.discount > 0) {
                  <div class="t-row"><span>Voucher: {{ o.voucher_title }}</span><span>&minus;&#8369;{{ o.discount }}</span></div>
                }
                <div class="t-row total"><span>Collect</span><span>&#8369;{{ o.total }}</span></div>

                <div class="big-actions">
                  @if (o.status === 'Pending') {
                    <button type="button" class="btn good" [disabled]="busy()" (click)="complete(o)">Mark completed</button>
                    <button type="button" class="btn ghost" [disabled]="busy()" (click)="reject(o)">Reject</button>
                  } @else {
                    <p class="muted" style="margin:0;align-self:center">This order is {{ o.status.toLowerCase() }}. Nothing more to do.</p>
                    <button type="button" class="btn dark" (click)="clear()">Scan next</button>
                  }
                </div>
              </div>
            } @else {
              <h2>Waiting for an order</h2>
              <p class="muted">When you scan a code, the customer's items and total appear here.</p>
            }
          </div>

        </div>
      </section>

      @if (tab() === 'history') {
        <section class="panel">
          <div class="row between">
            <h2>Order history</h2>
            <div class="row">
              <select class="inp" (change)="onStatus($event)">
                @for (s of statuses; track s) { <option [value]="s" [selected]="s === status()">{{ s }}</option> }
              </select>
              <input class="inp" placeholder="Order # or name" [(ngModel)]="query" (keydown.enter)="loadHistory(true)" />
              <button type="button" class="btn" (click)="loadHistory(true)">Search</button>
            </div>
          </div>
          <div class="scroll">
            <table>
              <thead><tr><th>Order</th><th>When</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead>
              <tbody>
                @for (o of history(); track o.order_id) {
                  <tr>
                    <td><b>#{{ o.order_number }}</b></td>
                    <td>{{ (o.completed_at ?? o.created_at) | date: 'MMM d, h:mm a' }}</td>
                    <td>{{ o.ordered_by }}</td>
                    <td class="lines">@for (l of o.lines; track $index) { <div>{{ l.qty }} x {{ l.name }}</div> }</td>
                    <td>&#8369;{{ o.total }}</td>
                    <td><span class="pill" [class]="'pill ' + o.status.toLowerCase()">{{ o.status }}</span></td>
                    <td class="acts">
                      @if (o.status === 'Pending') { <button type="button" (click)="open(o)">Open</button> }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="7">No orders found.</td></tr>
                }
              </tbody>
            </table>
          </div>
          @if (hasMore()) { <div class="row"><button type="button" class="btn ghost" (click)="loadHistory(false)">Load more</button></div> }
          @if (retention(); as r) {
            <p class="muted">History cleans itself up: completed orders are removed after {{ r.completed_days }} days, expired or cancelled ones after {{ r.expired_days }} days. This list refreshes every 15 seconds.</p>
          }
        </section>
      }
    </main>
  `,
})
export class Cashier implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private api = inject(StaffApi);
  private router = inject(Router);

  private video = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  tab = signal<Tab>('scan');
  busy = signal(false);
  info = signal('');
  error = signal('');
  order = signal<StaffOrder | null>(null);

  // ----- camera -----
  scanning = signal(false);
  private stream: MediaStream | null = null;
  private raf = 0;
  private canvas = document.createElement('canvas');
  private lastTry = 0;
  private lockedUntil = 0;

  // ----- history -----
  statuses = ['All', 'Pending', 'Completed', 'Cancelled', 'Expired'];
  status = signal('All');
  query = '';
  history = signal<StaffOrder[]>([]);
  hasMore = signal(false);
  retention = signal<{ completed_days: number; expired_days: number } | null>(null);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.refreshTimer = setInterval(() => {
      if (this.tab() === 'history' && this.history().length <= 30) this.loadHistory(true);
    }, 15000);
  }

  ngOnDestroy() {
    this.stopCamera();
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  go(tab: Tab) {
    this.tab.set(tab);
    this.error.set('');
    if (tab === 'history') this.loadHistory(true);
  }

  logout() {
    this.auth.logout(true);
  }

  // ================= scanning =================
  async startCamera() {
    this.error.set('');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const v = this.video().nativeElement;
      v.srcObject = this.stream;
      await v.play();
      this.scanning.set(true);
      this.tick();
    } catch {
      this.error.set('Could not open the camera. Allow camera access, or use the box below.');
    }
  }

  stopCamera() {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.scanning.set(false);
  }

  private tick = () => {
    if (!this.scanning()) return;
    const now = Date.now();
    const v = this.video().nativeElement;

    // look for a QR code about 6 times a second, but not while a ticket is open
    if (now - this.lastTry > 160 && now > this.lockedUntil && !this.order() && v.readyState === v.HAVE_ENOUGH_DATA) {
      this.lastTry = now;
      this.canvas.width = v.videoWidth;
      this.canvas.height = v.videoHeight;
      const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(v, 0, 0, this.canvas.width, this.canvas.height);
        const img = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const result = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (result?.data) this.lookup(result.data);
      }
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  lookup(code: string) {
    code = code.trim();
    if (!code) return;
    this.lockedUntil = Date.now() + 2000; // don't hammer the server with the same code
    this.error.set('');
    this.api.lookup(code).subscribe({
      next: o => { this.order.set(o); this.info.set(''); },
      error: (e: HttpErrorResponse) => this.error.set(e.error?.message ?? 'Could not look up that code.'),
    });
  }

  open(o: StaffOrder) {
    this.order.set(o);
    this.tab.set('scan');
  }

  clear() {
    this.order.set(null);
    this.error.set('');
    this.lockedUntil = Date.now() + 800;
  }

  complete(o: StaffOrder) {
    this.busy.set(true);
    this.api.complete(o.order_id).subscribe({
      next: done => {
        this.busy.set(false);
        this.order.set(done);
        this.info.set(`Order #${done.order_number} completed.`);
        setTimeout(() => this.info.set(''), 4000);
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(e.error?.message ?? 'Could not complete the order.');
        this.lookup(o.order_number); // show the true current state
      },
    });
  }

  reject(o: StaffOrder) {
    if (!confirm(`Reject order #${o.order_number}? The customer will need to order again.`)) return;
    this.busy.set(true);
    this.api.cancel(o.order_id).subscribe({
      next: done => { this.busy.set(false); this.order.set(done); },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(e.error?.message ?? 'Could not reject the order.');
      },
    });
  }

  // ================= history =================
  onStatus(e: Event) {
    this.status.set((e.target as HTMLSelectElement).value);
    this.loadHistory(true);
  }

  loadHistory(reset: boolean) {
    const offset = reset ? 0 : this.history().length;
    this.api.cashierOrders({ status: this.status(), q: this.query.trim(), limit: 30, offset }).subscribe({
      next: p => {
        this.history.update(list => (reset ? p.orders : [...list, ...p.orders]));
        this.hasMore.set(p.hasMore);
        this.retention.set(p.retention ?? null);
      },
      error: (e: HttpErrorResponse) => this.error.set(e.error?.message ?? 'Could not load history.'),
    });
  }
}
