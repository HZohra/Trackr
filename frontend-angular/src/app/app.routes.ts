import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { Dashboard } from './features/dashboard/dashboard';
import { Courses } from './features/courses/courses';
import { Assignments } from './features/assignments/assignments';
import { Calendar } from './features/calendar/calendar';
import { Grades } from './features/grades/grades';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login },        // top-level: no shell
  { path: 'register', component: Register },  // top-level: no shell
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'courses', component: Courses },
      { path: 'assignments', component: Assignments },
      { path: 'calendar', component: Calendar },
      { path: 'grades', component: Grades },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];