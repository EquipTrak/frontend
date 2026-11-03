import { Component, computed, Directive, input, output } from '@angular/core';

export type VarianteBotao = 'primario' | 'secundario' | 'fantasma' | 'perigo';
export type TamanhoBotao = 'padrao' | 'pequeno';

const VARIANTES_BOTAO: Record<VarianteBotao, string> = {
  primario: 'bg-accent text-on-accent hover:bg-accent-hover chamfer-sm',
  secundario: 'border border-border bg-surface-2 text-foreground hover:border-accent-text',
  fantasma: 'text-muted-foreground hover:text-foreground hover:bg-surface-2',
  perigo: 'bg-danger text-on-accent hover:opacity-90 chamfer-sm',
};

const TAMANHOS_BOTAO: Record<TamanhoBotao, string> = {
  padrao: 'min-h-11 sm:min-h-9 px-4 text-xs',
  pequeno: 'min-h-9 sm:min-h-8 px-3 text-[11px]',
};

@Directive({
  selector: 'button[appBotao]',
  standalone: true,
  host: {
    '[class]': 'classesHost()',
  },
})
export class BotaoDirective {
  readonly variant = input<VarianteBotao>('primario');
  readonly tamanho = input<TamanhoBotao>('padrao');
  readonly extraClass = input<string>('');

  readonly classesHost = computed(() => {
    const base =
      'inline-flex items-center justify-center gap-2 font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:pointer-events-none rounded-md';
    return [
      base,
      VARIANTES_BOTAO[this.variant()],
      TAMANHOS_BOTAO[this.tamanho()],
      this.extraClass(),
    ]
      .filter(Boolean)
      .join(' ');
  });
}

@Component({
  selector: 'app-chip-filtro',
  standalone: true,
  template: `
    <button
      type="button"
      [attr.aria-pressed]="ativo()"
      (click)="selecionar.emit()"
      [class]="classes()"
    >
      <ng-content />
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
    }
  `,
})
export class ChipFiltroComponent {
  readonly ativo = input<boolean>(false);
  readonly selecionar = output<void>();

  readonly classes = computed(() => {
    const base =
      'min-h-8 whitespace-nowrap rounded-sm border px-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors';
    const estado = this.ativo()
      ? 'border-accent bg-accent-soft text-accent-text'
      : 'border-border text-muted-foreground hover:text-foreground';
    return `${base} ${estado}`;
  });
}

