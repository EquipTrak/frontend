import { Component, input } from '@angular/core';

@Component({
  selector: 'app-mascote',
  standalone: true,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 48 48"
      [class]="svgClass()"
      aria-hidden="true"
    >
      @if (!mono()) {
        <rect x="0" y="0" width="48" height="48" rx="8" fill="var(--accent)" />
      }
      <rect x="14" y="38" width="20" height="5" rx="1.5" fill="var(--on-accent)" />
      <circle cx="24" cy="22" r="15" fill="var(--on-accent)" />
      <circle
        cx="24"
        cy="22"
        r="9.5"
        [attr.fill]="mono() ? 'var(--topbar)' : 'var(--accent)'"
      />
      <circle
        cx="11.5"
        cy="22"
        r="1.4"
        [attr.fill]="mono() ? 'var(--topbar)' : 'var(--accent)'"
      />
      <circle
        cx="36.5"
        cy="22"
        r="1.4"
        [attr.fill]="mono() ? 'var(--topbar)' : 'var(--accent)'"
      />
      <circle
        cx="24"
        cy="9.5"
        r="1.4"
        [attr.fill]="mono() ? 'var(--topbar)' : 'var(--accent)'"
      />
      @if (perdido()) {
        <text
          x="24"
          y="27"
          text-anchor="middle"
          font-size="13"
          font-weight="700"
          fill="var(--on-accent)"
          opacity="0.55"
          font-family="Inter"
        >
          ?
        </text>
      } @else {
        <path
          d="M24 16.5a4.2 4.2 0 0 0-4.2 4.2c0 3.1 4.2 7.6 4.2 7.6s4.2-4.5 4.2-7.6a4.2 4.2 0 0 0-4.2-4.2Zm0 5.8a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2Z"
          fill="var(--on-accent)"
        />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }
  `,
})
export class MascoteComponent {
  readonly size = input<number>(40);
  readonly perdido = input<boolean>(false);
  readonly mono = input<boolean>(false);
  readonly svgClass = input<string>('');
}

@Component({
  selector: 'app-brand-logo',
  standalone: true,
  imports: [MascoteComponent],
  template: `
    <span class="flex items-center gap-2.5">
      <app-mascote [size]="compact() ? 32 : 40" />
      <span class="font-display text-2xl leading-none">
        <span class="text-foreground">EQUIP</span><span class="text-accent-text">TRACK</span>
      </span>
    </span>
  `,
})
export class BrandLogoComponent {
  readonly compact = input<boolean>(false);
}

