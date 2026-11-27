import { Component, input, model, signal } from '@angular/core';

@Component({
  selector: 'app-password-field',
  template: `
    <div class="wrap">
      <input
        [id]="inputId()"
        [type]="show() ? 'text' : 'password'"
        [value]="value()"
        [attr.autocomplete]="autocomplete()"
        [placeholder]="placeholder()"
        (input)="onInput($event)"
      />
      <button type="button" class="eye" (click)="show.set(!show())"
              [attr.aria-label]="show() ? 'Hide password' : 'Show password'"
              [attr.aria-pressed]="show()"
              [title]="show() ? 'Hide password' : 'Show password'">
        @if (show()) {
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        } @else {
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        }
      </button>
    </div>
  `,
  styles: `
    :host { display: block; }
    .wrap { position: relative; }
    input {
      width: 100%; box-sizing: border-box;
      height: var(--field-height, 40px);
      border: var(--field-border, 1px solid #111);
      border-radius: var(--field-radius, 12px);
      padding: 0 44px 0 12px;
      background: var(--field-bg, white);
      font-family: 'Montserrat', sans-serif; font-size: 15px;
    }
    input:focus { outline: none; border-color: #e8650c; }
    .eye {
      position: absolute; top: 0; right: 0; width: 42px; height: 100%;
      display: grid; place-items: center;
      border: none; background: transparent; color: #555; cursor: pointer;
    }
    .eye:hover { color: #111; }
  `,
})
export class PasswordField {
  inputId = input('');
  autocomplete = input('off');
  placeholder = input('');
  value = model('');

  show = signal(false);

  onInput(event: Event) {
    this.value.set((event.target as HTMLInputElement).value);
  }
}
