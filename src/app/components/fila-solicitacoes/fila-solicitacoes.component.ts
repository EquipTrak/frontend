import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ErroApi } from '../../models/api.models';
import {
  AbaFilaSolicitacoes,
  AbaSituacaoEquipamento,
  CondicaoEquipamento,
  FILA_ABAS_SITUACAO,
  FILA_ABAS_STATUS,
  Solicitacao,
} from '../../models/equiptrack.models';
import { EquipTrackService } from '../../services/equiptrack.service';
import { ToastService } from '../../services/toast.service';
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

/** Traduz a resposta de erro da aprovação ou da rejeição para a mensagem exibida. */
export function erroDaDecisao(erro: unknown, padrao: string): string {
  if (erro instanceof HttpErrorResponse) {
    const corpo = erro.error as Partial<ErroApi> | null;
    // 400 da rejeição: o motivo vem em campos.motivo.
    const doCampo = corpo?.campos?.['motivo'];
    if (erro.status === 400 && doCampo) return doCampo;
    // 409: deixou de estar pendente, período sobreposto (RN13), equipamento indisponível ou
    // solicitante bloqueado. 404 e 403 também trazem o motivo.
    if ((erro.status === 409 || erro.status === 404 || erro.status === 403) && corpo?.mensagem) {
      return corpo.mensagem;
    }
    if (erro.status === 0) {
      return 'Não foi possível falar com o servidor. Tente novamente.';
    }
  }
  return padrao;
}

/** Como `erroDaDecisao`, mas também lê os erros dos campos da devolução. */
export function erroDaDevolucao(erro: unknown, padrao: string): string {
  if (erro instanceof HttpErrorResponse && erro.status === 400) {
    const campos = (erro.error as Partial<ErroApi> | null)?.campos;
    const doCampo = campos?.['condicao'] ?? campos?.['observacao'];
    if (doCampo) return doCampo;
  }
  return erroDaDecisao(erro, padrao);
}

