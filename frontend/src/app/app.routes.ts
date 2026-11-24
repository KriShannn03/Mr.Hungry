import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { Menu } from './pages/menu/menu';
import { Order } from './pages/order/order';
import { Qr } from './pages/qr/qr';
// import { History } from './pages/history/history';
import { Login } from './pages/login/login';

export const routes: Routes = [
  { path: '', component: Dashboard },
  { path: 'menu', component: Menu },
  { path: 'order', component: Order },
  { path: 'qr', component: Qr },
  { path: 'history', component: History },
  { path: 'login', component: Login },
  { path: '**', redirectTo: '' },
];