import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

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

  mode = signal<'register' | 'login'>('register');
  email = signal(savedEmail());
  password = signal('');
  remember = signal(savedEmail() !== '');
  error = signal('');

  setMode(mode: 'register' | 'login') {
    this.mode.set(mode);
    this.error.set('');
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

    // TODO: call your backend here (register or login depending on this.mode())
    this.error.set('');
    this.router.navigate(['/']);
  }

  continueAsGuest() {
    this.router.navigate(['/']);
  }
}
