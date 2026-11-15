import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ErroApi } from '../../models/api.models';
import { Solicitacao } from '../../models/equiptrack.models';
import { EquipTrackService } from '../../services/equiptrack.service';
import { BotaoDirective } from '../ui/botao.component';
import {
  AlertaComponent,
  EstadoCarregandoComponent,
  EstadoErroComponent,
  EstadoVazioComponent,
} from '../ui/estados-visuais.component';
import { ModalComponent } from '../ui/modal.component';
import { PainelCardComponent } from '../ui/painel-card.component';
import { SeloComponent } from '../ui/selo.component';

/** Traduz a resposta de erro do cancelamento para a mensagem exibida no modal. */
export function erroDoCancelamento(erro: unknown): string {
  if (erro instanceof HttpErrorResponse) {
    const corpo = erro.error as Partial<ErroApi> | null;
    // 409: deixou de estar pendente (foi aprovada ou rejeitada enquanto a tela estava aberta).
    if ((erro.status === 409 || erro.status === 404 || erro.status === 403) && corpo?.mensagem) {
      return corpo.mensagem;
    }
    if (erro.status === 0) {
      return 'Não foi possível falar com o servidor. Tente novamente.';
    }
  }
  return 'Não foi possível cancelar a solicitação. Tente novamente.';
}

@Component({
  selector: 'app-minhas-solicitacoes',
  standalone: true,
  imports: [
    PainelCardComponent,
    AlertaComponent,
    EstadoCarregandoComponent,
    EstadoErroComponent,
    EstadoVazioComponent,
    SeloComponent,
    BotaoDirective,
    ModalComponent,
  ],
  template: `
    <app-painel-card titulo="Minhas solicitações" [contagem]="minhasSolicitacoes().length">
      @if (possuiAtraso() && state.estadoSolicitacoes() === 'normal') {
        <div class="p-4 pb-0">
          <app-alerta titulo="Novas solicitações bloqueadas">
            Você tem um empréstimo em atraso. Devolva o equipamento ao operador para liberar novos
            pedidos.
          </app-alerta>
        </div>
      }

      @switch (state.estadoSolicitacoes()) {
        @case ('carregando') {
          <app-estado-carregando />
        }
        @case ('erro') {
          <app-estado-erro (tentarNovamente)="state.carregarMinhasSolicitacoes()" />
        }
        @default {
          @if (minhasSolicitacoes().length === 0) {
            <app-estado-vazio
              titulo="Nenhuma solicitação ainda"
              texto="Escolha um equipamento disponível e faça seu primeiro pedido."
            />
          } @else {
            <ul>
              @for (s of minhasSolicitacoes(); track s.id) {
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

                  @if (s.motivo) {
                    <div class="mt-2.5 flex flex-wrap gap-2">
                      <p class="w-full rounded-sm border tone-danger px-2 py-1.5 text-xs">
                        <strong>Motivo:</strong> {{ s.motivo }}
                      </p>
                    </div>
                  }

                  @if (s.status === 'PENDENTE' && s.numero) {
                    <div class="mt-2.5 flex justify-end">
                      <button
                        type="button"
                        appBotao
                        variant="secundario"
                        tamanho="pequeno"
                        (click)="abrirCancelamento(s)"
                      >
                        Cancelar solicitação
                      </button>
                    </div>
                  }
                </li>
              }
            </ul>
          }
        }
      }
    </app-painel-card>

    <app-modal
      [aberto]="!!solicitacaoParaCancelar()"
      titulo="Cancelar solicitação"
      (fechar)="fecharCancelamento()"
    >
      <p class="text-sm">
        <span class="font-mono text-accent-text">{{ solicitacaoParaCancelar()?.patrimonio }}</span>
        · {{ solicitacaoParaCancelar()?.inicio }} → {{ solicitacaoParaCancelar()?.fim }}
      </p>
      <p class="mt-3 text-sm text-muted-foreground">
        O pedido deixa de aguardar aprovação. Para usar o equipamento, será preciso solicitar de
        novo.
      </p>
      @if (erroCancelamento()) {
        <p class="mt-3 text-sm text-danger" role="alert">{{ erroCancelamento() }}</p>
      }

      <ng-container rodape>
        <button
          type="button"
          appBotao
          variant="fantasma"
          [disabled]="cancelando()"
          (click)="fecharCancelamento()"
        >
          Manter solicitação
        </button>
        <button
          type="button"
          appBotao
          variant="perigo"
          [disabled]="cancelando()"
          (click)="confirmarCancelamento()"
        >
          {{ cancelando() ? 'Cancelando…' : 'Cancelar solicitação' }}
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
export class MinhasSolicitacoesComponent {
  readonly state = inject(EquipTrackService);

  readonly solicitacaoParaCancelar = signal<Solicitacao | null>(null);
  readonly cancelando = signal<boolean>(false);
  readonly erroCancelamento = signal<string>('');

  // A API já devolve só as solicitações do usuário logado.
  readonly minhasSolicitacoes = computed(() => this.state.solicitacoes());

  readonly possuiAtraso = computed(() =>
    this.minhasSolicitacoes().some((s) => s.status === 'ATRASADO'),
  );

  abrirCancelamento(solicitacao: Solicitacao): void {
    this.erroCancelamento.set('');
    this.solicitacaoParaCancelar.set(solicitacao);
  }

  fecharCancelamento(): void {
    if (this.cancelando()) return;
    this.solicitacaoParaCancelar.set(null);
  }

  async confirmarCancelamento(): Promise<void> {
    const solicitacao = this.solicitacaoParaCancelar();
    if (!solicitacao || this.cancelando()) return;

    this.cancelando.set(true);
    this.erroCancelamento.set('');
    try {
      await this.state.cancelarSolicitacao(solicitacao);
      this.solicitacaoParaCancelar.set(null);
    } catch (erro) {
      this.erroCancelamento.set(erroDoCancelamento(erro));
      // Se a solicitação mudou no servidor, a lista mostra o status atual.
      if (erro instanceof HttpErrorResponse && (erro.status === 409 || erro.status === 404)) {
        void this.state.carregarMinhasSolicitacoes();
      }
    } finally {
      this.cancelando.set(false);
    }
  }
}

