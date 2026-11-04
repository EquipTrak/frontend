import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Bloqueia rotas privadas e guarda a URL pedida para voltar após o login. */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  if (inject(AuthService).autenticado) return true;
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Impede quem já está autenticado de ver a tela de login. */
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthService).autenticado ? router.createUrlTree(['/']) : true;
};
