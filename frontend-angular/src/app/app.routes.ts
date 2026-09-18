import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';
import { Dashboard } from './features/dashboard/dashboard';
import { Courses } from './features/courses/courses';
import { Assignments } from './features/assignments/assignments';
import { Calendar } from './features/calendar/calendar';
import { Grades } from './features/grades/grades';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,          // the shell wraps every page below
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'courses', component: Courses },
      { path: 'assignments', component: Assignments },
      { path: 'calendar', component: Calendar },
      { path: 'grades', component: Grades },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, // default landing
    ],
  },
];