import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

function strongPassword(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value ?? '';
  const ok = value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value);
  return ok ? null : { weak: true };
}

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  return group.get('password')?.value === group.get('confirmPassword')?.value ? null : { mismatch: true };
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, strongPassword]],
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
          // Register returns no token, so log in immediately to enter the app.
          this.auth.login(v.email, v.password).subscribe({
            next: () => this.router.navigateByUrl('/dashboard'),
            error: () => this.router.navigateByUrl('/login'),
          });
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message ?? 'Registration failed. Please try again.');
        },
      });
  }
}