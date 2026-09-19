import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

// Attaches the JWT to every outgoing API request, so protected endpoints
// (like GET /user/courses) authenticate. This is the browser equivalent of
// the "Authorization: Bearer <token>" header you set by hand in PowerShell.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};