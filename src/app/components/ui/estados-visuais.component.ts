import { Component, computed, input, output } from '@angular/core';
import { TomSemantica } from '../../models/equiptrack.models';
import { BotaoDirective } from './botao.component';
import { IconComponent } from './icon.component';
import { MascoteComponent } from './mascote-logo.component';

const CLASSES_ALERTA: Record<TomSemantica, string> = {
  success: 'tone-success',
  info: 'tone-info',
  warning: 'tone-warning',
  danger: 'tone-danger',
  neutral: 'tone-neutral',
};

@Component({
  selector: 'app-estado-carregando',
  standalone: true,
  template: `
    <div class="space-y-2 p-4" aria-busy="true" aria-label="Carregando">
      @for (item of itens(); track $index) {
        <div class="flex h-12 items-center gap-4 rounded-sm bg-surface-2/60 px-3 animate-pulse">
          <div class="h-3 w-16 rounded-sm bg-border"></div>
          <div class="h-3 flex-1 rounded-sm bg-border"></div>
          <div class="h-4 w-20 rounded-sm bg-border"></div>
        </div>
      }
    </div>
  `,
})
export class EstadoCarregandoComponent {
  readonly linhas = input<number>(6);
  readonly itens = computed(() => Array.from({ length: this.linhas() }));
}

@Component({
  selector: 'app-estado-vazio',
  standalone: true,
  imports: [MascoteComponent],
  template: `
    <div class="flex flex-col items-center px-6 py-12 text-center">
      <app-mascote [size]="88" [perdido]="true" />
      <h3 class="mt-4 font-display text-2xl">{{ titulo() }}</h3>
      <p class="mt-1 max-w-xs text-sm text-muted-foreground">{{ texto() }}</p>
      @if (temAcao()) {
        <div class="mt-5">
          <ng-content />
        </div>
      }
    </div>
  `,
})
export class EstadoVazioComponent {
  readonly titulo = input.required<string>();
  readonly texto = input.required<string>();
  readonly temAcao = input<boolean>(false);
}

@Component({
  selector: 'app-estado-erro',
  standalone: true,
  imports: [IconComponent, BotaoDirective],
  template: `
    <div class="m-4 rounded-md border tone-danger p-4" role="alert">
      <p class="flex items-center gap-2 font-semibold">
        <app-icon name="triangle-alert" svgClass="size-4" />
        Não foi possível carregar
      </p>
      <p class="mt-1 text-sm text-foreground/80">{{ texto() }}</p>
      <button
        type="button"
        appBotao
        variant="secundario"
        tamanho="pequeno"
        extraClass="mt-3"
        (click)="tentarNovamente.emit()"
      >
        <app-icon name="loader" svgClass="size-3.5" />
        Tentar novamente
      </button>
    </div>
  `,
})
export class EstadoErroComponent {
  readonly texto = input<string>(
    'A conexão com o servidor falhou. Verifique sua internet e tente novamente.',
  );
  readonly tentarNovamente = output<void>();
}

@Component({
  selector: 'app-alerta',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div [class]="classes()" role="alert">
      <p class="flex items-center gap-2 text-sm font-semibold">
        <app-icon name="triangle-alert" svgClass="size-4 shrink-0" />
        {{ titulo() }}
      </p>
      @if (temConteudo()) {
        <div class="mt-1 text-sm text-foreground/80">
          <ng-content />
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class AlertaComponent {
  readonly tom = input<TomSemantica>('danger');
  readonly titulo = input.required<string>();
  readonly temConteudo = input<boolean>(true);

  readonly classes = computed(() => `rounded-md border p-3 ${CLASSES_ALERTA[this.tom()]}`);
}

