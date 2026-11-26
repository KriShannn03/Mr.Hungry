import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../config';
import { Role, User } from '../models';

const TOKEN_KEY = 'mr-hungry-token';
const USER_KEY = 'mr-hungry-user';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function savedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return getToken() && raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

interface AuthResponse {
  token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  user = signal<User | null>(savedUser());
  isLoggedIn = computed(() => this.user() !== null);

  constructor() {
    if (getToken()) this.refresh(); // quietly re-check who we are (also updates points)
  }

  // where each role lands after logging in
  homeFor(role: Role) {
    return role === 'admin' ? '/admin' : role === 'cashier' ? '/cashier' : '/';
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/login`, { email, password }).pipe(tap(r => this.start(r)));
  }

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/register`, { name, email, password }).pipe(tap(r => this.start(r)));
  }

  updateProfile(body: { name: string; email: string; current_password?: string; new_password?: string }) {
    return this.http.put<User>(`${API_URL}/auth/me`, body).pipe(tap(u => this.setUser(u)));
  }

  refresh() {
    this.http.get<User>(`${API_URL}/auth/me`).subscribe({
      next: u => this.setUser(u),
      error: () => {}, // a 401 is handled by the interceptor
    });
  }

  logout(goToLogin = false) {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // storage unavailable: ignore
    }
    this.user.set(null);
    if (goToLogin) this.router.navigate(['/login']);
  }

  private start(r: AuthResponse) {
    try {
      localStorage.setItem(TOKEN_KEY, r.token);
    } catch {
      // storage unavailable: ignore
    }
    this.setUser(r.user);
  }

  private setUser(u: User) {
    this.user.set(u);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {
      // storage unavailable: ignore
    }
  }
}
