import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly needsVerification = signal(false);
  protected readonly resent = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    remember: [false],
  });

  constructor() {
    // If we were bounced here by an expired session, say so.
    if (this.route.snapshot.queryParamMap.get('expired') === '1') {
      this.error.set('Your session expired — please sign in again.');
    }
  }

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.needsVerification.set(false);
    this.resent.set(false);
    this.loading.set(true);
    const { email, password, remember } = this.form.getRawValue();
    this.auth.login(email, password, remember).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: (err) => {
        this.loading.set(false);
        // A 403 with needsVerification means the account exists but the email
        // isn't verified — offer a resend instead of a dead-end error.
        this.needsVerification.set(
          err?.status === 403 && err?.error?.needsVerification === true,
        );
        this.error.set(err?.error?.message ?? 'Login failed. Please try again.');
      },
    });
  }

  protected resend(): void {
    const email = this.form.controls.email.value;
    if (!email) return;
    this.auth.resendVerification(email).subscribe({ next: () => this.resent.set(true) });
  }
}