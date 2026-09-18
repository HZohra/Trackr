import { Component, signal } from '@angular/core';
import { MainLayout } from './layout/main-layout/main-layout';
import { Courses } from './features/courses/courses';

@Component({
  selector: 'app-root',
  imports: [MainLayout, Courses],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('frontend-angular');
}