import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { API_URL, imageUrl } from '../config';
import { MenuItem } from '../models';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private http = inject(HttpClient);

  search = signal('');

  items() {
    return this.http
      .get<MenuItem[]>(`${API_URL}/menu`)
      .pipe(map(list => list.map(i => ({ ...i, image_url: imageUrl(i.image_url) }))));
  }
}
