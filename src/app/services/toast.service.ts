import { Injectable, signal } from '@angular/core';

export type ToastTipo = 'success' | 'info' | 'warning' | 'error';

export interface ToastMensagem {
  id: number;
  titulo: string;
  tipo: ToastTipo;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private proximoId = 1;
  readonly toasts = signal<ToastMensagem[]>([]);

  success(titulo: string, duracaoMs = 4000): void {
    this.adicionar(titulo, 'success', duracaoMs);
  }

  info(titulo: string, duracaoMs = 4000): void {
    this.adicionar(titulo, 'info', duracaoMs);
  }

  warning(titulo: string, duracaoMs = 4000): void {
    this.adicionar(titulo, 'warning', duracaoMs);
  }

  error(titulo: string, duracaoMs = 4000): void {
    this.adicionar(titulo, 'error', duracaoMs);
  }

  dismiss(id: number): void {
    this.toasts.update((lista) => lista.filter((item) => item.id !== id));
  }

  private adicionar(titulo: string, tipo: ToastTipo, duracaoMs: number): void {
    const id = this.proximoId++;
    this.toasts.update((lista) => [{ id, titulo, tipo }, ...lista].slice(0, 3));
    if (duracaoMs > 0 && typeof window !== 'undefined') {
      window.setTimeout(() => this.dismiss(id), duracaoMs);
    }
  }
}
