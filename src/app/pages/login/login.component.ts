import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { PerfilUsuario } from '../../models/equiptrack.models';
import { BotaoDirective } from '../../components/ui/botao.component';
import { CampoComponent, InputDirective } from '../../components/ui/campo.component';
import { AlertaComponent } from '../../components/ui/estados-visuais.component';
import { BrandLogoComponent, MascoteComponent } from '../../components/ui/mascote-logo.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    BrandLogoComponent,
    MascoteComponent,
    AlertaComponent,
    CampoComponent,
    InputDirective,
    BotaoDirective,
  ],
  template: `
    <main class="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      <aside
        class="grain stripes relative hidden overflow-hidden border-r border-border bg-topbar lg:flex lg:flex-col lg:justify-between p-12"
      >
        <app-brand-logo />

        <div class="relative">
          <app-mascote
            [size]="220"
            svgClass="absolute -right-6 -top-56 opacity-90 rotate-6"
          />
          <h1 class="font-display text-[104px] leading-[0.88]">
            Cada<br />equipamento,<br /><span class="text-accent-text">rastreado.</span>
          </h1>
          <div class="mt-6 h-0.5 w-16 bg-accent"></div>
          <p class="mt-4 max-w-md text-muted-foreground">
            Solicitação, aprovação, retirada e devolução em um só lugar — do notebook ao adaptador
            HDMI.
          </p>
        </div>

        <p class="font-mono text-xs text-muted-foreground">
          NB-0001 · PJ-0001 · KT-0001 · AD-0001
        </p>
      </aside>

      <section class="flex items-center justify-center px-5 py-12">
        <div class="w-full max-w-sm">
          <div class="mb-8 lg:hidden">
            <app-brand-logo />
          </div>

          <h2 class="font-display text-4xl leading-none">Entrar</h2>
          <div class="mt-2 h-0.5 w-10 bg-accent"></div>
          <p class="mt-3 text-sm text-muted-foreground">Acesse com seu e-mail corporativo.</p>

          <form
            (ngSubmit)="aoSubmeter()"
            class="mt-6 space-y-4 rounded-md border border-border bg-surface p-5 chamfer"
          >
            @if (erroCredenciais()) {
              <app-alerta titulo="E-mail ou senha inválidos">
                Confira os dados e tente novamente.
              </app-alerta>
            }

            <app-campo id="email" label="E-mail">
              <input
                id="email"
                name="email"
                type="email"
                required
                appInput
                [ngModel]="email()"
                (ngModelChange)="email.set($event)"
              />
            </app-campo>

            <app-campo id="senha" label="Senha" ajuda="Protótipo: use a senha demo123">
              <input
                id="senha"
                name="senha"
                type="password"
                required
                appInput
                [invalido]="erroCredenciais()"
                [ngModel]="senha()"
                (ngModelChange)="senha.set($event)"
              />
            </app-campo>

            <button
              type="submit"
              appBotao
              extraClass="w-full min-h-11"
              [disabled]="entrando()"
            >
              {{ entrando() ? 'Entrando…' : 'Entrar' }}
            </button>
          </form>
        </div>
      </section>
    </main>
  `,
})
export class LoginComponent {
  private readonly router = inject(Router);
  private readonly title = inject(Title);

  readonly email = signal<string>('marina.souza@empresa.com');
  readonly senha = signal<string>('');
  readonly erroCredenciais = signal<boolean>(false);
  readonly entrando = signal<boolean>(false);

  constructor() {
    this.title.setTitle('Entrar - EquipTrack');
  }

  aoSubmeter(): void {
    this.erroCredenciais.set(false);
    this.entrando.set(true);

    window.setTimeout(() => {
      this.entrando.set(false);
      if (this.senha() !== 'demo123') {
        this.erroCredenciais.set(true);
        return;
      }

      const emailLower = this.email().toLowerCase();
      const perfil: PerfilUsuario = emailLower.startsWith('rafael')
        ? 'rafael'
        : emailLower.startsWith('beatriz')
          ? 'beatriz'
          : 'operador';

      void this.router.navigate(['/painel'], { queryParams: { perfil } });
    }, 600);
  }
}

