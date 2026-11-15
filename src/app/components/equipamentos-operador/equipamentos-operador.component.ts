import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ErroApi, NovoEquipamentoApi } from '../../models/api.models';
import {
  CondicaoEquipamento,
  formatarValorBadge,
  SituacaoEquipamento,
} from '../../models/equiptrack.models';
import { EquipTrackService } from '../../services/equiptrack.service';
import { BotaoDirective, ChipFiltroComponent } from '../ui/botao.component';
import { CampoComponent, InputDirective, SelectDirective } from '../ui/campo.component';
import {
  EstadoCarregandoComponent,
  EstadoErroComponent,
  EstadoVazioComponent,
} from '../ui/estados-visuais.component';
import { IconComponent } from '../ui/icon.component';
import { ModalComponent } from '../ui/modal.component';
import { PainelCardComponent } from '../ui/painel-card.component';
import { SeloComponent } from '../ui/selo.component';

interface ErrosNovoEquipamento {
  patrimonio?: string;
  categoriaId?: string;
  descricao?: string;
  condicao?: string;
  situacao?: string;
  prazoMaxHoras?: string;
  geral?: string;
}

const PRAZO_PADRAO_HORAS = 24;

/** Traduz a resposta de erro do POST /api/equipamentos para as mensagens do formulário. */
export function errosDoCadastro(erro: unknown): ErrosNovoEquipamento {
  if (erro instanceof HttpErrorResponse) {
    const corpo = erro.error as Partial<ErroApi> | null;
    if ((erro.status === 400 || erro.status === 409) && corpo?.campos) {
      return { ...corpo.campos };
    }
    if (erro.status === 403) {
      return { geral: 'Seu perfil não pode cadastrar equipamentos.' };
    }
    if (erro.status === 0) {
      return { geral: 'Não foi possível falar com o servidor. Tente novamente.' };
    }
  }
  return { geral: 'Não foi possível salvar o equipamento. Tente novamente.' };
}

