import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CATEGORIAS, Equipamento } from '../../models/equiptrack.models';
import { EquipTrackService } from '../../services/equiptrack.service';
import { BotaoDirective, ChipFiltroComponent } from '../ui/botao.component';
import { CampoComponent, InputDirective } from '../ui/campo.component';
import {
  EstadoCarregandoComponent,
  EstadoErroComponent,
  EstadoVazioComponent,
} from '../ui/estados-visuais.component';
import { IconComponent } from '../ui/icon.component';
import { ModalComponent } from '../ui/modal.component';
import { PainelCardComponent } from '../ui/painel-card.component';
import { SeloComponent } from '../ui/selo.component';

interface ErrosSolicitacao {
  ini?: string;
  fim?: string;
}

@Component({
  selector: 'app-disponiveis-solicitante',
  standalone: true,
  imports: [
    FormsModule,
    PainelCardComponent,
    BotaoDirective,
    ChipFiltroComponent,
    CampoComponent,
    InputDirective,
    IconComponent,
    SeloComponent,
    EstadoCarregandoComponent,
    EstadoErroComponent,
    EstadoVazioComponent,
    ModalComponent,
  ],
  template: `
    <app-painel-card titulo="Disponíveis" [contagem]="equipamentosDisponiveis().length">
      <div class="space-y-2 border-b border-border px-4 py-3">
        <div class="relative">
          <app-icon
            name="search"
            svgClass="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            appInput
            aria-label="Buscar equipamento"
            placeholder="Buscar por patrimônio ou nome"
            extraClass="pl-9"
            [ngModel]="termoBusca()"
            (ngModelChange)="termoBusca.set($event)"
          />
        </div>
        <div class="flex gap-2 overflow-x-auto">
          <app-chip-filtro [ativo]="!categoriaFiltro()" (selecionar)="categoriaFiltro.set('')">
            Todas
          </app-chip-filtro>
          @for (cat of categorias; track cat) {
            <app-chip-filtro
              [ativo]="categoriaFiltro() === cat"
              (selecionar)="categoriaFiltro.set(cat)"
            >
              {{ cat }}
            </app-chip-filtro>
          }
        </div>
      </div>

      @switch (state.estado()) {
        @case ('carregando') {
          <app-estado-carregando />
        }
        @case ('erro') {
          <app-estado-erro (tentarNovamente)="state.definirEstado('normal')" />
        }
        @case ('vazio') {
          <app-estado-vazio
            titulo="Nenhum equipamento disponível"
            texto="Tente ajustar a busca ou a categoria."
            [temAcao]="true"
          >
            <button type="button" appBotao variant="secundario" (click)="limparFiltros()">
              Limpar filtros
            </button>
          </app-estado-vazio>
        }
        @default {
          @if (equipamentosDisponiveis().length === 0) {
            <app-estado-vazio
              titulo="Nenhum equipamento disponível"
              texto="Tente ajustar a busca ou a categoria."
              [temAcao]="true"
            >
              <button type="button" appBotao variant="secundario" (click)="limparFiltros()">
                Limpar filtros
              </button>
            </app-estado-vazio>
          } @else {
            <div class="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              @for (e of equipamentosDisponiveis(); track e.patrimonio) {
                <article
                  class="flex flex-col rounded-md border border-border bg-surface-2/40 p-4 chamfer-sm"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-mono text-accent-text">{{ e.patrimonio }}</span>
                    <app-selo [valor]="e.condicao" />
                  </div>
                  <h3 class="mt-2 font-semibold">{{ e.descricao }}</h3>
                  <p class="text-xs text-muted-foreground">{{ e.categoria }}</p>
                  <button
                    type="button"
                    appBotao
                    extraClass="mt-4 w-full"
                    [disabled]="possuiAtraso()"
                    (click)="abrirModalSolicitar(e)"
                  >
                    Solicitar
                  </button>
                </article>
              }
            </div>
          }
        }
      }
    </app-painel-card>

    <app-modal
      [aberto]="!!equipamentoSelecionado()"
      titulo="Solicitar empréstimo"
      (fechar)="fecharModalSolicitar()"
    >
      <p class="mb-4 text-sm">
        <span class="font-mono text-accent-text">{{ equipamentoSelecionado()?.patrimonio }}</span>
        · {{ equipamentoSelecionado()?.descricao }}
      </p>
      <div class="space-y-4">
        <app-campo id="ini" label="Início previsto" [erro]="erros().ini">
          <input
            id="ini"
            type="datetime-local"
            appInput
            [invalido]="!!erros().ini"
            [ngModel]="inicioPrevisto()"
            (ngModelChange)="inicioPrevisto.set($event)"
          />
        </app-campo>
        <app-campo id="fim" label="Fim previsto" [erro]="erros().fim">
          <input
            id="fim"
            type="datetime-local"
            appInput
            [invalido]="!!erros().fim"
            [ngModel]="fimPrevisto()"
            (ngModelChange)="fimPrevisto.set($event)"
          />
        </app-campo>
      </div>

      <ng-container rodape>
        <button type="button" appBotao variant="fantasma" (click)="fecharModalSolicitar()">
          Cancelar
        </button>
        <button type="button" appBotao (click)="enviarSolicitacao()">Enviar solicitação</button>
      </ng-container>
    </app-modal>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1 1 0%;
      min-height: 0;
    }
  `,
})
export class DisponiveisSolicitanteComponent {
  readonly state = inject(EquipTrackService);
  readonly categorias = CATEGORIAS;

