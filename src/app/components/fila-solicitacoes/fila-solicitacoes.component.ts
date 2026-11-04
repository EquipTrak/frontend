import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AbaFilaSolicitacoes,
  AbaSituacaoEquipamento,
  CondicaoEquipamento,
  FILA_ABAS_SITUACAO,
  FILA_ABAS_STATUS,
  Solicitacao,
} from '../../models/equiptrack.models';
import { EquipTrackService } from '../../services/equiptrack.service';
import { BotaoDirective } from '../ui/botao.component';
import { CampoComponent, SelectDirective } from '../ui/campo.component';
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

@Component({
  selector: 'app-fila-solicitacoes',
  standalone: true,
  imports: [
    FormsModule,
    PainelCardComponent,
    BotaoDirective,
    CampoComponent,
    SelectDirective,
    SeloComponent,
    IconComponent,
    EstadoCarregandoComponent,
    EstadoErroComponent,
    EstadoVazioComponent,
    AlertaComponent,
    ModalComponent,
  ],
  template: `
    <app-painel-card titulo="Fila de solicitações">
      <div class="flex overflow-x-auto border-b border-border px-2" role="tablist">
        @for (aba of abasStatus; track aba) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="!abaSituacaoAtiva() && abaStatusAtiva() === aba"
            (click)="selecionarAbaStatus(aba)"
            [class]="
              'relative min-h-11 whitespace-nowrap px-3 text-xs font-semibold uppercase tracking-wider ' +
              (!abaSituacaoAtiva() && abaStatusAtiva() === aba
                ? 'text-accent-text'
                : 'text-muted-foreground hover:text-foreground')
            "
          >
            {{ aba }}
            <span
              [class]="
                'ml-1 rounded-sm px-1.5 py-0.5 text-[10px] ' +
                (aba === 'Atrasados' && contarPorAbaStatus(aba) > 0
                  ? 'bg-danger text-on-accent'
                  : 'bg-surface-2')
              "
            >
              {{ contarPorAbaStatus(aba) }}
            </span>
            @if (!abaSituacaoAtiva() && abaStatusAtiva() === aba) {
              <span class="absolute inset-x-2 bottom-0 h-0.5 bg-accent-text"></span>
            }
          </button>
        }

        @for (abaSit of abasSituacao; track abaSit) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="abaSituacaoAtiva() === abaSit"
            (click)="abaSituacaoAtiva.set(abaSit)"
            [class]="
              'relative min-h-11 whitespace-nowrap px-3 text-xs font-semibold uppercase tracking-wider ' +
              (abaSituacaoAtiva() === abaSit
                ? 'text-accent-text'
                : 'text-muted-foreground hover:text-foreground')
            "
          >
            {{ abaSit }}
            <span class="ml-1 rounded-sm bg-surface-2 px-1.5 py-0.5 text-[10px]">
              {{ contarPorAbaSituacao(abaSit) }}
            </span>
            @if (abaSituacaoAtiva() === abaSit) {
              <span class="absolute inset-x-2 bottom-0 h-0.5 bg-accent-text"></span>
            }
          </button>
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
            titulo="Fila vazia"
            texto="Nenhuma solicitação nesta etapa por enquanto."
          />
        }
        @default {
          @if (abaSituacaoAtiva()) {
            @if (equipamentosDaSituacao().length === 0) {
              <app-estado-vazio titulo="Nada por aqui" texto="Nenhum equipamento nesta situação." />
            } @else {
              <ul>
                @for (e of equipamentosDaSituacao(); track e.patrimonio) {
                  <li
                    class="flex items-center justify-between gap-3 border-t border-border px-4 py-3 first:border-t-0"
                  >
                    <div>
                      <p>
                        <span class="font-mono text-accent-text">{{ e.patrimonio }}</span>
                        {{ ' ' }}
                        <span class="text-sm">{{ e.descricao }}</span>
                      </p>
                      <p class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        {{ e.categoria }}
                        <app-selo [valor]="e.condicao" />
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <app-selo [valor]="e.situacao" />
                      <button
                        type="button"
                        appBotao
                        tamanho="pequeno"
                        variant="secundario"
                        (click)="state.abrirHistorico(e.patrimonio)"
                      >
                        <app-icon name="history" svgClass="size-3.5" />
                        Histórico
                      </button>
                    </div>
                  </li>
                }
              </ul>
            }
          } @else {
            @if (solicitacoesDaAba().length === 0) {
              <app-estado-vazio
                titulo="Fila vazia"
                texto="Nenhuma solicitação nesta etapa por enquanto."
              />
            } @else {
              <ul>
                @for (s of solicitacoesDaAba(); track s.id) {
                  <li
                    [class]="
                      'border-b border-border px-4 py-3 ' +
                      (s.status === 'ATRASADO' ? 'border-l-2 border-l-danger bg-danger/5' : '')
                    "
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="font-medium">{{ s.solicitante }}</p>
                        <p class="text-sm">
                          <span class="font-mono text-accent-text">{{ s.patrimonio }}</span>
                          {{ ' ' }}
                          <span class="text-muted-foreground">
                            {{ state.buscarEquipamento(s.patrimonio)?.descricao }}
                          </span>
                        </p>
                        <p class="mt-0.5 text-xs text-muted-foreground">
                          {{ s.inicio }} → {{ s.fim }}
                        </p>
                      </div>
                      <app-selo [valor]="s.status" [destaque]="s.status === 'ATRASADO'" />
                    </div>

                    <div class="mt-2.5 flex flex-wrap gap-2">
                      @if (s.status === 'PENDENTE') {
                        <button
                          type="button"
                          appBotao
                          tamanho="pequeno"
                          (click)="state.aprovarSolicitacao(s)"
                        >
                          Aprovar
                        </button>
                        <button
                          type="button"
                          appBotao
                          tamanho="pequeno"
                          variant="secundario"
                          (click)="abrirModalRejeitar(s)"
                        >
                          Rejeitar
                        </button>
                      }
                      @if (s.status === 'APROVADA') {
                        <button
                          type="button"
                          appBotao
                          tamanho="pequeno"
                          (click)="iniciarRegistroRetirada(s)"
                        >
                          Registrar retirada
                        </button>
                      }
                      @if (s.status === 'RETIRADO' || s.status === 'ATRASADO') {
                        <button
                          type="button"
                          appBotao
                          tamanho="pequeno"
                          (click)="abrirModalDevolucao(s)"
                        >
                          Registrar devolução
                        </button>
                      }
                    </div>
                  </li>
                }
              </ul>
            }
          }
        }
      }
    </app-painel-card>

    <!-- Modal: Rejeitar solicitação -->
    <app-modal
      [aberto]="!!solicitacaoParaRejeitar()"
      titulo="Rejeitar solicitação"
      (fechar)="solicitacaoParaRejeitar.set(null)"
    >
      <p class="mb-4 text-sm text-muted-foreground">
        {{ solicitacaoParaRejeitar()?.solicitante }} ·
        <span class="font-mono">{{ solicitacaoParaRejeitar()?.patrimonio }}</span>
      </p>
      <app-campo
        [id]="'motivo'"
        label="Motivo da rejeição"
        [erro]="erroMotivoRejeicao() ? 'O motivo é obrigatório.' : undefined"
      >
        <textarea
          id="motivo"
          rows="3"
          [ngModel]="motivoRejeicao()"
          (ngModelChange)="motivoRejeicao.set($event)"
          [class]="
            'w-full rounded-md border bg-background p-3 text-sm focus:border-accent-text focus:outline-none ' +
            (erroMotivoRejeicao() ? 'border-danger' : 'border-border')
          "
        ></textarea>
      </app-campo>

      <ng-container rodape>
        <button
          type="button"
          appBotao
          variant="fantasma"
          (click)="solicitacaoParaRejeitar.set(null)"
        >
          Cancelar
        </button>
        <button type="button" appBotao variant="perigo" (click)="confirmarRejeicao()">
          Rejeitar
        </button>
      </ng-container>
    </app-modal>

    <!-- Modal: Registrar retirada -->
    <app-modal
      [aberto]="!!solicitacaoParaRetirada()"
      titulo="Registrar retirada"
      (fechar)="solicitacaoParaRetirada.set(null)"
    >
      <app-alerta tom="info" titulo="Aprovar não é retirar">
        Confirme somente quando o equipamento for entregue em mãos. Ele passará a EMPRESTADO.
      </app-alerta>
      <p class="mt-4 text-sm">
        {{ solicitacaoParaRetirada()?.solicitante }} ·
        <span class="font-mono text-accent-text">{{ solicitacaoParaRetirada()?.patrimonio }}</span>
        · {{ solicitacaoParaRetirada()?.inicio }} → {{ solicitacaoParaRetirada()?.fim }}
      </p>

      <ng-container rodape>
        <button
          type="button"
          appBotao
          variant="fantasma"
          (click)="solicitacaoParaRetirada.set(null)"
        >
          Cancelar
        </button>
        <button type="button" appBotao (click)="confirmarRetirada()">Confirmar retirada</button>
      </ng-container>
    </app-modal>

    <!-- Modal: Registrar devolução -->
    <app-modal
      [aberto]="!!solicitacaoParaDevolucao()"
      titulo="Registrar devolução"
      (fechar)="solicitacaoParaDevolucao.set(null)"
    >
      <div class="space-y-4">
        <p class="text-sm">
          {{ solicitacaoParaDevolucao()?.solicitante }} ·
          <span class="font-mono text-accent-text">
            {{ solicitacaoParaDevolucao()?.patrimonio }}
          </span>
        </p>

        <app-campo [id]="'cond-dev'" label="Condição na devolução">
          <select
            id="cond-dev"
            appSelect
            [ngModel]="condicaoDevolucao()"
            (ngModelChange)="condicaoDevolucao.set($event)"
          >
            <option value="OTIMA">Ótima</option>
            <option value="BOA">Boa</option>
            <option value="COM_AVARIA">Com avaria</option>
          </select>
        </app-campo>

        @if (condicaoDevolucao() === 'COM_AVARIA') {
          <app-alerta
            tom="warning"
            titulo="O equipamento ficará INDISPONÍVEL até avaliação."
            [temConteudo]="false"
          />
        }

        <app-campo [id]="'obs'" label="Observação">
          <textarea
            id="obs"
            rows="3"
            [ngModel]="observacaoDevolucao()"
            (ngModelChange)="observacaoDevolucao.set($event)"
            class="w-full rounded-md border border-border bg-background p-3 text-sm focus:border-accent-text focus:outline-none"
          ></textarea>
        </app-campo>
      </div>

      <ng-container rodape>
        <button
          type="button"
          appBotao
          variant="fantasma"
          (click)="solicitacaoParaDevolucao.set(null)"
        >
          Cancelar
        </button>
        <button type="button" appBotao (click)="confirmarDevolucao()">Confirmar devolução</button>
      </ng-container>
    </app-modal>

    <!-- Modal: Retirada bloqueada -->
    <app-modal
      [aberto]="!!patrimonioBloqueado()"
      [perigo]="true"
      titulo="Retirada bloqueada"
      (fechar)="patrimonioBloqueado.set(null)"
    >
      <div class="flex gap-3">
        <app-icon name="triangle-alert" svgClass="size-6 shrink-0 text-danger" />
        <p>Este equipamento já está emprestado e não pode ser liberado. Aguarde a devolução.</p>
      </div>
      <p class="mt-3 font-mono text-sm text-accent-text">{{ patrimonioBloqueado() }}</p>

      <ng-container rodape>
        <button type="button" appBotao variant="fantasma" (click)="patrimonioBloqueado.set(null)">
          Fechar
        </button>
        <button type="button" appBotao variant="secundario" (click)="verHistoricoBloqueado()">
          <app-icon name="history" svgClass="size-4" />
          Ver histórico
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
export class FilaSolicitacoesComponent {
  readonly state = inject(EquipTrackService);

  readonly abasStatus: AbaFilaSolicitacoes[] = ['Pendentes', 'Aprovadas', 'Em uso', 'Atrasados'];
  readonly abasSituacao: AbaSituacaoEquipamento[] = ['Disponíveis', 'Emprestados', 'Indisponíveis'];

  readonly abaStatusAtiva = signal<AbaFilaSolicitacoes>('Pendentes');
  readonly abaSituacaoAtiva = signal<AbaSituacaoEquipamento | null>(null);

  readonly solicitacaoParaRejeitar = signal<Solicitacao | null>(null);
  readonly motivoRejeicao = signal<string>('');
  readonly erroMotivoRejeicao = signal<boolean>(false);

  readonly solicitacaoParaRetirada = signal<Solicitacao | null>(null);
  readonly patrimonioBloqueado = signal<string | null>(null);

  readonly solicitacaoParaDevolucao = signal<Solicitacao | null>(null);
  readonly condicaoDevolucao = signal<CondicaoEquipamento>('OTIMA');
  readonly observacaoDevolucao = signal<string>('');

  readonly solicitacoesDaAba = computed(() => {
    const statuses = FILA_ABAS_STATUS[this.abaStatusAtiva()];
    return this.state.solicitacoes().filter((s) => statuses.includes(s.status));
  });

  readonly equipamentosDaSituacao = computed(() => {
    const abaSit = this.abaSituacaoAtiva();
    if (!abaSit) return [];
    const sit = FILA_ABAS_SITUACAO[abaSit];
    return this.state.equipamentos().filter((e) => e.situacao === sit);
  });

  selecionarAbaStatus(aba: AbaFilaSolicitacoes): void {
    this.abaStatusAtiva.set(aba);
    this.abaSituacaoAtiva.set(null);
  }

  contarPorAbaStatus(aba: AbaFilaSolicitacoes): number {
    const statuses = FILA_ABAS_STATUS[aba];
    return this.state.solicitacoes().filter((s) => statuses.includes(s.status)).length;
  }

  contarPorAbaSituacao(aba: AbaSituacaoEquipamento): number {
    const sit = FILA_ABAS_SITUACAO[aba];
    return this.state.equipamentos().filter((e) => e.situacao === sit).length;
  }

  abrirModalRejeitar(solicitacao: Solicitacao): void {
    this.solicitacaoParaRejeitar.set(solicitacao);
    this.motivoRejeicao.set('');
    this.erroMotivoRejeicao.set(false);
  }

  confirmarRejeicao(): void {
    const s = this.solicitacaoParaRejeitar();
    if (!s) return;
    if (!this.motivoRejeicao().trim()) {
      this.erroMotivoRejeicao.set(true);
      return;
    }
    this.state.rejeitarSolicitacao(s, this.motivoRejeicao().trim());
    this.solicitacaoParaRejeitar.set(null);
  }

  iniciarRegistroRetirada(solicitacao: Solicitacao): void {
    const equip = this.state.buscarEquipamento(solicitacao.patrimonio);
    if (equip?.situacao === 'EMPRESTADO') {
      this.patrimonioBloqueado.set(solicitacao.patrimonio);
    } else {
      this.solicitacaoParaRetirada.set(solicitacao);
    }
  }

  confirmarRetirada(): void {
    const s = this.solicitacaoParaRetirada();
    if (!s) return;
    this.state.registrarRetirada(s);
    this.solicitacaoParaRetirada.set(null);
  }

  abrirModalDevolucao(solicitacao: Solicitacao): void {
    this.solicitacaoParaDevolucao.set(solicitacao);
    this.condicaoDevolucao.set('OTIMA');
    this.observacaoDevolucao.set('');
  }

  confirmarDevolucao(): void {
    const s = this.solicitacaoParaDevolucao();
    if (!s) return;
    this.state.registrarDevolucao(s, this.condicaoDevolucao(), this.observacaoDevolucao());
    this.solicitacaoParaDevolucao.set(null);
  }

  verHistoricoBloqueado(): void {
    const pat = this.patrimonioBloqueado();
    this.patrimonioBloqueado.set(null);
    if (pat) {
      this.state.abrirHistorico(pat);
    }
  }
}
