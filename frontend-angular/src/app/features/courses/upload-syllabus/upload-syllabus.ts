import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CourseService, ExtractionResult, ExtractedActivity } from '../../../core/services/course.service';

@Component({
  selector: 'app-upload-syllabus',
  imports: [RouterLink],
  templateUrl: './upload-syllabus.html',
  styleUrl: './upload-syllabus.css',
})
export class UploadSyllabus {
  private readonly courseService = inject(CourseService);
  private readonly router = inject(Router);

  protected readonly file = signal<File | null>(null);
  protected readonly extracted = signal<ExtractionResult | null>(null);
  protected readonly uploading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly categories = ['Assignment', 'Quiz', 'Exam', 'Project', 'Lab', 'Other'];

  protected readonly weightSum = computed(() => {
    const r = this.extracted();
    if (!r) return 0;
    return Math.round(r.activities.reduce((s, a) => s + (a.grading_weight ?? 0), 0) * 100) / 100;
  });

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0] ?? null;
    if (f && f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      this.error.set("That's not a PDF. Please choose a PDF syllabus.");
      this.file.set(null);
      input.value = '';
      return;
    }
    this.error.set(null);
    this.file.set(f);
  }

  protected onUpload(term: string): void {
    const f = this.file();
    if (!f || !term.trim()) {
      this.error.set('Please choose a PDF and enter the term.');
      return;
    }
    this.error.set(null);
    this.uploading.set(true);
    this.courseService.uploadSyllabus(f, term.trim()).subscribe({
      next: (result) => {
        this.extracted.set(result);
        this.uploading.set(false);
      },
      error: (err) => {
        this.uploading.set(false);
        this.error.set(err?.error?.message ?? 'Extraction failed. Try again, or add the course manually.');
      },
    });
  }

  protected patchCourse(patch: Partial<ExtractionResult['course']>): void {
    const r = this.extracted();
    if (!r) return;
    this.extracted.set({ ...r, course: { ...r.course, ...patch } });
  }

  protected patchActivity(i: number, patch: Partial<ExtractedActivity>): void {
    const r = this.extracted();
    if (!r) return;
    const activities = r.activities.map((a, idx) => (idx === i ? { ...a, ...patch } : a));
    this.extracted.set({ ...r, activities });
  }

  protected removeActivity(i: number): void {
    const r = this.extracted();
    if (!r) return;
    this.extracted.set({ ...r, activities: r.activities.filter((_, idx) => idx !== i) });
  }

  protected addActivity(): void {
    const r = this.extracted();
    if (!r) return;
    const blank: ExtractedActivity = { activity_category: 'Assignment', activity_name: '', due_date: null, grading_weight: null };
    this.extracted.set({ ...r, activities: [...r.activities, blank] });
  }

  protected setDate(i: number, value: string): void {
    this.patchActivity(i, { due_date: value ? value : null });
  }
  protected setWeight(i: number, value: string): void {
    this.patchActivity(i, { grading_weight: value === '' ? null : Number(value) });
  }
  protected dateValue(a: ExtractedActivity): string {
    return a.due_date ? a.due_date.slice(0, 10) : '';
  }

  protected onSave(): void {
    const result = this.extracted();
    if (!result) return;
    const c = result.course;
    if (!c.course_code?.trim() || !c.course_name?.trim() || !c.term?.trim()) {
      this.error.set('Course code, name, and term are required.');
      return;
    }
    if (result.activities.some((a) => !a.activity_name?.trim())) {
      this.error.set('Every assignment needs a name — fill it in or remove the empty row.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.courseService.saveExtracted(result).subscribe({
      next: () => this.router.navigateByUrl('/courses'),
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.errors?.[0] ?? err?.error?.message ?? 'Could not save the course.');
      },
    });
  }

  protected reset(): void {
    this.extracted.set(null);
    this.file.set(null);
    this.error.set(null);
  }
}
