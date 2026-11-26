import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ActiveOrder } from './components/active-order/active-order';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ActiveOrder],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
