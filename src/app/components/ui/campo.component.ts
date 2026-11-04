import { Component, computed, Directive, input } from '@angular/core';
import { IconComponent } from './icon.component';

export const CLASSE_CAMPO_BASE =
  'w-full min-h-11 sm:min-h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent-text focus:outline-none';

@Directive({
  selector: 'input[appInput]',
  standalone: true,
  host: {
    '[class]': 'classesHost()',
    '[attr.aria-invalid]': 'invalido() || null',
  },
})
export class InputDirective {
  readonly invalido = input<boolean>(false);
  readonly extraClass = input<string>('');

  readonly classesHost = computed(() =>
    [CLASSE_CAMPO_BASE, this.invalido() ? 'border-danger' : '', this.extraClass()]
      .filter(Boolean)
      .join(' '),
  );
}

@Directive({
  selector: 'select[appSelect]',
  standalone: true,
  host: {
    '[class]': 'classesHost()',
  },
})
export class SelectDirective {
  readonly extraClass = input<string>('');

  readonly classesHost = computed(() =>
    [CLASSE_CAMPO_BASE, 'appearance-none', this.extraClass()].filter(Boolean).join(' '),
  );
}

@Component({
  selector: 'app-campo',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="space-y-1.5">
      <label [attr.for]="id()" class="block text-[13px] font-medium text-foreground">
        {{ label() }}
      </label>
      <ng-content />
      @if (erro()) {
        <p class="flex items-center gap-1 text-xs text-danger" role="alert">
          <app-icon name="circle-x" svgClass="size-3.5" />
          {{ erro() }}
        </p>
      } @else if (ajuda()) {
        <p class="text-xs text-muted-foreground">{{ ajuda() }}</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class CampoComponent {
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly erro = input<string | undefined>(undefined);
  readonly ajuda = input<string | undefined>(undefined);
}
