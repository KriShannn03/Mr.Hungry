import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { Menu } from './pages/menu/menu';
import { Order } from './pages/order/order';
import { Qr } from './pages/qr/qr';
import { History } from './pages/history/history';
import { Login } from './pages/login/login';
import { Rewards } from './pages/rewards/rewards';
import { Account } from './pages/account/account';
import { Admin } from './pages/admin/admin';
import { Cashier } from './pages/cashier/cashier';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', component: Dashboard },
  { path: 'menu', component: Menu },
  { path: 'order', component: Order },
  { path: 'qr', component: Qr },
  { path: 'qr/:number', component: Qr },
  { path: 'history', component: History },
  { path: 'login', component: Login },
  { path: 'rewards', component: Rewards, canActivate: [roleGuard('user')] },
  { path: 'account', component: Account, canActivate: [roleGuard('user', 'cashier', 'admin')] },
  { path: 'admin', component: Admin, canActivate: [roleGuard('admin')] },
  { path: 'cashier', component: Cashier, canActivate: [roleGuard('cashier', 'admin')] },
  { path: '**', redirectTo: '' },
];
