import { Component, computed, inject } from '@angular/core';
import { EquipTrackService } from '../../services/equiptrack.service';
import {
  AlertaComponent,
  EstadoCarregandoComponent,
  EstadoErroComponent,
  EstadoVazioComponent,
} from '../ui/estados-visuais.component';
import { PainelCardComponent } from '../ui/painel-card.component';
import { SeloComponent } from '../ui/selo.component';

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
  ],
  template: `
    <app-painel-card titulo="Minhas solicitações" [contagem]="minhasSolicitacoes().length">
      @if (possuiAtraso() && state.estado() === 'normal') {
        <div class="p-4 pb-0">
          <app-alerta titulo="Novas solicitações bloqueadas">
            Você tem um empréstimo em atraso. Devolva o equipamento ao operador para liberar novos
            pedidos.
          </app-alerta>
        </div>
      }

      @switch (state.estado()) {
        @case ('carregando') {
          <app-estado-carregando />
        }
        @case ('erro') {
          <app-estado-erro (tentarNovamente)="state.definirEstado('normal')" />
        }
        @case ('vazio') {
          <app-estado-vazio
            titulo="Nenhuma solicitação ainda"
            texto="Escolha um equipamento disponível e faça seu primeiro pedido."
          />
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
                          {{ state.buscarEquipamento(s.patrimonio)?.descricao }}
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
                </li>
              }
            </ul>
          }
        }
      }
    </app-painel-card>
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

  readonly minhasSolicitacoes = computed(() => {
    const eu = this.state.nomeUsuarioAtual();
    return this.state.solicitacoes().filter((s) => s.solicitante === eu);
  });

  readonly possuiAtraso = computed(() =>
    this.minhasSolicitacoes().some((s) => s.status === 'ATRASADO'),
  );
}

