import { Component, computed, inject, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { DisponiveisSolicitanteComponent } from '../../components/disponiveis-solicitante/disponiveis-solicitante.component';
import { EquipamentosOperadorComponent } from '../../components/equipamentos-operador/equipamentos-operador.component';
import { FilaSolicitacoesComponent } from '../../components/fila-solicitacoes/fila-solicitacoes.component';
import { HistoricoEquipamentoComponent } from '../../components/historico-equipamento/historico-equipamento.component';
import { MinhasSolicitacoesComponent } from '../../components/minhas-solicitacoes/minhas-solicitacoes.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { GavetaComponent } from '../../components/ui/modal.component';
import { ToasterComponent } from '../../components/ui/toaster.component';
import { PerfilUsuario } from '../../models/equiptrack.models';
import { EquipTrackService } from '../../services/equiptrack.service';

@Component({
  selector: 'app-painel',
  standalone: true,
  imports: [
    ToasterComponent,
    TopbarComponent,
    EquipamentosOperadorComponent,
    FilaSolicitacoesComponent,
    DisponiveisSolicitanteComponent,
    MinhasSolicitacoesComponent,
    GavetaComponent,
    HistoricoEquipamentoComponent,
  ],
  template: `
    <div class="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden">
      <app-toaster />

      <app-topbar (sair)="voltarAoLogin()" />

      @if (!ocultarFaixaIndicadores()) {
        <div class="grain shrink-0 border-b border-border bg-topbar">
          <div class="flex h-[72px] items-center gap-8 overflow-x-auto px-4 lg:px-6">
            @for (ind of state.indicadores(); track ind.rotulo) {
              <div class="flex shrink-0 items-center gap-3">
                <span [class]="'h-8 w-1 rounded-full ' + ind.corBarra"></span>
                <span
                  [class]="
                    'font-display text-[40px] leading-none ' +
                    (ind.destaquePerigo && ind.valor > 0 ? 'text-danger' : '')
                  "
                >
                  {{ formatarNumero(ind.valor) }}
                </span>
                <span class="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">
                  {{ ind.rotulo }}
                </span>
              </div>
            }
          </div>
        </div>
      }

      <div
        class="sticky top-16 z-20 flex border-b border-border bg-background px-4 py-2 lg:hidden"
        role="tablist"
      >
        @for (link of state.linksNavegacao(); track link) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="state.abaAtiva() === link"
            (click)="state.irParaAba(link)"
            [class]="
              'min-h-11 flex-1 rounded-sm text-xs font-semibold uppercase tracking-wider ' +
              (state.abaAtiva() === link ? 'bg-accent text-on-accent' : 'text-muted-foreground')
            "
          >
            {{ link }}
          </button>
        }
      </div>

      <main class="flex flex-1 flex-col gap-4 p-4 lg:min-h-0 lg:p-6 lg:pt-4">
        @if (state.ehOperador()) {
          @if (state.abaAtiva() === 'SOLICITAÇÕES') {
            <app-fila-solicitacoes />
          } @else {
            <app-equipamentos-operador />
          }
        } @else {
          @if (state.abaAtiva() === 'MINHAS SOLICITAÇÕES') {
            <app-minhas-solicitacoes />
          } @else {
            <app-disponiveis-solicitante />
          }
        }
      </main>

      <app-gaveta
        [aberto]="!!state.equipamentoHistoricoSelecionado()"
        titulo="Histórico do equipamento"
        (fechar)="state.abrirHistorico(null)"
      >
        @if (state.equipamentoHistoricoSelecionado(); as equipSel) {
          <app-historico-equipamento
            [equipamento]="equipSel"
            [eventos]="state.eventosHistoricoSelecionado()"
          />
        }
      </app-gaveta>
    </div>
  `,
})
export class PainelComponent implements OnInit {
  readonly state = inject(EquipTrackService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);

  readonly ocultarFaixaIndicadores = computed(() => {
    const aba = this.state.abaAtiva();
    return aba === 'SOLICITAÇÕES' || aba === 'MINHAS SOLICITAÇÕES';
  });

  ngOnInit(): void {
    this.title.setTitle('Painel — EquipTrack');
    // Perfil vem do usuário autenticado; os dados de equipamentos/solicitações ainda são mock
    // até o backend expor essas APIs. O seletor de perfil do topbar continua para homologação.
    const usuario = this.auth.usuario();
    const perfil: PerfilUsuario = usuario?.perfil === 'SOLICITANTE' ? 'rafael' : 'operador';
    this.state.definirPerfil(perfil);
    this.state.nomeLogado.set(usuario?.nome ?? null);
  }

  formatarNumero(valor: number): string {
    return String(valor).padStart(2, '0');
  }

  voltarAoLogin(): void {
    this.auth.logout().subscribe(() => void this.router.navigate(['/login']));
  }
}
