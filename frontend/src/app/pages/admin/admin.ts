import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services';
import {
  AdminItem,
  Category,
  StaffApi,
  StaffOrder,
  UserRow,
  VoucherRow,
} from '../../services/staff';
import { PasswordField } from '../../components/password-field/password-field';

type Tab = 'menu' | 'orders' | 'rewards' | 'accounts';

interface ItemForm {
  item_id: number | null;
  name: string;
  description: string;
  price: number | null;
  category_id: number | null;
  is_best_seller: boolean;
  is_available: boolean;
  remove_image: boolean;
  has_image: boolean;
}

const blankItem = (): ItemForm => ({
  item_id: null,
  name: '',
  description: '',
  price: null,
  category_id: null,
  is_best_seller: false,
  is_available: true,
  remove_image: false,
  has_image: false,
});

const blankVoucher = () => ({
  voucher_id: null as number | null,
  title: '',
  points_cost: 100,
  discount_type: 'amount' as 'amount' | 'percent',
  discount_value: 20,
  is_active: true,
});

@Component({
  selector: 'app-admin',
  imports: [FormsModule, DatePipe, RouterLink, PasswordField],
  styleUrl: '../staff.css',
  template: `
    <header class="top">
      <div class="logo">
        <img src="/logo.png" alt="" /> Mr. Hungry <span class="tag">ADMIN</span>
      </div>
      <nav class="tabs">
        @for (t of tabs; track t.id) {
          <button type="button" [class.on]="tab() === t.id" (click)="go(t.id)">
            {{ t.label }}
          </button>
        }
      </nav>
      <div class="who">
        <span>{{ auth.user()?.name }}</span>
        <a routerLink="/cashier">Cashier</a>
        <a routerLink="/">Website</a>
        <a routerLink="/account">My account</a>
        <button type="button" class="btn dark" (click)="logout()">Log out</button>
      </div>
    </header>

    <main class="body">
      @if (error()) {
        <p class="alert bad">{{ error() }}</p>
      }
      @if (info()) {
        <p class="alert good">{{ info() }}</p>
      }

      @switch (tab()) {
        <!-- ================= MENU ================= -->
        @case ('menu') {
          <section class="panel">
            <h2>Categories</h2>
            <div class="chips">
              @for (c of categories(); track c.category_id) {
                <span class="chip"
                  >{{ c.name }} <small>({{ c.item_count }})</small>
                  <button type="button" title="Rename" (click)="renameCategory(c)">&#9998;</button>
                  <button type="button" title="Delete" (click)="deleteCategory(c)">&#10005;</button>
                </span>
              }
            </div>
            <div class="row">
              <input
                class="inp"
                placeholder="New category name"
                [(ngModel)]="newCategory"
                (keydown.enter)="addCategory()"
              />
              <button type="button" class="btn" (click)="addCategory()">Add category</button>
            </div>
          </section>

          @if (formOpen()) {
            <section class="panel">
              <h2>{{ form.item_id ? 'Edit item' : 'Add item' }}</h2>
              <div class="grid2">
                <label>Name <input class="inp" [(ngModel)]="form.name" /></label>
                <label
                  >Price (&#8369;)
                  <input class="inp" type="number" min="0" step="0.01" [(ngModel)]="form.price"
                /></label>
                <label
                  >Category
                  <select class="inp" [(ngModel)]="form.category_id">
                    <option [ngValue]="null" disabled>Choose a category</option>
                    @for (c of categories(); track c.category_id) {
                      <option [ngValue]="c.category_id">{{ c.name }}</option>
                    }
                  </select>
                </label>
                <label
                  >Photo <input class="inp" type="file" accept="image/*" (change)="onFile($event)"
                /></label>
              </div>

                <label style="margin-top:12px">Description (optional, shown when customers hover over the item)
                <textarea class="inp" rows="3" maxlength="200" [(ngModel)]="form.description"
                          placeholder="e.g. Creamy sauce, crispy bacon bits, parmesan on top"></textarea>
                <small class="muted">{{ form.description.length }}/200</small>
              </label>
              @if (preview()) {
                <img class="preview" [src]="preview()" alt="Photo preview" />
              }
              <div class="row">
                <label class="chk"
                  ><input type="checkbox" [(ngModel)]="form.is_best_seller" /> Best seller</label
                >
                <label class="chk"
                  ><input type="checkbox" [(ngModel)]="form.is_available" /> Available (shown on the
                  menu)</label
                >
                @if (form.item_id && form.has_image) {
                  <label class="chk"
                    ><input type="checkbox" [(ngModel)]="form.remove_image" /> Remove current
                    photo</label
                  >
                }
              </div>
              <div class="row">
                <button type="button" class="btn" [disabled]="busy()" (click)="saveItem()">
                  Save item
                </button>
                <button type="button" class="btn ghost" (click)="closeForm()">Cancel</button>
              </div>
            </section>
          }

          <section class="panel">
            <div class="row between">
              <h2>Menu items ({{ shown().length }})</h2>
              <div class="row">
                <select class="inp" (change)="onCat($event)">
                  <option value="0">All categories</option>
                  @for (c of categories(); track c.category_id) {
                    <option [value]="c.category_id">{{ c.name }}</option>
                  }
                </select>
                <button type="button" class="btn" (click)="openNew()">+ Add item</button>
              </div>
            </div>
            <div class="scroll">
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (i of shown(); track i.item_id) {
                    <tr>
                      <td>
                        @if (i.image_url) {
                          <img class="thumb" [src]="i.image_url" alt="" />
                        } @else {
                          <div class="thumb none">{{ i.name[0] }}</div>
                        }
                      </td>
                      <td>{{ i.name }}</td>
                      <td>{{ i.category }}</td>
                      <td>&#8369;{{ i.price }}</td>
                      <td>
                        @if (i.is_best_seller) {
                          <span class="pill gold">Best seller</span>
                        }
                        @if (!i.is_available) {
                          <span class="pill off">Hidden</span>
                        }
                      </td>
                      <td class="acts">
                        <button type="button" (click)="openEdit(i)">Edit</button>
                        <button type="button" (click)="toggleAvailable(i)">
                          {{ i.is_available ? 'Hide' : 'Show' }}
                        </button>
                        <button type="button" class="danger" (click)="removeItem(i)">Delete</button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6">No items yet. Click "Add item" to create your first one.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }

        <!-- ================= ORDER LOGS ================= -->
        @case ('orders') {
          <section class="panel">
            <div class="row between">
              <h2>Order logs</h2>
              <div class="row">
                <select class="inp" (change)="onStatus($event)">
                  @for (s of statuses; track s) {
                    <option [value]="s" [selected]="s === status()">{{ s }}</option>
                  }
                </select>
                <input
                  class="inp"
                  placeholder="Order # or customer"
                  [(ngModel)]="query"
                  (keydown.enter)="loadOrders(true)"
                />
                <button type="button" class="btn" (click)="loadOrders(true)">Search</button>
              </div>
            </div>
            <div class="scroll">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>When</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Handled by</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (o of orders(); track o.order_id) {
                    <tr>
                      <td>
                        <b>#{{ o.order_number }}</b>
                      </td>
                      <td>{{ o.completed_at ?? o.created_at | date: 'MMM d, y, h:mm a' }}</td>
                      <td>Ordered by {{ o.ordered_by }}</td>
                      <td class="lines">
                        @for (l of o.lines; track $index) {
                          <div>{{ l.qty }} x {{ l.name }}</div>
                        }
                      </td>
                      <td>&#8369;{{ o.total }}</td>
                      <td>{{ o.handled_by_name ?? '-' }}</td>
                      <td>
                        <span class="pill" [class]="'pill ' + o.status.toLowerCase()">{{
                          o.status
                        }}</span>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7">No orders found.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (hasMore()) {
              <div class="row">
                <button type="button" class="btn ghost" (click)="loadOrders(false)">
                  Load more
                </button>
              </div>
            }
            @if (retention(); as r) {
              <p class="muted">
                Old orders are removed automatically: completed after {{ r.completed_days }} days,
                expired or cancelled after {{ r.expired_days }} days.
              </p>
            }
          </section>
        }

        <!-- ================= VOUCHERS ================= -->
        @case ('rewards') {
          @if (vOpen()) {
            <section class="panel">
              <h2>{{ vForm.voucher_id ? 'Edit voucher' : 'Add voucher' }}</h2>
              <div class="grid2">
                <label>Title <input class="inp" [(ngModel)]="vForm.title" /></label>
                <label
                  >Points needed
                  <input class="inp" type="number" min="1" [(ngModel)]="vForm.points_cost"
                /></label>
                <label
                  >Discount type
                  <select class="inp" [(ngModel)]="vForm.discount_type">
                    <option value="amount">Peso amount off</option>
                    <option value="percent">Percent off</option>
                  </select>
                </label>
                <label
                  >Discount value
                  <input class="inp" type="number" min="1" [(ngModel)]="vForm.discount_value"
                /></label>
              </div>
              <div class="row">
                <label class="chk"
                  ><input type="checkbox" [(ngModel)]="vForm.is_active" /> Active (customers can
                  claim it)</label
                >
              </div>
              <div class="row">
                <button type="button" class="btn" [disabled]="busy()" (click)="saveVoucher()">
                  Save voucher
                </button>
                <button type="button" class="btn ghost" (click)="vOpen.set(false)">Cancel</button>
              </div>
            </section>
          }
          <section class="panel">
            <div class="row between">
              <h2>Vouchers</h2>
              <button type="button" class="btn" (click)="openVoucher(null)">+ Add voucher</button>
            </div>
            <div class="scroll">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Points</th>
                    <th>Discount</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (v of vouchers(); track v.voucher_id) {
                    <tr>
                      <td>{{ v.title }}</td>
                      <td>{{ v.points_cost }}</td>
                      <td>
                        {{
                          v.discount_type === 'percent'
                            ? v.discount_value + '%'
                            : '&#8369;' + v.discount_value
                        }}
                      </td>
                      <td>
                        @if (v.is_active) {
                          <span class="pill completed">Active</span>
                        } @else {
                          <span class="pill off">Off</span>
                        }
                      </td>
                      <td class="acts">
                        <button type="button" (click)="openVoucher(v)">Edit</button>
                        <button type="button" class="danger" (click)="removeVoucher(v)">
                          Delete
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5">No vouchers yet.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <p class="muted">
              Customers who already claimed a voucher keep it, even if you edit or delete it here.
            </p>
          </section>
        }

        <!-- ================= ACCOUNTS ================= -->
        @case ('accounts') {
          <section class="panel">
            <h2>Create a staff account</h2>
            <div class="grid2">
              <label>Name <input class="inp" [(ngModel)]="staff.name" /></label>
              <label>Email <input class="inp" type="email" [(ngModel)]="staff.email" /></label>
             <label>Password
                <app-password-field [(value)]="staff.password" autocomplete="new-password" />
              </label>
              <label
                >Role
                <select class="inp" [(ngModel)]="staff.role">
                  <option value="cashier">Cashier</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            </div>
            <div class="row">
              <button type="button" class="btn" [disabled]="busy()" (click)="createStaff()">
                Create account
              </button>
            </div>
          </section>

          <section class="panel">
            <div class="row between">
              <h2>Accounts ({{ users().length }})</h2>
              <div class="row">
                <input class="inp" type="search" placeholder="Search by name or email"
                       [ngModel]="userQuery" (ngModelChange)="onUserSearch($event)" />
                <select class="inp" (change)="onRole($event)">
                  <option value="">All roles</option>
                  <option value="admin">Admins</option>
                  <option value="cashier">Cashiers</option>
                  <option value="user">Customers</option>
                </select>
              </div>
            </div>
            <div class="scroll">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Points</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (u of users(); track u.user_id) {
                    <tr>
                      <td>{{ u.name }}</td>
                      <td>{{ u.email }}</td>
                      <td>{{ u.role }}</td>
                      <td>{{ u.role === 'user' ? u.points : '-' }}</td>
                      <td>
                        @if (u.is_active) {
                          <span class="pill completed">Active</span>
                        } @else {
                          <span class="pill off">Disabled</span>
                        }
                      </td>
                      <td class="acts">
                        @if (u.user_id !== auth.user()?.user_id) {
                          <button type="button" (click)="toggleUser(u)">
                            {{ u.is_active ? 'Disable' : 'Enable' }}
                          </button>
                          <button type="button" (click)="resetPassword(u)">New password</button>
                          <button type="button" class="danger" (click)="removeUser(u)">
                            Delete
                          </button>
                        } @else {
                          <span class="muted">You</span>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6">No accounts.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }
      }
    </main>
  `,
})
export class Admin implements OnInit {
  auth = inject(AuthService);
  private api = inject(StaffApi);
  private router = inject(Router);