  readonly termoBusca = signal<string>('');
  readonly categoriaFiltro = signal<string>('');
  readonly equipamentoSelecionado = signal<Equipamento | null>(null);
  readonly inicioPrevisto = signal<string>('');
  readonly fimPrevisto = signal<string>('');
  readonly erros = signal<ErrosSolicitacao>({});

  readonly possuiAtraso = computed(() => {
    const eu = this.state.nomeUsuarioAtual();
    return this.state.solicitacoes().some((s) => s.solicitante === eu && s.status === 'ATRASADO');
  });

  readonly equipamentosDisponiveis = computed(() => {
    const cat = this.categoriaFiltro();
    const q = this.termoBusca().toLowerCase();
    return this.state
      .equipamentos()
      .filter(
        (e) =>
          e.situacao === 'DISPONIVEL' &&
          (!cat || e.categoria === cat) &&
          `${e.patrimonio} ${e.descricao}`.toLowerCase().includes(q),
      );
  });

  limparFiltros(): void {
    this.termoBusca.set('');
    this.categoriaFiltro.set('');
    this.state.definirEstado('normal');
  }

  abrirModalSolicitar(equipamento: Equipamento): void {
    this.equipamentoSelecionado.set(equipamento);
    this.inicioPrevisto.set('');
    this.fimPrevisto.set('');
    this.erros.set({});
  }

  fecharModalSolicitar(): void {
    this.equipamentoSelecionado.set(null);
    this.erros.set({});
  }

  enviarSolicitacao(): void {
    const equip = this.equipamentoSelecionado();
    if (!equip) return;

    const novosErros: ErrosSolicitacao = {};
    const ini = this.inicioPrevisto();
    const fim = this.fimPrevisto();

    if (!ini) {
      novosErros.ini = 'Informe a data e hora de início.';
    } else if (new Date(ini) < new Date()) {
      novosErros.ini = 'O início não pode estar no passado.';
    }

    if (!fim) {
      novosErros.fim = 'Informe a data e hora de fim.';
    } else if (ini && new Date(fim) <= new Date(ini)) {
      novosErros.fim = 'O fim deve ser posterior ao início.';
    }

    this.erros.set(novosErros);

    if (Object.keys(novosErros).length === 0) {
      this.state.criarSolicitacao(equip, ini, fim);
      this.equipamentoSelecionado.set(null);
    }
  }
}

