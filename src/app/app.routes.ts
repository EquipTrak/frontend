import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'esqueci-senha',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/esqueci-senha/esqueci-senha').then((m) => m.EsqueciSenha),
  },
  {
    path: 'redefinir-senha',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/redefinir-senha/redefinir-senha').then((m) => m.RedefinirSenha),
  },
  {
    path: 'painel',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/painel/painel.component').then((m) => m.PainelComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'painel' },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
