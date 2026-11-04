import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

/** Página inicial provisória, só para provar o fluxo de login e logout. */
@Component({
  selector: 'app-home',
  template: `
    <main class="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 p-4">
      <h1 class="text-2xl font-semibold text-slate-900">Olá, {{ auth.usuario()?.nome }}</h1>
      <p class="text-sm text-slate-600">Perfil: {{ auth.usuario()?.perfil }}</p>
      <button
        type="button"
        (click)="sair()"
        class="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
      >
        Sair
      </button>
    </main>
  `,
})
export class Home {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected sair(): void {
    this.auth.logout().subscribe(() => void this.router.navigate(['/login']));
  }
}
