import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ErroApi } from '../../models/api.models';
import { AuthService } from '../../services/auth.service';
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
            @if (erro(); as falha) {
              <app-alerta [titulo]="falha.titulo">{{ falha.texto }}</app-alerta>
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

            <app-campo id="senha" label="Senha">
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
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);

  readonly email = signal<string>('');
  readonly senha = signal<string>('');
  readonly erro = signal<ErroLogin | null>(null);
  readonly erroCredenciais = computed(() => this.erro()?.credenciais ?? false);
  readonly entrando = signal<boolean>(false);

  constructor() {
    this.title.setTitle('Entrar - EquipTrack');
  }

  async aoSubmeter(): Promise<void> {
    if (this.entrando()) return;
    this.erro.set(null);
    this.entrando.set(true);
    try {
      await this.auth.login(this.email().trim(), this.senha());
      await this.router.navigate(['/painel']);
    } catch (erro) {
      this.erro.set(descreverErroLogin(erro));
    } finally {
      this.entrando.set(false);
    }
  }
}

interface ErroLogin {
  titulo: string;
  texto: string;
  credenciais: boolean;
}

/** Traduz a resposta de erro do backend (ver backend/docs/autenticacao.md) em uma mensagem para a tela. */
export function descreverErroLogin(erro: unknown): ErroLogin {
  if (!(erro instanceof HttpErrorResponse)) {
    return { titulo: 'Não foi possível entrar', texto: 'Tente novamente.', credenciais: false };
  }
  const corpo = erro.error as Partial<ErroApi> | null;
  switch (erro.status) {
    case 0:
      return {
        titulo: 'Servidor indisponível',
        texto: 'Não foi possível conectar ao servidor. Tente novamente em instantes.',
        credenciais: false,
      };
    case 400:
      return {
        titulo: 'Confira os dados',
        texto: Object.values(corpo?.campos ?? {}).join(' ') || 'Preencha e-mail e senha.',
        credenciais: false,
      };
    case 401:
      return {
        titulo: 'E-mail ou senha inválidos',
        texto: 'Confira os dados e tente novamente.',
        credenciais: true,
      };
    case 403:
      return {
        titulo: 'Acesso desativado',
        texto: corpo?.mensagem ?? 'Procure o administrador.',
        credenciais: false,
      };
    case 429: {
      const segundos = Number(erro.headers.get('Retry-After'));
      const minutos = Number.isFinite(segundos) && segundos > 0 ? Math.ceil(segundos / 60) : 15;
      return {
        titulo: 'Muitas tentativas',
        texto: `O login foi bloqueado. Tente novamente em ${minutos} min.`,
        credenciais: false,
      };
    }
    default:
      return {
        titulo: 'Erro no servidor',
        texto: corpo?.mensagem ?? 'Tente novamente em instantes.',
        credenciais: false,
      };
  }
}

