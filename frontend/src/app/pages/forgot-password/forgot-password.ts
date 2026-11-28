import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SiteHeader } from '../../components/site-header/site-header';
import { AuthService } from '../../services';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink, SiteHeader],
  template: `
    <div class="page">
      <app-site-header />
      <main class="main">
        <h1>Forgot Password</h1>
        <div class="box">
          @if (sent()) {
            <p class="msg">If that email is registered, we sent a password reset link. Check your inbox and your spam folder.</p>
            <a class="back" routerLink="/login">Back to login</a>
          } @else {
            <p class="hint">Enter the email you registered with and we will send you a link to choose a new password.</p>
            <label>Email
              <input class="inp" type="email" [(ngModel)]="email" (keydown.enter)="submit()" />
            </label>
            @if (err()) { <p class="msg bad">{{ err() }}</p> }
            <button type="button" class="save" [disabled]="busy()" (click)="submit()">
              {{ busy() ? 'Sending...' : 'Send reset link' }}
            </button>
            <a class="back" routerLink="/login">Back to login</a>
          }
        </div>
      </main>
    </div>
  `,
  styles: `
    :host { display: block; }
    .page { min-height: 100vh; background: linear-gradient(#f6dcb4, #fbe9c6 220px); font-family: 'Montserrat', sans-serif; color: #111; }
    .main { max-width: 520px; margin: 0 auto; padding: 24px 16px 60px; }
    h1 { margin: 0 0 16px; color: white; font-weight: 900; font-size: 40px; text-shadow: 3px 3px 0 rgba(0,0,0,.35); }
    .box { background: #fff6e6; border-radius: 24px; padding: 24px 28px; box-shadow: -3px 3px 0 #111; }
    .hint { margin: 0 0 8px; font-size: 14px; }
    label { display: block; margin-top: 12px; font-size: 13px; font-weight: 800; }
    .inp { display: block; width: 100%; box-sizing: border-box; margin-top: 4px; border: 2px solid #e5d3b3; border-radius: 10px; padding: 10px 12px; font: 600 14px 'Montserrat', sans-serif; background: white; }
    .inp:focus { outline: none; border-color: #e8650c; }
    .msg { margin: 14px 0 0; padding: 10px 14px; border-radius: 10px; background: #d6f2dc; color: #14572a; font-weight: 700; font-size: 14px; }
    .msg.bad { background: #ffd9d4; color: #8a1c10; }
    .save { display: block; width: 100%; margin-top: 18px; border: none; border-radius: 14px; padding: 13px 0; background: #ec7421; color: white; font: 800 18px 'Montserrat', sans-serif; cursor: pointer; }
    .save:disabled { opacity: .6; }
    .back { display: block; margin-top: 16px; text-align: center; color: #b5471f; font-weight: 800; font-size: 14px; }
  `,
})
export class ForgotPassword {
  private auth = inject(AuthService);

  email = '';
  busy = signal(false);
  sent = signal(false);
  err = signal('');

  submit() {
    if (!this.email.includes('@')) {
      this.err.set('Enter a valid email address.');
      return;
    }
    this.busy.set(true);
    this.err.set('');
    this.auth.forgotPassword(this.email.trim()).subscribe({
      next: () => { this.busy.set(false); this.sent.set(true); },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.err.set(e.error?.message ?? 'Could not reach the server.');
      },
    });
  }
}
