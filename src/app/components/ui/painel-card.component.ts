import { Component, input } from '@angular/core';

@Component({
  selector: 'app-painel-card',
  standalone: true,
  template: `
    <section
      [attr.id]="id() || null"
      [class]="
        'flex min-h-0 flex-col rounded-md border border-border bg-surface chamfer scroll-mt-40 ' +
        extraClass()
      "
    >
      <header class="shrink-0 border-b border-border px-4 pt-3 pb-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-display text-[26px] leading-none">
              {{ titulo() }}
              @if (contagem() !== undefined) {
                <span class="text-muted-foreground text-lg">· {{ contagem() }}</span>
              }
            </h2>
            <div class="mt-1.5 h-0.5 w-10 bg-accent"></div>
          </div>
          <ng-content select="[acoes]" />
        </div>
      </header>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <ng-content />
      </div>
    </section>
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
export class PainelCardComponent {
  readonly titulo = input.required<string>();
  readonly contagem = input<number | undefined>(undefined);
  readonly id = input<string>('');
  readonly extraClass = input<string>('flex-1');
}

