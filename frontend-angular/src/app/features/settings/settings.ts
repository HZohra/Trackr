import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ThemeService, Theme, AccentId } from '../../core/services/theme.service';
import { GpaService } from '../../core/services/gpa.service';
import { GpaScaleId, GradeBand } from '../../core/gpa';
import { PreferencesService } from '../../core/services/preferences.service';
import { AuthService } from '../../core/services/auth.service';
import { strongPasswordValidator } from '../../core/password-policy';
import { PasswordRequirements } from '../../shared/password-requirements/password-requirements';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const a = group.get('newPassword')?.value;
  const b = group.get('confirm')?.value;
  return a === b ? null : { mismatch: true };
}

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule, PasswordRequirements],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly gpaService = inject(GpaService);
  private readonly prefs = inject(PreferencesService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected readonly theme = this.themeService.theme;
  protected readonly accent = this.themeService.accent;
  protected readonly accents = this.themeService.accents;
  protected readonly customHue = this.themeService.customHue;

  protected readonly scaleOptions = this.gpaService.scaleOptions;
  protected readonly gpaScaleId = this.gpaService.scaleId;
  protected readonly customBands = this.gpaService.customBands;

  protected readonly showArchived = this.prefs.showArchivedCourses;

  // --- Personal information ---
  protected readonly personalSaving = signal(false);
  protected readonly personalSaved = signal(false);
  protected readonly personalError = signal<string | null>(null);
  protected readonly personalForm = this.fb.nonNullable.group({
    first_name: ['', [Validators.required]],
    last_name: ['', [Validators.required]],
    institution: [''],
  });

  // --- Password ---
  protected readonly passwordSaving = signal(false);
  protected readonly passwordSaved = signal(false);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, strongPasswordValidator]],
      confirm: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  ngOnInit(): void {
    this.auth.getProfile().subscribe({
      next: (p) => {
        this.personalForm.patchValue({
          first_name: p.first_name ?? '',
          last_name: p.last_name ?? '',
          institution: p.institution ?? '',
        });
      },
      error: () => {
        const u = this.auth.currentUser();
        if (u) {
          this.personalForm.patchValue({
            first_name: u.first_name,
            last_name: u.last_name,
          });
        }
      },
    });
  }

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected savePersonal(): void {
    if (this.personalForm.invalid) {
      this.personalForm.markAllAsTouched();
      return;
    }
    this.personalError.set(null);
    this.personalSaved.set(false);
    this.personalSaving.set(true);
    const { first_name, last_name, institution } = this.personalForm.getRawValue();
    this.auth
      .updateProfile({ first_name, last_name, institution: institution || null })
      .subscribe({
        next: () => {
          this.personalSaving.set(false);
          this.personalSaved.set(true);
        },
        error: (err) => {
          this.personalSaving.set(false);
          this.personalError.set(err?.error?.message ?? 'Could not save your changes.');
        },
      });
  }

  protected savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.passwordError.set(null);
    this.passwordSaved.set(false);
    this.passwordSaving.set(true);
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.passwordSaving.set(false);
        this.passwordSaved.set(true);
        this.passwordForm.reset();
      },
      error: (err) => {
        this.passwordSaving.set(false);
        this.passwordError.set(err?.error?.message ?? 'Could not update your password.');
      },
    });
  }

  protected setTheme(t: Theme): void { this.themeService.setTheme(t); }
  protected setAccent(id: AccentId): void { this.themeService.setAccent(id); }
  protected setCustomHue(hue: number): void { this.themeService.setCustomHue(hue); }
  protected swatch(id: AccentId): string { return this.themeService.shadesFor(id).brand; }
  protected customSwatch(): string { return this.themeService.shadesFor('custom').brand; }

  protected setGpaScale(id: GpaScaleId): void { this.gpaService.setScale(id); }
  protected updateBand(i: number, patch: Partial<GradeBand>): void { this.gpaService.updateBand(i, patch); }
  protected addBand(): void { this.gpaService.addBand(); }
  protected removeBand(i: number): void { this.gpaService.removeBand(i); }
  protected resetCustom(): void { this.gpaService.resetCustom(); }

  protected setShowArchived(v: boolean): void { this.prefs.setShowArchivedCourses(v); }
}