import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CATEGORIAS,
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
  categoria?: string;
  descricao?: string;
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
        @for (cat of categorias; track cat) {
          <app-chip-filtro
            [ativo]="filtroCategoria() === cat"
            (selecionar)="filtroCategoria.set(cat)"
          >
            {{ cat }}
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
          <app-estado-erro (tentarNovamente)="state.definirEstado('normal')" />
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

        <app-campo id="cat" label="Categoria" [erro]="erros().categoria">
          <select
            id="cat"
            appSelect
            [ngModel]="novaCategoria()"
            (ngModelChange)="novaCategoria.set($event)"
          >
            <option value="">Selecione…</option>
            @for (cat of categorias; track cat) {
              <option [value]="cat">{{ cat }}</option>
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
          <app-campo id="cond" label="Condição">
            <select
              id="cond"
              appSelect
              [ngModel]="novaCondicao()"
              (ngModelChange)="novaCondicao.set($event)"
            >
              <option value="OTIMA">Ótima</option>
              <option value="BOA">Boa</option>
              <option value="COM_AVARIA">Com avaria</option>
            </select>
          </app-campo>

          <app-campo id="sit" label="Situação inicial">
            <select
              id="sit"
              appSelect
              [ngModel]="novaSituacao()"
              (ngModelChange)="novaSituacao.set($event)"
            >
              <option value="DISPONIVEL">Disponível</option>
              <option value="INDISPONIVEL">Indisponível</option>
            </select>
          </app-campo>
        </div>
      </div>

      <ng-container rodape>
        <button type="button" appBotao variant="fantasma" (click)="fecharModalNovo()">
          Cancelar
        </button>
        <button type="button" appBotao (click)="salvarNovoEquipamento()">
          Salvar equipamento
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
  readonly categorias = CATEGORIAS;
  readonly situacoesFiltro: SituacaoEquipamento[] = ['DISPONIVEL', 'EMPRESTADO', 'INDISPONIVEL'];
  readonly formatarBadge = formatarValorBadge;

  readonly filtroCategoria = signal<string>('');
  readonly filtroSituacao = signal<string>('');
  readonly modalNovoAberto = signal<boolean>(false);

  readonly novoPatrimonio = signal<string>('');
  readonly novaCategoria = signal<string>('');
  readonly novaDescricao = signal<string>('');
  readonly novaCondicao = signal<CondicaoEquipamento>('OTIMA');
  readonly novaSituacao = signal<SituacaoEquipamento>('DISPONIVEL');
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
    this.erros.set({});
    this.modalNovoAberto.set(false);
  }

  salvarNovoEquipamento(): void {
    const novosErros: ErrosNovoEquipamento = {};
    const patrimonioNormalizado = this.novoPatrimonio().trim().toUpperCase();
    const existentes = this.state.equipamentos().map((e) => e.patrimonio);

    if (!patrimonioNormalizado) {
      novosErros.patrimonio = 'Informe o identificador patrimonial.';
    } else if (existentes.includes(patrimonioNormalizado)) {
      novosErros.patrimonio = 'Este patrimônio já está cadastrado.';
    }

    if (!this.novaCategoria()) {
      novosErros.categoria = 'Selecione uma categoria.';
    }

    if (!this.novaDescricao().trim()) {
      novosErros.descricao = 'Descreva o equipamento.';
    }

    this.erros.set(novosErros);

    if (Object.keys(novosErros).length === 0) {
      this.state.cadastrarEquipamento({
        patrimonio: patrimonioNormalizado,
        categoria: this.novaCategoria(),
        descricao: this.novaDescricao().trim(),
        condicao: this.novaCondicao(),
        situacao: this.novaSituacao(),
      });
      this.novoPatrimonio.set('');
      this.novaCategoria.set('');
      this.novaDescricao.set('');
      this.novaCondicao.set('OTIMA');
      this.novaSituacao.set('DISPONIVEL');
      this.modalNovoAberto.set(false);
    }
  }
}

