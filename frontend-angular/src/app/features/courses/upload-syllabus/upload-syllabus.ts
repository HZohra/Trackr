import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CourseService, ExtractionResult } from '../../../core/services/course.service';

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

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
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

  protected onSave(): void {
    const result = this.extracted();
    if (!result) return;
    this.saving.set(true);
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