@Component({
  selector: 'app-equipamentos-operador',
  standalone: true,
  imports: [
    FormsModule,
    PainelCardComponent,
    BotaoDirective,
    ChipFiltroComponent,
    IconComponent,
    SeloComponent,
    EstadoCarregandoComponent,
    EstadoErroComponent,
    EstadoVazioComponent,
    ModalComponent,
    CampoComponent,
    InputDirective,
    SelectDirective,
  ],
  template: `
    <app-painel-card titulo="Equipamentos" [contagem]="equipamentosFiltrados().length">
      <button acoes type="button" appBotao (click)="abrirModalNovo()">
        <app-icon name="plus" svgClass="size-4" />
        Novo equipamento
      </button>

      <div class="flex gap-2 overflow-x-auto border-b border-border px-4 py-2.5">
        <app-chip-filtro [ativo]="!filtroCategoria()" (selecionar)="filtroCategoria.set('')">
          Todas
        </app-chip-filtro>
        @for (cat of state.categorias(); track cat.id) {
          <app-chip-filtro
            [ativo]="filtroCategoria() === cat.nome"
            (selecionar)="filtroCategoria.set(cat.nome)"
          >
            {{ cat.nome }}
          </app-chip-filtro>
        }
        <span class="mx-1 w-px shrink-0 bg-border"></span>
        @for (sit of situacoesFiltro; track sit) {
          <app-chip-filtro
            [ativo]="filtroSituacao() === sit"
            (selecionar)="alternarSituacao(sit)"
          >
            {{ formatarBadge(sit) }}
          </app-chip-filtro>
        }
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
            titulo="Nenhum equipamento encontrado"
            texto="Tente ajustar os filtros ou cadastre um novo."
            [temAcao]="true"
          >
            <button type="button" appBotao (click)="abrirModalNovo()">
              <app-icon name="plus" svgClass="size-4" />
              Novo equipamento
            </button>
          </app-estado-vazio>
        }
        @default {
          @if (equipamentosFiltrados().length === 0) {
            <app-estado-vazio
              titulo="Nenhum equipamento encontrado"
              texto="Tente ajustar os filtros ou cadastre um novo."
              [temAcao]="true"
            >
              <button type="button" appBotao (click)="abrirModalNovo()">
                <app-icon name="plus" svgClass="size-4" />
                Novo equipamento
              </button>
            </app-estado-vazio>
          } @else {
            <table class="hidden w-full text-sm sm:table">
              <thead
                class="sticky top-0 bg-surface text-left text-[11px] uppercase tracking-widest text-muted-foreground"
              >
                <tr>
                  <th class="px-4 py-2 font-semibold">Patrimônio</th>
                  <th class="px-4 py-2 font-semibold">Descrição</th>
                  <th class="px-4 py-2 font-semibold">Categoria</th>
                  <th class="px-4 py-2 font-semibold">Condição</th>
                  <th class="px-4 py-2 font-semibold">Situação</th>
                  <th class="px-4 py-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                @for (e of equipamentosFiltrados(); track e.patrimonio) {
                  <tr
                    tabindex="0"
                    (click)="state.abrirHistorico(e.patrimonio)"
                    (keydown.enter)="state.abrirHistorico(e.patrimonio)"
                    class="h-12 cursor-pointer border-t border-border hover:bg-surface-2"
                  >
                    <td class="px-4 font-mono text-accent-text">{{ e.patrimonio }}</td>
                    <td class="px-4">{{ e.descricao }}</td>
                    <td class="px-4 text-muted-foreground">{{ e.categoria }}</td>
                    <td class="px-4">
                      <app-selo [valor]="e.condicao" />
                    </td>
                    <td class="px-4">
                      <app-selo [valor]="e.situacao" />
                    </td>
                    <td class="px-4 text-right">
                      <button
                        type="button"
                        appBotao
                        tamanho="pequeno"
                        variant="secundario"
                        (click)="abrirHistoricoSemPropagar($event, e.patrimonio)"
                      >
                        <app-icon name="history" svgClass="size-3.5" />
                        Histórico
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>

            <ul class="space-y-2 p-3 sm:hidden">
              @for (e of equipamentosFiltrados(); track e.patrimonio) {
                <li>
                  <button
                    type="button"
                    (click)="state.abrirHistorico(e.patrimonio)"
                    class="w-full rounded-md border border-border bg-surface-2/40 p-3 text-left"
                  >
                    <div class="flex justify-between">
                      <span class="font-mono text-accent-text">{{ e.patrimonio }}</span>
                      <app-selo [valor]="e.situacao" />
                    </div>
                    <p class="mt-1 font-medium">{{ e.descricao }}</p>
                    <div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      {{ e.categoria }}
                      <app-selo [valor]="e.condicao" />
                    </div>
                  </button>
                </li>
              }
            </ul>
          }
        }
      }
    </app-painel-card>

    <app-modal
      [aberto]="modalNovoAberto()"
      titulo="Novo equipamento"
      (fechar)="fecharModalNovo()"
    >
      <div class="space-y-4">
        @if (erros().geral) {
          <p role="alert" class="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            {{ erros().geral }}
          </p>
        }

        <app-campo
          id="pat"
          label="Identificador patrimonial"
          [erro]="erros().patrimonio"
          ajuda="Ex.: NB-0003 (único)"
        >
          <input
            id="pat"
            type="text"
            appInput
            extraClass="font-mono uppercase"
            [invalido]="!!erros().patrimonio"
            [ngModel]="novoPatrimonio()"
            (ngModelChange)="novoPatrimonio.set($event)"
          />
        </app-campo>

        <app-campo id="cat" label="Categoria" [erro]="erros().categoriaId">
          <select
            id="cat"
            appSelect
            [ngModel]="novaCategoriaId()"
            (ngModelChange)="novaCategoriaId.set($event)"
          >
            <option [ngValue]="null">Selecione…</option>
            @for (cat of state.categorias(); track cat.id) {
              <option [ngValue]="cat.id">{{ cat.nome }}</option>
            }
          </select>
        </app-campo>

        <app-campo id="desc" label="Descrição" [erro]="erros().descricao">
          <input
            id="desc"
            type="text"
            appInput
            [invalido]="!!erros().descricao"
            [ngModel]="novaDescricao()"
            (ngModelChange)="novaDescricao.set($event)"
          />
        </app-campo>

        <div class="grid gap-4 sm:grid-cols-2">
          <app-campo id="cond" label="Condição" [erro]="erros().condicao">
            <select
              id="cond"
              appSelect
              [ngModel]="novaCondicao()"
              (ngModelChange)="novaCondicao.set($event)"
            >
              <option value="OTIMA">Ótima</option>
              <option value="BOA">Boa</option>
              <option value="REGULAR">Regular</option>
              <option value="COM_AVARIA">Com avaria</option>
            </select>
          </app-campo>

          <app-campo id="sit" label="Situação inicial" [erro]="erros().situacao">
            <select
              id="sit"
              appSelect
              [ngModel]="novaSituacao()"
              (ngModelChange)="novaSituacao.set($event)"
            >
              <option value="DISPONIVEL">Disponível</option>
              <option value="DANIFICADO">Danificado</option>
              <option value="EM_MANUTENCAO">Em manutenção</option>
            </select>
          </app-campo>
        </div>

        <app-campo
          id="prazo"
          label="Prazo máximo de empréstimo (horas)"
          [erro]="erros().prazoMaxHoras"
          ajuda="De 1 a 720 horas (30 dias)."
        >
          <input
            id="prazo"
            type="number"
            min="1"
            max="720"
            appInput
            [invalido]="!!erros().prazoMaxHoras"
            [ngModel]="novoPrazoHoras()"
            (ngModelChange)="novoPrazoHoras.set($event)"
          />
        </app-campo>
      </div>

      <ng-container rodape>
        <button type="button" appBotao variant="fantasma" (click)="fecharModalNovo()">
          Cancelar
        </button>
        <button type="button" appBotao [disabled]="salvando()" (click)="salvarNovoEquipamento()">
          {{ salvando() ? 'Salvando…' : 'Salvar equipamento' }}
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
export class EquipamentosOperadorComponent {
  readonly state = inject(EquipTrackService);
  readonly situacoesFiltro: SituacaoEquipamento[] = [
    'DISPONIVEL',
    'EMPRESTADO',
    'DANIFICADO',
    'EM_MANUTENCAO',
  ];
  readonly formatarBadge = formatarValorBadge;

  readonly filtroCategoria = signal<string>('');
  readonly filtroSituacao = signal<string>('');
  readonly modalNovoAberto = signal<boolean>(false);
  readonly salvando = signal<boolean>(false);

  readonly novoPatrimonio = signal<string>('');
  readonly novaCategoriaId = signal<number | null>(null);
  readonly novaDescricao = signal<string>('');
  readonly novaCondicao = signal<CondicaoEquipamento>('OTIMA');
  readonly novaSituacao = signal<NovoEquipamentoApi['situacao']>('DISPONIVEL');
  readonly novoPrazoHoras = signal<number | null>(PRAZO_PADRAO_HORAS);
  readonly erros = signal<ErrosNovoEquipamento>({});

  readonly equipamentosFiltrados = computed(() => {
    const cat = this.filtroCategoria();
    const sit = this.filtroSituacao();
    return this.state
      .equipamentos()
      .filter((e) => (!cat || e.categoria === cat) && (!sit || e.situacao === sit));
  });

  alternarSituacao(sit: SituacaoEquipamento): void {
    this.filtroSituacao.set(this.filtroSituacao() === sit ? '' : sit);
  }

  abrirHistoricoSemPropagar(event: MouseEvent, patrimonio: string): void {
    event.stopPropagation();
    this.state.abrirHistorico(patrimonio);
  }

  abrirModalNovo(): void {
    this.erros.set({});
    this.modalNovoAberto.set(true);
  }

  fecharModalNovo(): void {
    if (this.salvando()) return;
    this.erros.set({});
    this.modalNovoAberto.set(false);
  }

  async salvarNovoEquipamento(): Promise<void> {
    if (this.salvando()) return;

    // Validação local para resposta imediata; o backend repete todas as regras.
    const novosErros: ErrosNovoEquipamento = {};
    const patrimonioNormalizado = this.novoPatrimonio().trim().toUpperCase();
    const existentes = this.state.equipamentos().map((e) => e.patrimonio);
    const categoriaId = this.novaCategoriaId();
    const prazo = Number(this.novoPrazoHoras());

    if (!patrimonioNormalizado) {
      novosErros.patrimonio = 'Informe o identificador patrimonial.';
    } else if (existentes.includes(patrimonioNormalizado)) {
      novosErros.patrimonio = 'Este patrimônio já está cadastrado.';
    }

    if (categoriaId === null) {
      novosErros.categoriaId = 'Selecione uma categoria.';
    }

    if (!this.novaDescricao().trim()) {
      novosErros.descricao = 'Descreva o equipamento.';
    }

    if (!Number.isInteger(prazo) || prazo < 1 || prazo > 720) {
      novosErros.prazoMaxHoras = 'Informe um prazo entre 1 e 720 horas.';
    }

    this.erros.set(novosErros);
    if (Object.keys(novosErros).length > 0 || categoriaId === null) return;

    this.salvando.set(true);
    try {
      await this.state.cadastrarEquipamento({
        patrimonio: patrimonioNormalizado,
        categoriaId,
        descricao: this.novaDescricao().trim(),
        condicao: this.novaCondicao(),
        situacao: this.novaSituacao(),
        prazoMaxHoras: prazo,
      });
      this.limparFormulario();
      this.modalNovoAberto.set(false);
    } catch (erro) {
      this.erros.set(errosDoCadastro(erro));
    } finally {
      this.salvando.set(false);
    }
  }

  private limparFormulario(): void {
    this.novoPatrimonio.set('');
    this.novaCategoriaId.set(null);
    this.novaDescricao.set('');
    this.novaCondicao.set('OTIMA');
    this.novaSituacao.set('DISPONIVEL');
    this.novoPrazoHoras.set(PRAZO_PADRAO_HORAS);
    this.erros.set({});
  }
}

