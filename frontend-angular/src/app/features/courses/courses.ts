import { Component, signal } from '@angular/core';
import { CourseCard } from '../../shared/course-card/course-card';
import { Course } from '../../core/models/course';

@Component({
  selector: 'app-courses',
  imports: [CourseCard],
  templateUrl: './courses.html',
  styleUrl: './courses.css',
})
export class Courses {
  // Sample data for now — Phase 3 replaces this with a call to your API.
  protected readonly courses = signal<Course[]>([
    { id: 1, code: 'CP310',  name: 'Neural Network',     professor: 'Marek S. Wartak',      color: 'sky',    currentGrade: null, percentComplete: 0 },
    { id: 2, code: 'CP476B', name: 'Internet Computing',  professor: 'Dr. Raed Karim',       color: 'violet', currentGrade: null, percentComplete: 0 },
    { id: 3, code: 'YC 230', name: 'Children and Music',  professor: 'Dr. Annette Chretien', color: 'amber',  currentGrade: 100,  percentComplete: 3 },
  ]);
}