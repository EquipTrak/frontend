import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { PainelComponent } from './pages/painel/painel.component';

export const routes: Routes = [
  {
    path: '',
    component: LoginComponent,
  },
  {
    path: 'painel',
    component: PainelComponent,
  },
  {
    path: '**',
    component: NotFoundComponent,
  },
];
