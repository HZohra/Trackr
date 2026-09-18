import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  protected readonly showPassword = signal(false);
  protected readonly submitted = signal(false);

  // nonNullable.group => each control is a plain string (never null), fully typed.
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    remember: [false],
  });

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched(); // reveals all error messages at once
      return;
    }
    // No backend yet — this is the exact payload we'll POST to /auth/login next.
    console.log('login payload', this.form.getRawValue());
    this.submitted.set(true);
  }
}