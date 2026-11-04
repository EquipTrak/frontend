import { Component, inject } from '@angular/core';
import { ToastService, ToastTipo } from '../../services/toast.service';

@Component({
  selector: 'app-toaster',
  standalone: true,
  template: `
    @if (toastService.toasts().length > 0) {
      <section
        aria-label="Notifications"
        aria-live="polite"
        class="fixed top-6 right-6 z-[9999] flex w-[356px] max-w-[calc(100vw-32px)] flex-col gap-3 pointer-events-none"
      >
        @for (toast of toastService.toasts(); track toast.id) {
          <div
            [class]="classeToast(toast.tipo)"
            class="pointer-events-auto flex items-center gap-2 rounded-xl border p-4 text-[13px] shadow-lg transition-all animate-overlay-in"
          >
            <span class="flex size-4 shrink-0 items-center justify-center">
              @switch (toast.tipo) {
                @case ('success') {
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    height="20"
                    width="20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                }
                @case ('info') {
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    height="20"
                    width="20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                      clip-rule="evenodd"
                    />
                  </svg>
                }
                @case ('warning') {
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    height="20"
                    width="20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                }
                @case ('error') {
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    height="20"
                    width="20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                      clip-rule="evenodd"
                    />
                  </svg>
                }
              }
            </span>
            <span class="font-medium leading-normal">{{ toast.titulo }}</span>
          </div>
        }
      </section>
    }
  `,
})
export class ToasterComponent {
  readonly toastService = inject(ToastService);

  classeToast(tipo: ToastTipo): string {
    switch (tipo) {
      case 'success':
        return 'bg-[hsl(143,85%,96%)] border-[hsl(145,92%,87%)] text-[hsl(140,100%,27%)]';
      case 'info':
        return 'bg-[hsl(208,100%,97%)] border-[hsl(221,91%,93%)] text-[hsl(210,92%,45%)]';
      case 'warning':
        return 'bg-[hsl(49,100%,97%)] border-[hsl(49,91%,84%)] text-[hsl(31,92%,45%)]';
      case 'error':
        return 'bg-[hsl(359,100%,97%)] border-[hsl(359,100%,94%)] text-[hsl(360,100%,45%)]';
    }
  }
}
