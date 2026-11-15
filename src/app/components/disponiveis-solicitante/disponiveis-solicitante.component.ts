import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ErroApi } from '../../models/api.models';
import { Equipamento } from '../../models/equiptrack.models';
import { EquipTrackService } from '../../services/equiptrack.service';
import { BotaoDirective, ChipFiltroComponent } from '../ui/botao.component';
import { CampoComponent, InputDirective } from '../ui/campo.component';
import {
  AlertaComponent,
  EstadoCarregandoComponent,
  EstadoErroComponent,
  EstadoVazioComponent,
} from '../ui/estados-visuais.component';
import { IconComponent } from '../ui/icon.component';
import { ModalComponent } from '../ui/modal.component';
import { PainelCardComponent } from '../ui/painel-card.component';
import { SeloComponent } from '../ui/selo.component';

export interface ErrosSolicitacao {
  ini?: string;
  fim?: string;
  geral?: string;
}

const HORA_EM_MS = 60 * 60 * 1000;

/** Traduz a resposta de erro do POST /api/solicitacoes para as mensagens do formulário. */
export function errosDaSolicitacao(erro: unknown): ErrosSolicitacao {
  if (erro instanceof HttpErrorResponse) {
    const corpo = erro.error as Partial<ErroApi> | null;
    if ((erro.status === 400 || erro.status === 409) && corpo?.campos) {
      const { inicioPrevisto, fimPrevisto, ...outros } = corpo.campos;
      const erros: ErrosSolicitacao = {};
      if (inicioPrevisto) erros.ini = inicioPrevisto;
      if (fimPrevisto) erros.fim = fimPrevisto;
      // Os demais campos (como o equipamento) não têm entrada no formulário.
      const geral = Object.values(outros)[0];
      if (geral) erros.geral = geral;
      if (Object.keys(erros).length > 0) return erros;
    }
    // O 403 traz o motivo: cadastro de solicitante ausente, bloqueado ou matrícula inativa.
    if (erro.status === 403) {
      return { geral: corpo?.mensagem ?? 'Seu perfil não pode criar solicitações.' };
    }
    if (erro.status === 0) {
      return { geral: 'Não foi possível falar com o servidor. Tente novamente.' };
    }
  }
  return { geral: 'Não foi possível enviar a solicitação. Tente novamente.' };
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
    AlertaComponent,
  ],
  template: `
    <app-painel-card titulo="Disponíveis" [contagem]="equipamentosDisponiveis().length">
      @if (possuiAtraso()) {
        <div class="p-4 pb-0">
          <app-alerta titulo="Novas solicitações bloqueadas">
            Você tem um empréstimo em atraso. Devolva o equipamento ao operador para liberar novos
            pedidos.
          </app-alerta>
        </div>
      }
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
          @for (cat of state.categorias(); track cat.id) {
            <app-chip-filtro
              [ativo]="categoriaFiltro() === cat.nome"
              (selecionar)="categoriaFiltro.set(cat.nome)"
            >
              {{ cat.nome }}
            </app-chip-filtro>
          }
        </div>
      </div>

      @switch (state.estado()) {
        @case ('carregando') {
          <app-estado-carregando />
        }
        @case ('erro') {
          <app-estado-erro (tentarNovamente)="state.carregarCatalogo()" />
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
        <app-campo id="fim" label="Fim previsto" [erro]="erros().fim" [ajuda]="ajudaPrazo()">
          <input
            id="fim"
            type="datetime-local"
            appInput
            [invalido]="!!erros().fim"
            [ngModel]="fimPrevisto()"
            (ngModelChange)="fimPrevisto.set($event)"
          />
        </app-campo>
        @if (erros().geral) {
          <p class="text-sm text-danger" role="alert">
            {{ erros().geral }}
          </p>
        }
      </div>

      <ng-container rodape>
        <button
          type="button"
          appBotao
          variant="fantasma"
          [disabled]="enviando()"
          (click)="fecharModalSolicitar()"
        >
          Cancelar
        </button>
        <button type="button" appBotao [disabled]="enviando()" (click)="enviarSolicitacao()">
          {{ enviando() ? 'Enviando…' : 'Enviar solicitação' }}
        </button>
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

  readonly termoBusca = signal<string>('');
  readonly categoriaFiltro = signal<string>('');
  readonly equipamentoSelecionado = signal<Equipamento | null>(null);
  readonly inicioPrevisto = signal<string>('');
  readonly fimPrevisto = signal<string>('');
  readonly erros = signal<ErrosSolicitacao>({});
  readonly enviando = signal<boolean>(false);

  readonly ajudaPrazo = computed(() => {
    const equip = this.equipamentoSelecionado();
    return equip ? `Prazo máximo deste equipamento: ${equip.prazoMaxHoras} horas.` : undefined;
  });

  // A API devolve só as solicitações de quem está logado, com o atraso já calculado (RN15).
  // O backend também recusa a solicitação; o botão desabilitado só evita a tentativa.
  readonly possuiAtraso = computed(() =>
    this.state.solicitacoes().some((s) => s.status === 'ATRASADO'),
  );

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
    if (this.enviando()) return;
    this.equipamentoSelecionado.set(null);
    this.erros.set({});
  }

  async enviarSolicitacao(): Promise<void> {
    const equip = this.equipamentoSelecionado();
    if (!equip || this.enviando()) return;

    // Validação local para resposta imediata; o backend repete todas as regras.
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
    } else if (
      ini &&
      new Date(fim).getTime() - new Date(ini).getTime() > equip.prazoMaxHoras * HORA_EM_MS
    ) {
      novosErros.fim = `O prazo máximo deste equipamento é de ${equip.prazoMaxHoras} horas.`;
    }

    this.erros.set(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    this.enviando.set(true);
    try {
      await this.state.criarSolicitacao(equip, ini, fim);
      this.equipamentoSelecionado.set(null);
    } catch (erro) {
      this.erros.set(errosDaSolicitacao(erro));
    } finally {
      this.enviando.set(false);
    }
  }
}

