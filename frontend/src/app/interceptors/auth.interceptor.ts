import { HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_URL } from '../config';
import { AuthService, getToken } from '../services/auth';

// adds the login token to every API call, and logs you out if the server says it's no longer valid
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  const token = getToken();

  if (token && req.url.startsWith(API_URL)) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError(err => {
      if (err.status === 401 && token && !req.url.includes('/auth/login')) {
        injector.get(AuthService).logout(true);
      }
      return throwError(() => err);
    })
  );
};
