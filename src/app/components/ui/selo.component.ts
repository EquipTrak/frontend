import { Component, computed, input } from '@angular/core';
import { BADGE_CONFIG, BadgeValor, TomSemantica } from '../../models/equiptrack.models';
import { IconComponent } from './icon.component';

const CLASSES_TOM: Record<TomSemantica, string> = {
  success: 'tone-success',
  info: 'tone-info',
  warning: 'tone-warning',
  danger: 'tone-danger',
  neutral: 'tone-neutral',
};

@Component({
  selector: 'app-selo',
  standalone: true,
  imports: [IconComponent],
  template: `
    @if (config(); as cfg) {
      <span [class]="classes()">
        @if (cfg.icone) {
          <app-icon [name]="cfg.icone" svgClass="size-3" />
        }
        {{ cfg.texto }}
      </span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }
  `,
})
export class SeloComponent {
  readonly valor = input.required<BadgeValor | string>();
  readonly destaque = input<boolean>(false);

  readonly config = computed(() => BADGE_CONFIG[this.valor() as BadgeValor] ?? null);

  readonly classes = computed(() => {
    const cfg = this.config();
    if (!cfg) return '';
    const base =
      'inline-flex items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider';
    const tom = CLASSES_TOM[cfg.tom];
    const extra = this.destaque() ? 'ring-1 ring-danger animate-pulse' : '';
    return [base, tom, extra].filter(Boolean).join(' ');
  });
}

