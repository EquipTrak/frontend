import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from '../api.config';
import { AuthService } from './auth.service';

/** Envia o token nas chamadas à API e volta ao login quando o backend recusa a sessão. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_URL)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;
  const requisicao = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(requisicao).pipe(
    catchError((erro: unknown) => {
      const sessaoRecusada =
        erro instanceof HttpErrorResponse &&
        erro.status === 401 &&
        token !== null &&
        !req.url.endsWith('/auth/login') &&
        !req.url.endsWith('/auth/logout');
      if (sessaoRecusada) {
        auth.limparSessao();
        void router.navigate(['/']);
      }
      return throwError(() => erro);
    }),
  );
};
