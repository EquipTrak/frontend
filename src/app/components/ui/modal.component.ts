import { Component, HostListener, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [IconComponent],
  template: `
    @if (aberto()) {
      <div
        class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-overlay-in"
        (click)="fechar.emit()"
      ></div>
      <div
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="titulo()"
        [class]="
          'fixed z-50 flex max-h-[92vh] flex-col border bg-surface shadow-2xl inset-x-0 bottom-0 rounded-t-xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[480px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-md sm:chamfer animate-modal-content ' +
          (perigo() ? 'border-danger border-2' : 'border-border')
        "
      >
        <div class="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden"></div>
        <div class="flex items-start justify-between gap-4 px-5 pt-4">
          <div>
            <h2 [class]="'font-display text-2xl leading-none ' + (perigo() ? 'text-danger' : '')">
              {{ titulo() }}
            </h2>
            <div [class]="'mt-1.5 h-0.5 w-10 ' + (perigo() ? 'bg-danger' : 'bg-accent')"></div>
          </div>
          <button
            type="button"
            class="rounded-sm p-1 text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
            (click)="fechar.emit()"
          >
            <app-icon name="x" svgClass="size-5" />
          </button>
        </div>
        <p class="sr-only">{{ titulo() }}</p>
        <div class="overflow-y-auto px-5 py-4">
          <ng-content />
        </div>
        @if (temRodape()) {
          <div
            class="flex flex-col-reverse gap-2 border-t border-border px-5 py-3 sm:flex-row sm:justify-end"
          >
            <ng-content select="[rodape]" />
          </div>
        }
      </div>
    }
  `,
})
export class ModalComponent {
  readonly aberto = input.required<boolean>();
  readonly titulo = input.required<string>();
  readonly perigo = input<boolean>(false);
  readonly temRodape = input<boolean>(true);
  readonly fechar = output<void>();

  @HostListener('document:keydown.escape')
  aoPressionarEscape(): void {
    if (this.aberto()) {
      this.fechar.emit();
    }
  }
}

@Component({
  selector: 'app-gaveta',
  standalone: true,
  imports: [IconComponent],
  template: `
    @if (aberto()) {
      <div
        class="fixed inset-0 z-50 bg-background/70 animate-overlay-in"
        (click)="fechar.emit()"
      ></div>
      <div
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="titulo()"
        class="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-surface sm:w-[480px] animate-drawer-in"
      >
        <div class="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 class="font-display text-xl text-muted-foreground">{{ titulo() }}</h2>
          <button
            type="button"
            class="rounded-sm p-1 text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
            (click)="fechar.emit()"
          >
            <app-icon name="x" svgClass="size-5" />
          </button>
        </div>
        <p class="sr-only">{{ titulo() }}</p>
        <div class="flex-1 overflow-y-auto">
          <ng-content />
        </div>
      </div>
    }
  `,
})
export class GavetaComponent {
  readonly aberto = input.required<boolean>();
  readonly titulo = input.required<string>();
  readonly fechar = output<void>();

  @HostListener('document:keydown.escape')
  aoPressionarEscape(): void {
    if (this.aberto()) {
      this.fechar.emit();
    }
  }
}