/** A lista mudou no servidor desde que foi carregada e precisa ser buscada de novo. */
function listaDesatualizada(erro: unknown): boolean {
  return erro instanceof HttpErrorResponse && (erro.status === 409 || erro.status === 404);
}

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

      @switch (estadoTela()) {
        @case ('carregando') {
          <app-estado-carregando />
        }
        @case ('erro') {
          <app-estado-erro (tentarNovamente)="tentarNovamente()" />
        }
        @default {
          @if (abaSituacaoAtiva()) {
            @if (equipamentosDaSituacao().length === 0) {
              <app-estado-vazio
                titulo="Nada por aqui"
                texto="Nenhum equipamento nesta situação."
              />
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
                            {{
                              s.descricaoEquipamento ??
                                state.buscarEquipamento(s.patrimonio)?.descricao
                            }}
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
                          [disabled]="aprovandoId() === s.id"
                          (click)="aprovar(s)"
                        >
                          {{ aprovandoId() === s.id ? 'Aprovando…' : 'Aprovar' }}
                        </button>
                        <button
                          type="button"
                          appBotao
                          tamanho="pequeno"
                          variant="secundario"
                          [disabled]="aprovandoId() === s.id"
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
      (fechar)="fecharModalRejeitar()"
    >
      <p class="mb-4 text-sm text-muted-foreground">
        {{ solicitacaoParaRejeitar()?.solicitante }} ·
        <span class="font-mono">{{ solicitacaoParaRejeitar()?.patrimonio }}</span>
      </p>
      <app-campo
        id="motivo"
        label="Motivo da rejeição"
        [erro]="erroMotivoRejeicao() || undefined"
      >
        <textarea
          id="motivo"
          rows="3"
          maxlength="255"
          [ngModel]="motivoRejeicao()"
          (ngModelChange)="motivoRejeicao.set($event)"
          [class]="
            'w-full rounded-md border bg-background p-3 text-sm focus:border-accent-text focus:outline-none ' +
            (erroMotivoRejeicao() ? 'border-danger' : 'border-border')
          "
        ></textarea>
      </app-campo>
      @if (erroRejeicao()) {
        <p class="mt-3 text-sm text-danger" role="alert">{{ erroRejeicao() }}</p>
      }

      <ng-container rodape>
        <button
          type="button"
          appBotao
          variant="fantasma"
          [disabled]="rejeitando()"
          (click)="fecharModalRejeitar()"
        >
          Cancelar
        </button>
        <button
          type="button"
          appBotao
          variant="perigo"
          [disabled]="rejeitando()"
          (click)="confirmarRejeicao()"
        >
          {{ rejeitando() ? 'Rejeitando…' : 'Rejeitar' }}
        </button>
      </ng-container>
    </app-modal>

    <!-- Modal: Registrar retirada -->
    <app-modal
      [aberto]="!!solicitacaoParaRetirada()"
      titulo="Registrar retirada"
      (fechar)="fecharModalRetirada()"
    >
      <app-alerta tom="info" titulo="Aprovar não é retirar">
        Confirme somente quando o equipamento for entregue em mãos. Ele passará a EMPRESTADO.
      </app-alerta>
      <p class="mt-4 text-sm">
        {{ solicitacaoParaRetirada()?.solicitante }} ·
        <span class="font-mono text-accent-text">{{ solicitacaoParaRetirada()?.patrimonio }}</span>
        · {{ solicitacaoParaRetirada()?.inicio }} → {{ solicitacaoParaRetirada()?.fim }}
      </p>
      @if (erroRetirada()) {
        <p class="mt-3 text-sm text-danger" role="alert">{{ erroRetirada() }}</p>
      }

      <ng-container rodape>
        <button
          type="button"
          appBotao
          variant="fantasma"
          [disabled]="retirando()"
          (click)="fecharModalRetirada()"
        >
          Cancelar
        </button>
        <button type="button" appBotao [disabled]="retirando()" (click)="confirmarRetirada()">
          {{ retirando() ? 'Registrando…' : 'Confirmar retirada' }}
        </button>
      </ng-container>
    </app-modal>

    <!-- Modal: Registrar devolução -->
    <app-modal
      [aberto]="!!solicitacaoParaDevolucao()"
      titulo="Registrar devolução"
      (fechar)="fecharModalDevolucao()"
    >
      <div class="space-y-4">
        <p class="text-sm">
          {{ solicitacaoParaDevolucao()?.solicitante }} ·
          <span class="font-mono text-accent-text">
            {{ solicitacaoParaDevolucao()?.patrimonio }}
          </span>
        </p>

        <app-campo id="cond-dev" label="Condição na devolução">
          <select
            id="cond-dev"
            appSelect
            [ngModel]="condicaoDevolucao()"
            (ngModelChange)="condicaoDevolucao.set($event)"
          >
            <option value="OTIMA">Ótima</option>
            <option value="BOA">Boa</option>
            <option value="REGULAR">Regular</option>
            <option value="COM_AVARIA">Com avaria</option>
          </select>
        </app-campo>

        @if (condicaoDevolucao() === 'COM_AVARIA') {
          <app-alerta
            tom="warning"
            titulo="O equipamento ficará DANIFICADO até avaliação."
            [temConteudo]="false"
          />
        }

        <app-campo id="obs" label="Observação">
          <textarea
            id="obs"
            rows="3"
            maxlength="500"
            [ngModel]="observacaoDevolucao()"
            (ngModelChange)="observacaoDevolucao.set($event)"
            class="w-full rounded-md border border-border bg-background p-3 text-sm focus:border-accent-text focus:outline-none"
          ></textarea>
        </app-campo>
      </div>

      @if (erroDevolucao()) {
        <p class="mt-3 text-sm text-danger" role="alert">{{ erroDevolucao() }}</p>
      }

      <ng-container rodape>
        <button
          type="button"
          appBotao
          variant="fantasma"
          [disabled]="devolvendo()"
          (click)="fecharModalDevolucao()"
        >
          Cancelar
        </button>
        <button type="button" appBotao [disabled]="devolvendo()" (click)="confirmarDevolucao()">
          {{ devolvendo() ? 'Registrando…' : 'Confirmar devolução' }}
        </button>
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
        <p>
          Este equipamento já está emprestado e não pode ser liberado. Aguarde a devolução.
        </p>
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
  private readonly toast = inject(ToastService);

  readonly abasStatus: AbaFilaSolicitacoes[] = ['Pendentes', 'Aprovadas', 'Em uso', 'Atrasados'];
  readonly abasSituacao: AbaSituacaoEquipamento[] = [
    'Disponíveis',
    'Emprestados',
    'Indisponíveis',
  ];

  readonly abaStatusAtiva = signal<AbaFilaSolicitacoes>('Pendentes');
  readonly abaSituacaoAtiva = signal<AbaSituacaoEquipamento | null>(null);

  readonly solicitacaoParaRejeitar = signal<Solicitacao | null>(null);
  readonly motivoRejeicao = signal<string>('');
  readonly erroMotivoRejeicao = signal<string>('');
  readonly erroRejeicao = signal<string>('');
  readonly rejeitando = signal<boolean>(false);
  readonly aprovandoId = signal<string | null>(null);

  /** As abas de solicitação seguem a lista de solicitações; as de situação, o catálogo. */
  readonly estadoTela = computed(() =>
    this.abaSituacaoAtiva() ? this.state.estado() : this.state.estadoSolicitacoes(),
  );

  readonly solicitacaoParaRetirada = signal<Solicitacao | null>(null);
  readonly retirando = signal<boolean>(false);
  readonly erroRetirada = signal<string>('');
  readonly patrimonioBloqueado = signal<string | null>(null);

  readonly solicitacaoParaDevolucao = signal<Solicitacao | null>(null);
  readonly condicaoDevolucao = signal<CondicaoEquipamento>('OTIMA');
  readonly observacaoDevolucao = signal<string>('');
  readonly devolvendo = signal<boolean>(false);
  readonly erroDevolucao = signal<string>('');

  readonly solicitacoesDaAba = computed(() => {
    const statuses = FILA_ABAS_STATUS[this.abaStatusAtiva()];
    return this.state.solicitacoes().filter((s) => statuses.includes(s.status));
  });

  readonly equipamentosDaSituacao = computed(() => {
    const abaSit = this.abaSituacaoAtiva();
    if (!abaSit) return [];
    const situacoes = FILA_ABAS_SITUACAO[abaSit];
    return this.state.equipamentos().filter((e) => situacoes.includes(e.situacao));
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
    const situacoes = FILA_ABAS_SITUACAO[aba];
    return this.state.equipamentos().filter((e) => situacoes.includes(e.situacao)).length;
  }

  tentarNovamente(): void {
    if (this.abaSituacaoAtiva()) {
      void this.state.carregarCatalogo();
    } else {
      void this.state.carregarSolicitacoes();
    }
  }

  async aprovar(solicitacao: Solicitacao): Promise<void> {
    if (this.aprovandoId()) return;
    this.aprovandoId.set(solicitacao.id);
    try {
      await this.state.aprovarSolicitacao(solicitacao);
    } catch (erro) {
      this.toast.error(erroDaDecisao(erro, 'Não foi possível aprovar a solicitação. Tente novamente.'), 6000);
      if (listaDesatualizada(erro)) void this.state.carregarSolicitacoes();
    } finally {
      this.aprovandoId.set(null);
    }
  }

  abrirModalRejeitar(solicitacao: Solicitacao): void {
    this.solicitacaoParaRejeitar.set(solicitacao);
    this.motivoRejeicao.set('');
    this.erroMotivoRejeicao.set('');
    this.erroRejeicao.set('');
  }

  fecharModalRejeitar(): void {
    if (this.rejeitando()) return;
    this.solicitacaoParaRejeitar.set(null);
  }

  async confirmarRejeicao(): Promise<void> {
    const s = this.solicitacaoParaRejeitar();
    if (!s || this.rejeitando()) return;
    const motivo = this.motivoRejeicao().trim();
    this.erroRejeicao.set('');
    if (!motivo) {
      this.erroMotivoRejeicao.set('O motivo é obrigatório.');
      return;
    }
    this.erroMotivoRejeicao.set('');

    this.rejeitando.set(true);
    try {
      await this.state.rejeitarSolicitacao(s, motivo);
      this.solicitacaoParaRejeitar.set(null);
    } catch (erro) {
      const mensagem = erroDaDecisao(erro, 'Não foi possível rejeitar a solicitação. Tente novamente.');
      if (erro instanceof HttpErrorResponse && erro.status === 400) {
        this.erroMotivoRejeicao.set(mensagem);
      } else {
        this.erroRejeicao.set(mensagem);
      }
      if (listaDesatualizada(erro)) void this.state.carregarSolicitacoes();
    } finally {
      this.rejeitando.set(false);
    }
  }

  iniciarRegistroRetirada(solicitacao: Solicitacao): void {
    const equip = this.state.buscarEquipamento(solicitacao.patrimonio);
    if (equip?.situacao === 'EMPRESTADO') {
      this.patrimonioBloqueado.set(solicitacao.patrimonio);
    } else {
      this.erroRetirada.set('');
      this.solicitacaoParaRetirada.set(solicitacao);
    }
  }

  fecharModalRetirada(): void {
    if (this.retirando()) return;
    this.solicitacaoParaRetirada.set(null);
  }

  async confirmarRetirada(): Promise<void> {
    const s = this.solicitacaoParaRetirada();
    if (!s || this.retirando()) return;
    this.retirando.set(true);
    this.erroRetirada.set('');
    try {
      await this.state.registrarRetirada(s);
      this.solicitacaoParaRetirada.set(null);
    } catch (erro) {
      this.erroRetirada.set(
        erroDaDecisao(erro, 'Não foi possível registrar a retirada. Tente novamente.'),
      );
      // A solicitação ou o equipamento mudaram no servidor: mostra o estado atual.
      if (listaDesatualizada(erro)) {
        void this.state.carregarSolicitacoes();
        void this.state.carregarCatalogo();
      }
    } finally {
      this.retirando.set(false);
    }
  }

  abrirModalDevolucao(solicitacao: Solicitacao): void {
    this.solicitacaoParaDevolucao.set(solicitacao);
    this.condicaoDevolucao.set('OTIMA');
    this.observacaoDevolucao.set('');
    this.erroDevolucao.set('');
  }

  fecharModalDevolucao(): void {
    if (this.devolvendo()) return;
    this.solicitacaoParaDevolucao.set(null);
  }

  async confirmarDevolucao(): Promise<void> {
    const s = this.solicitacaoParaDevolucao();
    if (!s || this.devolvendo()) return;
    this.devolvendo.set(true);
    this.erroDevolucao.set('');
    try {
      await this.state.registrarDevolucao(s, this.condicaoDevolucao(), this.observacaoDevolucao());
      this.solicitacaoParaDevolucao.set(null);
    } catch (erro) {
      this.erroDevolucao.set(
        erroDaDevolucao(erro, 'Não foi possível registrar a devolução. Tente novamente.'),
      );
      if (listaDesatualizada(erro)) {
        void this.state.carregarSolicitacoes();
        void this.state.carregarCatalogo();
      }
    } finally {
      this.devolvendo.set(false);
    }
  }

  verHistoricoBloqueado(): void {
    const pat = this.patrimonioBloqueado();
    this.patrimonioBloqueado.set(null);
    if (pat) {
      this.state.abrirHistorico(pat);
    }
  }
}

