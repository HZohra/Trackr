import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}