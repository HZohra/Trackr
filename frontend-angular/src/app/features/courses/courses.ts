import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { CourseCard } from '../../shared/course-card/course-card';
import { Course } from '../../core/models/course';
import { CourseService } from '../../core/services/course.service';

type CourseTab = 'all' | 'active' | 'archived';
type CourseSort = 'code' | 'name' | 'grade';

@Component({
  selector: 'app-courses',
  imports: [CourseCard, RouterLink],
  templateUrl: './courses.html',
  styleUrl: './courses.css',
})
export class Courses {
  private readonly courseService = inject(CourseService);
  private readonly route = inject(ActivatedRoute);

  protected readonly courses = signal<Course[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly selectedTab = signal<CourseTab>('all');
  protected readonly searchQuery = signal('');
  protected readonly sortBy = signal<CourseSort>('code');

  protected readonly allCount = computed(() =>
    this.courses().length,
  );

  protected readonly activeCount = computed(() =>
    this.courses().filter((course) => !course.archived).length,
  );

  protected readonly archivedCount = computed(() =>
    this.courses().filter((course) => course.archived).length,
  );

  protected readonly filteredCourses = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();

    let courses = [...this.courses()];

    if (this.selectedTab() === 'active') {
      courses = courses.filter((course) => !course.archived);
    }

    if (this.selectedTab() === 'archived') {
      courses = courses.filter((course) => course.archived);
    }

    if (query) {
      courses = courses.filter((course) => {
        const searchable = [
          course.code,
          course.name,
          course.professor,
        ]
          .join(' ')
          .toLowerCase();

        return searchable.includes(query);
      });
    }

    const sorted = [...courses];

    switch (this.sortBy()) {
      case 'name':
        sorted.sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        break;

      case 'grade':
        sorted.sort((a, b) => {
          const aGrade = a.currentGrade ?? -1;
          const bGrade = b.currentGrade ?? -1;

          return bGrade - aGrade;
        });
        break;

      case 'code':
      default:
        sorted.sort((a, b) =>
          a.code.localeCompare(b.code),
        );
        break;
    }

    return sorted;
  });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const filter = params.get('filter');

      if (filter === 'archived') {
        this.selectedTab.set('archived');
      } else if (filter === 'active') {
        this.selectedTab.set('active');
      } else {
        this.selectedTab.set('all');
      }
    });

    this.courseService.getCourses().subscribe({
      next: (courses) => {
        this.courses.set(courses);
        this.loading.set(false);
      },

      error: () => {
        this.error.set('Could not load your courses.');
        this.loading.set(false);
      },
    });
  }

  protected setTab(tab: CourseTab): void {
    this.selectedTab.set(tab);
    this.searchQuery.set('');
  }

  protected setSearch(value: string): void {
    this.searchQuery.set(value);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
  }

  protected setSort(value: string): void {
    if (
      value === 'code' ||
      value === 'name' ||
      value === 'grade'
    ) {
      this.sortBy.set(value);
    }
  }
}