  tabs: { id: Tab; label: string }[] = [
    { id: 'menu', label: 'Menu' },
    { id: 'orders', label: 'Order logs' },
    { id: 'rewards', label: 'Vouchers' },
    { id: 'accounts', label: 'Accounts' },
  ];
  tab = signal<Tab>('menu');
  busy = signal(false);
  error = signal('');
  info = signal('');

  // ---------- menu ----------
  items = signal<AdminItem[]>([]);
  categories = signal<Category[]>([]);
  catFilter = signal(0);
  shown = computed(() => {
    const c = this.catFilter();
    return c ? this.items().filter((i) => i.category_id === c) : this.items();
  });
  formOpen = signal(false);
  form: ItemForm = blankItem();
  preview = signal<string | null>(null);
  private file: File | null = null;
  newCategory = '';

  // ---------- orders ----------
  statuses = ['Completed', 'Pending', 'Cancelled', 'Expired', 'All'];
  status = signal('Completed');
  query = '';
  orders = signal<StaffOrder[]>([]);
  hasMore = signal(false);
  retention = signal<{ completed_days: number; expired_days: number } | null>(null);

  // ---------- vouchers ----------
  vouchers = signal<VoucherRow[]>([]);
  vOpen = signal(false);
  vForm = blankVoucher();

