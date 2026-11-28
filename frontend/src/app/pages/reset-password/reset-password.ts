import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SiteHeader } from '../../components/site-header/site-header';
import { PasswordField } from '../../components/password-field/password-field';
import { AuthService } from '../../services';
import { isStrongPassword } from '../../config';

@Component({
  selector: 'app-reset-password',
  imports: [RouterLink, SiteHeader, PasswordField],
  template: `
    <div class="page">
      <app-site-header />
      <main class="main">
        <h1>New Password</h1>
        <div class="box">
          @if (done()) {
            <p class="msg">Your password was changed. You can log in now.</p>
            <a class="save link" routerLink="/login">Go to login</a>
          } @else if (!token) {
            <p class="msg bad">This reset link is incomplete. Please request a new one.</p>
            <a class="back" routerLink="/forgot-password">Request a new link</a>
          } @else {
            <label>New password
              <app-password-field [(value)]="f.password" autocomplete="new-password" />
            </label>
            <label>Confirm new password
              <app-password-field [(value)]="f.confirm" autocomplete="new-password" />
            </label>
            <p class="hint">At least 8 characters, with letters and numbers.</p>
            @if (err()) { <p class="msg bad">{{ err() }}</p> }
            <button type="button" class="save" [disabled]="busy()" (click)="submit()">
              {{ busy() ? 'Saving...' : 'Change password' }}
            </button>
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
    .hint { margin: 8px 0 0; font-size: 12px; color: #555; }
    label { display: block; margin-top: 12px; font-size: 13px; font-weight: 800; }
    app-password-field { margin-top: 4px; --field-border: 2px solid #e5d3b3; --field-radius: 10px; }
    .msg { margin: 14px 0 0; padding: 10px 14px; border-radius: 10px; background: #d6f2dc; color: #14572a; font-weight: 700; font-size: 14px; }
    .msg.bad { background: #ffd9d4; color: #8a1c10; }
    .save { display: block; width: 100%; box-sizing: border-box; margin-top: 18px; border: none; border-radius: 14px; padding: 13px 0; background: #ec7421; color: white; text-align: center; text-decoration: none; font: 800 18px 'Montserrat', sans-serif; cursor: pointer; }
    .save:disabled { opacity: .6; }
    .back { display: block; margin-top: 16px; text-align: center; color: #b5471f; font-weight: 800; font-size: 14px; }
  `,
})
export class ResetPassword {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  token = this.route.snapshot.queryParamMap.get('token') ?? '';
  f = { password: '', confirm: '' };
  busy = signal(false);
  done = signal(false);
  err = signal('');

  submit() {
    if (!isStrongPassword(this.f.password)) {
      this.err.set('Password must be at least 8 characters and include both letters and numbers.');
      return;
    }
    if (this.f.password !== this.f.confirm) {
      this.err.set('The two passwords do not match.');
      return;
    }

    this.busy.set(true);
    this.err.set('');
    this.auth.resetPassword(this.token, this.f.password).subscribe({
      next: () => { this.busy.set(false); this.done.set(true); },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.err.set(e.error?.message ?? 'Could not reach the server.');
      },
    });
  }
}
