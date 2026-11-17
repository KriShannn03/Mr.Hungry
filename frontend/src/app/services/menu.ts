import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MenuItem } from '../models';

const API = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private http = inject(HttpClient);

  search = signal('');

  items() {
    return this.http.get<MenuItem[]>(`${API}/menu`);
  }
}