  // ---------- accounts ----------
  users = signal<UserRow[]>([]);
  userQuery = '';
  private userTimer: ReturnType<typeof setTimeout> | null = null;
  roleFilter = '';
  staff = { name: '', email: '', password: '', role: 'cashier' };

  ngOnInit() {
    this.loadCategories();
    this.loadMenu();
  }

  go(tab: Tab) {
    this.tab.set(tab);
    this.error.set('');
    if (tab === 'orders') this.loadOrders(true);
    if (tab === 'rewards') this.loadVouchers();
    if (tab === 'accounts') this.loadUsers();
  }

  logout() {
    this.auth.logout(true);
  }

  // ---------- small helpers ----------
  private ok(message: string) {
    this.error.set('');
    this.info.set(message);
    setTimeout(() => this.info.set(''), 3500);
  }
  private fail(message: string) {
    this.info.set('');
    this.error.set(message);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  private failHttp(e: HttpErrorResponse) {
    this.busy.set(false);
    this.fail(e.error?.message ?? 'Could not reach the server.');
  }

  // ================= menu =================
  loadMenu() {
    this.api
      .menu()
      .subscribe({ next: (list) => this.items.set(list), error: (e) => this.failHttp(e) });
  }
  loadCategories() {
    this.api
      .categories()
      .subscribe({ next: (list) => this.categories.set(list), error: (e) => this.failHttp(e) });
  }
  onCat(e: Event) {
    this.catFilter.set(Number((e.target as HTMLSelectElement).value));
  }

  addCategory() {
    const name = this.newCategory.trim();
    if (!name) return;
    this.api.addCategory(name).subscribe({
      next: () => {
        this.newCategory = '';
        this.ok('Category added.');
        this.loadCategories();
      },
      error: (e) => this.failHttp(e),
    });
  }
  renameCategory(c: Category) {
    const name = prompt('New name for this category:', c.name)?.trim();
    if (!name || name === c.name) return;
    this.api.renameCategory(c.category_id, name).subscribe({
      next: () => {
        this.ok('Category renamed.');
        this.loadCategories();
        this.loadMenu();
      },
      error: (e) => this.failHttp(e),
    });
  }
  deleteCategory(c: Category) {
    if (!confirm(`Delete the category "${c.name}"?`)) return;
    this.api.deleteCategory(c.category_id).subscribe({
      next: () => {
        this.ok('Category deleted.');
        this.loadCategories();
      },
      error: (e) => this.failHttp(e),
    });
  }

  openNew() {
    this.form = blankItem();
    this.form.category_id = this.catFilter() || this.categories()[0]?.category_id || null;
    this.file = null;
    this.preview.set(null);
    this.formOpen.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  openEdit(i: AdminItem) {
    this.form = {
      item_id: i.item_id,
      name: i.name,
      description: i.description ?? '',
      price: i.price,
      category_id: i.category_id,
      is_best_seller: i.is_best_seller,
      is_available: i.is_available,
      remove_image: false,
      has_image: !!i.image_url,
    };
    this.file = null;
    this.preview.set(i.image_url);
    this.formOpen.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  closeForm() {
    this.formOpen.set(false);
    this.file = null;
    this.preview.set(null);
  }
  onFile(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0] ?? null;
    if (f && f.size > 4 * 1024 * 1024) {
      this.fail('That image is too large (max 4 MB).');
      (e.target as HTMLInputElement).value = '';
      return;
    }
    this.file = f;
    if (f) this.preview.set(URL.createObjectURL(f));
  }

  private buildForm(f: ItemForm, image: File | null) {
    const fd = new FormData();
    fd.append('name', f.name.trim());
    fd.append('description', f.description.trim());
    fd.append('price', String(f.price));
    fd.append('category_id', String(f.category_id));
    fd.append('is_best_seller', String(f.is_best_seller));
    fd.append('is_available', String(f.is_available));
    if (image) fd.append('image', image);
    if (f.remove_image) fd.append('remove_image', 'true');
    return fd;
  }

  saveItem() {
    const f = this.form;
    if (!f.name.trim()) return this.fail('Item name is required.');
    if (f.price === null || f.price < 0) return this.fail('Enter a valid price.');
    if (!f.category_id) return this.fail('Choose a category.');

    this.busy.set(true);
    this.api.saveItem(f.item_id, this.buildForm(f, this.file)).subscribe({
      next: () => {
        this.busy.set(false);
        this.closeForm();
        this.ok('Item saved.');
        this.loadMenu();
        this.loadCategories();
      },
      error: (e) => this.failHttp(e),
    });
  }

  // quick hide/show, handy for limited-time items or when something sells out
  toggleAvailable(i: AdminItem) {
    const f: ItemForm = {
      item_id: i.item_id,
      name: i.name,
      description: i.description ?? '',
      price: i.price,
      category_id: i.category_id,
      is_best_seller: i.is_best_seller,
      is_available: !i.is_available,
      remove_image: false,
      has_image: !!i.image_url,
    };
    this.api.saveItem(i.item_id, this.buildForm(f, null)).subscribe({
      next: () => {
        this.ok(f.is_available ? 'Item is visible again.' : 'Item hidden from the menu.');
        this.loadMenu();
      },
      error: (e) => this.failHttp(e),
    });
  }

  removeItem(i: AdminItem) {
    if (!confirm(`Delete "${i.name}"? Its photo is deleted too. Past orders keep their record.`))
      return;
    this.api.deleteItem(i.item_id).subscribe({
      next: () => {
        this.ok('Item deleted.');
        this.loadMenu();
        this.loadCategories();
      },
      error: (e) => this.failHttp(e),
    });
  }

  // ================= order logs =================
  onStatus(e: Event) {
    this.status.set((e.target as HTMLSelectElement).value);
    this.loadOrders(true);
  }
  loadOrders(reset: boolean) {
    const offset = reset ? 0 : this.orders().length;
    this.api
      .adminOrders({ status: this.status(), q: this.query.trim(), limit: 30, offset })
      .subscribe({
        next: (p) => {
          this.orders.update((list) => (reset ? p.orders : [...list, ...p.orders]));
          this.hasMore.set(p.hasMore);
          this.retention.set(p.retention ?? null);
        },
        error: (e) => this.failHttp(e),
      });
  }

  // ================= vouchers =================
  loadVouchers() {
    this.api
      .vouchers()
      .subscribe({ next: (list) => this.vouchers.set(list), error: (e) => this.failHttp(e) });
  }
  openVoucher(v: VoucherRow | null) {
    this.vForm = v ? { ...v } : blankVoucher();
    this.vOpen.set(true);
  }
  saveVoucher() {
    this.busy.set(true);
    this.api.saveVoucher(this.vForm.voucher_id, this.vForm).subscribe({
      next: () => {
        this.busy.set(false);
        this.vOpen.set(false);
        this.ok('Voucher saved.');
        this.loadVouchers();
      },
      error: (e) => this.failHttp(e),
    });
  }
  removeVoucher(v: VoucherRow) {
    if (!confirm(`Delete the voucher "${v.title}"?`)) return;
    this.api.deleteVoucher(v.voucher_id).subscribe({
      next: () => {
        this.ok('Voucher deleted.');
        this.loadVouchers();
      },
      error: (e) => this.failHttp(e),
    });
  }

  // ================= accounts =================
  loadUsers() {
    this.api.users(this.roleFilter, this.userQuery.trim()).subscribe({
      next: list => this.users.set(list),
      error: e => this.failHttp(e),
    });
  }

  // search as you type (waits a moment after the last keystroke)
  onUserSearch(text: string) {
    this.userQuery = text;
    if (this.userTimer) clearTimeout(this.userTimer);
    this.userTimer = setTimeout(() => this.loadUsers(), 300);
  }
  onRole(e: Event) {
    this.roleFilter = (e.target as HTMLSelectElement).value;
    this.loadUsers();
  }
  createStaff() {
    this.busy.set(true);
    this.api.createUser(this.staff).subscribe({
      next: () => {
        this.busy.set(false);
        this.staff = { name: '', email: '', password: '', role: 'cashier' };
        this.ok('Account created.');
        this.loadUsers();
      },
      error: (e) => this.failHttp(e),
    });
  }
  toggleUser(u: UserRow) {
    this.api.updateUser(u.user_id, { is_active: !u.is_active }).subscribe({
      next: () => {
        this.ok(u.is_active ? 'Account disabled.' : 'Account enabled.');
        this.loadUsers();
      },
      error: (e) => this.failHttp(e),
    });
  }
  resetPassword(u: UserRow) {
    const pw = prompt(`New password for ${u.name}:`);
    if (!pw) return;
    this.api.updateUser(u.user_id, { new_password: pw }).subscribe({
      next: () => this.ok('Password changed.'),
      error: (e) => this.failHttp(e),
    });
  }
  removeUser(u: UserRow) {
    if (!confirm(`Delete the account of ${u.name}? This cannot be undone.`)) return;
    this.api.deleteUser(u.user_id).subscribe({
      next: () => {
        this.ok('Account deleted.');
        this.loadUsers();
      },
      error: (e) => this.failHttp(e),
    });
  }
}
