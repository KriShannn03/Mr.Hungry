import { Injectable, computed, signal } from '@angular/core';
import { User } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  user = signal<User | null>(null);
  isLoggedIn = computed(() => this.user() !== null);

  logout() {
    this.user.set(null);
  }
}
