import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface LoginResponse {
  user: AuthUser;
  token: string;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: 'student';
}

const TOKEN_KEY = 'trackr-token';
const USER_KEY = 'trackr-user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBase;

  private readonly userSignal = signal<AuthUser | null>(this.readUser());
  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);

  // "Remember me" decides where the session lives:
  //   localStorage   → survives closing the browser (remembered)
  //   sessionStorage → cleared when the tab/browser closes (not remembered)
  login(email: string, password: string, remember = true): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.api}/auth/login`, { email, password })
      .pipe(tap((res) => this.persistSession(res.token, res.user, remember)));
  }

  register(payload: RegisterPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/auth/register`, payload);
  }

  getProfile(): Observable<AuthUser & { institution?: string | null }> {
    const id = this.userSignal()?.user_id;
    return this.http.get<AuthUser & { institution?: string | null }>(
      `${this.api}/user/${id}/profile`,
    );
  }

  updateProfile(profile: {
    first_name: string;
    last_name: string;
    institution: string | null;
  }): Observable<unknown> {
    const id = this.userSignal()?.user_id;
    return this.http.put(`${this.api}/user/${id}/profile`, { profile }).pipe(
      tap(() => {
        const current = this.userSignal();
        if (current) {
          const updated = {
            ...current,
            first_name: profile.first_name,
            last_name: profile.last_name,
          };
          this.activeStore().setItem(USER_KEY, JSON.stringify(updated));
          this.userSignal.set(updated);
        }
      }),
    );
  }

  changePassword(
    currentPassword: string,
    newPassword: string,
  ): Observable<{ message: string; token?: string }> {
    return this.http
      .put<{ message: string; token?: string }>(
        `${this.api}/user/change-password`,
        { currentPassword, newPassword },
      )
      .pipe(
        tap((res) => {
          // The change rotated our token — swap in the fresh one so this session
          // keeps working (all other sessions are now invalidated).
          if (res?.token) this.activeStore().setItem(TOKEN_KEY, res.token);
        }),
      );
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.api}/auth/reset-password/${encodeURIComponent(token)}`,
      { password },
    );
  }

    verifyEmail(token: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.api}/auth/verify-email/${encodeURIComponent(token)}`,
      {},
    );
  }

  resendVerification(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/auth/resend-verification`, { email });
  }

  logout(): void {
    for (const store of [localStorage, sessionStorage]) {
      store.removeItem(TOKEN_KEY);
      store.removeItem(USER_KEY);
    }
    this.userSignal.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }

  // Whichever store currently holds the session (localStorage wins if both).
  private activeStore(): Storage {
    return localStorage.getItem(TOKEN_KEY) !== null ? localStorage : sessionStorage;
  }

  private persistSession(token: string, user: AuthUser, remember: boolean): void {
    const store = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    other.removeItem(TOKEN_KEY);
    other.removeItem(USER_KEY);
    store.setItem(TOKEN_KEY, token);
    store.setItem(USER_KEY, JSON.stringify(user));
    this.userSignal.set(user);
  }

  private readUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(USER_KEY);
      return null;
    }
  }
}