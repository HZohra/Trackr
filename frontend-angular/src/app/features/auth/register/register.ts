import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { strongPasswordValidator } from '../../../core/password-policy';
import { PasswordRequirements } from '../../../shared/password-requirements/password-requirements';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  return group.get('password')?.value === group.get('confirmPassword')?.value ? null : { mismatch: true };
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, PasswordRequirements],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly registered = signal(false);
  protected readonly registeredEmail = signal('');

  protected readonly form = this.fb.nonNullable.group(
    {
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, strongPasswordValidator]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected togglePassword(): void { this.showPassword.update((v) => !v); }

  protected onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.error.set(null);
    this.loading.set(true);
    const v = this.form.getRawValue();
    this.auth
      .register({ first_name: v.firstName, last_name: v.lastName, email: v.email, password: v.password, role: 'student' })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.registeredEmail.set(v.email);
          this.registered.set(true);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message ?? 'Registration failed. Please try again.');
        },
      });
  }
}