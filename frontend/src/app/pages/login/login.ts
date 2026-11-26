import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services';

const REMEMBER_KEY = 'mr-hungry-email';

function savedEmail(): string {
  try {
    return localStorage.getItem(REMEMBER_KEY) ?? '';
  } catch {
    return '';
  }
}

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private router = inject(Router);
  private auth = inject(AuthService);

  mode = signal<'register' | 'login'>('register');
  name = signal('');
  email = signal(savedEmail());
  password = signal('');
  remember = signal(savedEmail() !== '');
  error = signal('');
  busy = signal(false);

  setMode(mode: 'register' | 'login') {
    this.mode.set(mode);
    this.error.set('');
  }

  onName(event: Event) {
    this.name.set((event.target as HTMLInputElement).value);
  }

  onEmail(event: Event) {
    this.email.set((event.target as HTMLInputElement).value);
  }

  onPassword(event: Event) {
    this.password.set((event.target as HTMLInputElement).value);
  }

  onRemember(event: Event) {
    this.remember.set((event.target as HTMLInputElement).checked);
  }

  submit(event: Event) {
    event.preventDefault();

    if (this.mode() === 'register' && this.name().trim().length < 2) {
      this.error.set('Please enter your name.');
      return;
    }

    if (!this.email().includes('@')) {
      this.error.set('Enter a valid email address.');
      return;
    }

    if (this.password().length < 6) {
      this.error.set('Password must be at least 6 characters.');
      return;
    }

    try {
      if (this.remember()) localStorage.setItem(REMEMBER_KEY, this.email());
      else localStorage.removeItem(REMEMBER_KEY);
    } catch {
      // storage unavailable: ignore
    }

    this.error.set('');
    this.busy.set(true);

    const request =
      this.mode() === 'register'
        ? this.auth.register(this.name().trim(), this.email().trim(), this.password())
        : this.auth.login(this.email().trim(), this.password());

    request.subscribe({
      next: res => {
        this.busy.set(false);
        // admin -> /admin, cashier -> /cashier, customer -> home
        this.router.navigate([this.auth.homeFor(res.user.role)]);
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(e.error?.message ?? 'Could not reach the server. Is the backend running?');
      },
    });
  }

  continueAsGuest() {
    this.router.navigate(['/']);
  }
}
