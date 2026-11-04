import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from '../config';
import { AuthService } from './auth.service';

/**
 * Anexa o Bearer token às chamadas ao backend. Um 401 em rota protegida
 * (token expirado ou revogado) encerra a sessão e leva o usuário ao login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiUrl = inject(API_URL);
  if (!req.url.startsWith(apiUrl)) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;
  const requisicao = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(requisicao).pipe(
    catchError((erro: unknown) => {
      const ehLogin = req.url === `${apiUrl}/auth/login`;
      const ehLogout = req.url === `${apiUrl}/auth/logout`;
      if (erro instanceof HttpErrorResponse && erro.status === 401 && !ehLogin && !ehLogout) {
        auth.limparSessao();
        void router.navigate(['/login'], { queryParams: { sessaoExpirada: true } });
      }
      return throwError(() => erro);
    }),
  );
};
