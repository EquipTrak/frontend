import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../api.config';
import { LoginResposta, UsuarioApi } from '../models/api.models';

const CHAVE_TOKEN = 'equiptrack.token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  // O token fica na sessionStorage: sobrevive a um recarregamento, mas some ao fechar a aba.
  private tokenAtual: string | null = lerToken();

  readonly usuario = signal<UsuarioApi | null>(null);
  readonly autenticado = computed(() => this.usuario() !== null);

  get token(): string | null {
    return this.tokenAtual;
  }

  async login(email: string, senha: string): Promise<UsuarioApi> {
    const resposta = await firstValueFrom(
      this.http.post<LoginResposta>(`${API_URL}/auth/login`, { email, senha }),
    );
    this.guardarToken(resposta.token);
    this.usuario.set(resposta.usuario);
    return resposta.usuario;
  }

  /** Recupera o usuário a partir do token salvo, por exemplo depois de recarregar a página. */
  async restaurarSessao(): Promise<boolean> {
    if (this.usuario()) return true;
    if (!this.tokenAtual) return false;
    try {
      this.usuario.set(await firstValueFrom(this.http.get<UsuarioApi>(`${API_URL}/auth/me`)));
      return true;
    } catch {
      this.limparSessao();
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.tokenAtual) {
        await firstValueFrom(this.http.post<void>(`${API_URL}/auth/logout`, null));
      }
    } catch {
      // O token pode já ter expirado; a sessão local é encerrada de qualquer forma.
    } finally {
      this.limparSessao();
    }
  }

  limparSessao(): void {
    this.tokenAtual = null;
    try {
      sessionStorage.removeItem(CHAVE_TOKEN);
    } catch {
      // Armazenamento bloqueado: o token já foi descartado da memória.
    }
    this.usuario.set(null);
  }

  private guardarToken(token: string): void {
    this.tokenAtual = token;
    try {
      sessionStorage.setItem(CHAVE_TOKEN, token);
    } catch {
      // Sem armazenamento, a sessão vale só até recarregar a página.
    }
  }
}

function lerToken(): string | null {
  try {
    return sessionStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}
