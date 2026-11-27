import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { SiteHeader } from '../../components/site-header/site-header';
import { AuthService } from '../../services';
import { PasswordField } from '../../components/password-field/password-field';

@Component({
  selector: 'app-account',
  imports: [FormsModule, SiteHeader, PasswordField],
  template: `
    <div class="page">
      <app-site-header />
      <main class="main">
        <h1>My Account</h1>
        <div class="box">
          @if (auth.user(); as u) {
            @if (u.role === 'user') {
              <p class="points">{{ u.points }} points</p>
            }
          }

          <label>Name <input class="inp" [(ngModel)]="f.name" /></label>
          <label>Email <input class="inp" type="email" [(ngModel)]="f.email" /></label>

          <h2>Change password</h2>
          <p class="hint">Only needed if you are changing your email or password.</p>
          <label
            >Current password
            <app-password-field [(value)]="f.current_password" autocomplete="current-password" />
          </label>
          <label
            >New password (8+ characters, letters and numbers)
            <app-password-field [(value)]="f.new_password" autocomplete="new-password" />
          </label>

          @if (ok()) {
            <p class="msg">{{ ok() }}</p>
          }
          @if (err()) {
            <p class="msg bad">{{ err() }}</p>
          }

          <button type="button" class="save" [disabled]="busy()" (click)="save()">
            Save changes
          </button>
        </div>
      </main>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .page {
      min-height: 100vh;
      background: linear-gradient(#f6dcb4, #fbe9c6 220px);
      font-family: 'Montserrat', sans-serif;
      color: #111;
    }
    .main {
      max-width: 520px;
      margin: 0 auto;
      padding: 24px 16px 60px;
    }
    h1 {
      margin: 0 0 16px;
      color: white;
      font-weight: 900;
      font-size: 44px;
      text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.35);
    }
    h2 {
      margin: 22px 0 0;
      font-size: 16px;
      font-weight: 800;
    }
    .box {
      background: #fff6e6;
      border-radius: 24px;
      padding: 24px 28px;
      box-shadow: -3px 3px 0 #111;
    }
    .points {
      margin: 0 0 12px;
      font-weight: 800;
      color: #1e7a34;
    }
    .hint {
      margin: 2px 0 6px;
      font-size: 12px;
      color: #666;
    }
    label {
      display: block;
      margin-top: 12px;
      font-size: 13px;
      font-weight: 800;
    }
    .inp {
      display: block;
      width: 100%;
      margin-top: 4px;
      border: 2px solid #e5d3b3;
      border-radius: 10px;
      padding: 10px 12px;
      font:
        600 14px 'Montserrat',
        sans-serif;
      background: white;
    }
    .inp:focus {
      outline: none;
      border-color: #e8650c;
    }
    .msg {
      margin: 14px 0 0;
      padding: 10px 14px;
      border-radius: 10px;
      background: #d6f2dc;
      color: #14572a;
      font-weight: 700;
      font-size: 14px;
    }
    .msg.bad {
      background: #ffd9d4;
      color: #8a1c10;
    }
    .save {
      display: block;
      width: 100%;
      margin-top: 18px;
      border: none;
      border-radius: 14px;
      padding: 13px 0;
      background: #ec7421;
      color: white;
      font:
        800 18px 'Montserrat',
        sans-serif;
      cursor: pointer;
    }
    .save:disabled {
      opacity: 0.6;
    }
    app-password-field {
      margin-top: 4px;
      --field-border: 2px solid #e5d3b3;
      --field-radius: 10px;
    }
  `,
})
export class Account {
  auth = inject(AuthService);

  f = {
    name: this.auth.user()?.name ?? '',
    email: this.auth.user()?.email ?? '',
    current_password: '',
    new_password: '',
  };

  busy = signal(false);
  ok = signal('');
  err = signal('');

  save() {
    this.busy.set(true);
    this.ok.set('');
    this.err.set('');

    this.auth
      .updateProfile({
        name: this.f.name,
        email: this.f.email,
        current_password: this.f.current_password || undefined,
        new_password: this.f.new_password || undefined,
      })
      .subscribe({
        next: () => {
          this.f.current_password = '';
          this.f.new_password = '';
          this.busy.set(false);
          this.ok.set('Your account was updated.');
        },
        error: (e: HttpErrorResponse) => {
          this.busy.set(false);
          this.err.set(e.error?.message ?? 'Could not save your changes.');
        },
      });
  }
}
