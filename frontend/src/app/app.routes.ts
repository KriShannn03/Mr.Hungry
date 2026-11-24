import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { Menu } from './pages/menu/menu';
import { Order } from './pages/order/order';
import { Qr } from './pages/qr/qr';
import { Login } from './pages/login/login';

export const routes: Routes = [
  { path: '', component: Dashboard },
  { path: 'dashboard', redirectTo: '' },
  { path: 'menu', component: Menu },
  { path: 'order', component: Order },
  { path: 'qr', component: Qr },
  { path: 'login', component: Login },
  { path: 'register', redirectTo: 'login' },
  { path: '**', redirectTo: '' },
];