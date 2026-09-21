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
import { AddCourse } from './features/courses/add-course/add-course';
import { UploadSyllabus } from './features/courses/upload-syllabus/upload-syllabus';
import { AddAssignment } from './features/assignments/add-assignment/add-assignment';
import { EditCourse } from './features/courses/edit-course/edit-course';
import { CourseDetail } from './features/courses/course-detail/course-detail';
import { Settings } from './features/settings/settings';


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
        { path: 'courses/new', component: AddCourse },
        { path: 'courses/upload', component: UploadSyllabus },
        { path: 'courses/:id/edit', component: EditCourse },
        { path: 'courses/:id', component: CourseDetail },
        { path: 'assignments', component: Assignments },
        { path: 'assignments/new', component: AddAssignment },
        { path: 'calendar', component: Calendar },
        { path: 'grades', component: Grades },
        { path: 'settings', component: Settings },
        { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];