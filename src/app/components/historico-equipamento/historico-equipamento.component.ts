import { Component, input } from '@angular/core';
import { Equipamento, EventoHistorico } from '../../models/equiptrack.models';
import { EstadoVazioComponent } from '../ui/estados-visuais.component';
import { MascoteComponent } from '../ui/mascote-logo.component';
import { SeloComponent } from '../ui/selo.component';

@Component({
  selector: 'app-historico-equipamento',
  standalone: true,
  imports: [SeloComponent, EstadoVazioComponent, MascoteComponent],
  template: `
    <div>
      <div class="grain border-b border-border bg-topbar p-5">
        <p class="font-mono text-3xl text-accent-text">{{ equipamento().patrimonio }}</p>
        <h3 class="mt-1 text-lg font-semibold">{{ equipamento().descricao }}</h3>
        <p class="text-sm text-muted-foreground">{{ equipamento().categoria }}</p>
        <div class="mt-3 flex gap-2">
          <app-selo [valor]="equipamento().situacao" />
          <app-selo [valor]="equipamento().condicao" />
        </div>
      </div>

      @if (eventos().length === 0) {
        <app-estado-vazio
          titulo="Sem histórico"
          texto="Este equipamento ainda não tem movimentações registradas."
        />
      } @else {
        <ol class="relative m-5 border-l-2 border-accent pl-6">
          @for (ev of eventos(); track $index) {
            <li class="relative pb-6 last:pb-0">
              <span
                class="absolute -left-[33px] -ml-[-2px] top-1 size-4 rounded-full border-4 border-surface bg-accent"
              ></span>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="font-semibold">{{ ev.tipo }}</p>
                <app-selo [valor]="ev.badge" />
              </div>
              <p class="text-xs text-muted-foreground">{{ ev.data }} · {{ ev.usuario }}</p>
              <p class="mt-1 text-sm text-foreground/80">{{ ev.observacao }}</p>
            </li>
          }
        </ol>
      }

      <div class="flex justify-center pb-8">
        <app-mascote [size]="32" svgClass="opacity-40" />
      </div>
    </div>
  `,
})
export class HistoricoEquipamentoComponent {
  readonly equipamento = input.required<Equipamento>();
  readonly eventos = input.required<EventoHistorico[]>();
}
