import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  imports: [RouterLink],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css',
})
export class VerifyEmail {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  protected readonly state = signal<'verifying' | 'done' | 'error'>('verifying');
  protected readonly message = signal('');

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('error');
      this.message.set('This verification link is invalid or missing its token.');
      return;
    }
    this.auth.verifyEmail(token).subscribe({
      next: (res) => {
        this.state.set('done');
        this.message.set(res?.message ?? 'Email verified. You can sign in now.');
      },
      error: (err) => {
        this.state.set('error');
        this.message.set(err?.error?.message ?? 'This verification link is invalid or has expired.');
      },
    });
  }
}