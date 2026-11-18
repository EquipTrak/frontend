import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { PainelComponent } from './pages/painel/painel.component';
import { autenticadoGuard } from './services/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: LoginComponent,
  },
  {
    path: 'painel',
    component: PainelComponent,
    canActivate: [autenticadoGuard],
  },
  {
    path: '**',
    component: NotFoundComponent,
  },
];
