import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { CourseService } from '../../core/services/course.service';
import { ActivityService } from '../../core/services/activity.service';
import { Course } from '../../core/models/course';
import { Activity } from '../../core/models/activity';

interface SearchResult {
  kind: string;
  label: string;
  sublabel: string;
  link: (string | number)[];
}

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
  host: { '(document:click)': 'closeMenus()' },
})
export class MainLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  private readonly courseService = inject(CourseService);
  private readonly activityService = inject(ActivityService);

  protected readonly user = this.auth.currentUser;
  protected readonly displayName = computed(() => {
    const u = this.user();
    return u ? `${u.first_name} ${u.last_name}` : 'User';
  });
  protected readonly initials = computed(() => {
    const u = this.user();
    return u ? `${u.first_name[0] ?? ''}${u.last_name[0] ?? ''}` : '?';
  });

  protected readonly isDark = computed(() => this.themeService.theme() === 'dark');
  protected toggleTheme(): void { this.themeService.toggle(); }

  protected readonly collapsed = signal(false);
  protected readonly addMenuOpen = signal(false);
  protected readonly userMenuOpen = signal(false);
  protected readonly chatOpen = signal(false);
  protected readonly chatExpanded = signal(false);

  // --- Search --------------------------------------------------------------
  private readonly courses = signal<Course[]>([]);
  private readonly activities = signal<Activity[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly searchOpen = signal(false);

  constructor() {
    this.courseService.getCourses().subscribe({ next: (c) => this.courses.set(c), error: () => {} });
    this.activityService.getAllActivities().subscribe({ next: (a) => this.activities.set(a), error: () => {} });
  }

  protected readonly results = computed<SearchResult[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return [];
    const courseHits = this.courses()
      .filter((c) => `${c.code} ${c.name}`.toLowerCase().includes(q))
      .slice(0, 5)
      .map((c) => ({ kind: 'Course', label: `${c.code} — ${c.name}`, sublabel: 'Course', link: ['/courses', c.id] as (string | number)[] }));
    const activityHits = this.activities()
      .filter((a) => a.activity_name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((a) => ({ kind: 'Assignment', label: a.activity_name, sublabel: this.courseCode(a.course_id), link: ['/courses', a.course_id] as (string | number)[] }));
    return [...courseHits, ...activityHits];
  });

  protected onSearch(value: string): void {
    this.searchQuery.set(value);
    this.searchOpen.set(true);
  }
  protected openSearch(): void { this.searchOpen.set(true); }
  protected pickResult(): void { this.searchOpen.set(false); this.searchQuery.set(''); }

  private courseCode(courseId: number): string {
    return this.courses().find((c) => c.id === courseId)?.code ?? '';
  }

  protected toggleCollapsed(): void { this.collapsed.update((v) => !v); }
  protected toggleAddMenu(): void { this.userMenuOpen.set(false); this.addMenuOpen.update((v) => !v); }
  protected toggleUserMenu(): void { this.addMenuOpen.set(false); this.userMenuOpen.update((v) => !v); }
  protected toggleChat(): void { this.chatOpen.update((v) => !v); }
  protected toggleChatExpand(): void { this.chatExpanded.update((v) => !v); }
  protected closeMenus(): void { this.addMenuOpen.set(false); this.userMenuOpen.set(false); this.searchOpen.set(false); }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}