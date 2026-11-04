import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, of, tap } from 'rxjs';
import { API_URL } from '../config';
import { LoginRequest, LoginResponse, Sessao, Usuario } from './auth.models';

export const SESSAO_STORAGE_KEY = 'equiptrack.sessao';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly sessao = signal<Sessao | null>(this.carregarSessao());

  readonly usuario = computed<Usuario | null>(() => this.sessao()?.usuario ?? null);

  /** Token vigente ou null se não houver sessão ou se ela já expirou. */
  get token(): string | null {
    const sessao = this.sessao();
    if (!sessao) return null;
    if (sessao.expiraEm <= Date.now()) {
      this.limparSessao();
      return null;
    }
    return sessao.token;
  }

  get autenticado(): boolean {
    return this.token !== null;
  }

  login(credenciais: LoginRequest): Observable<LoginResponse> {
    const corpo: LoginRequest = { email: credenciais.email.trim(), senha: credenciais.senha };
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, corpo)
      .pipe(tap((resposta) => this.salvarSessao(resposta)));
  }

  /** Revoga o token no backend e limpa a sessão local, mesmo se a chamada falhar. */
  logout(): Observable<unknown> {
    if (!this.token) {
      this.limparSessao();
      return of(null);
    }
    return this.http.post(`${this.apiUrl}/auth/logout`, null).pipe(
      catchError(() => of(null)),
      finalize(() => this.limparSessao()),
    );
  }

  /** Busca o usuário do token no backend e atualiza a sessão local. */
  me(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/auth/me`).pipe(
      tap((usuario) => {
        const atual = this.sessao();
        if (atual) this.persistir({ ...atual, usuario });
      }),
    );
  }

  /** Descarta a sessão local sem chamar o backend (ex.: 401 recebido). */
  limparSessao(): void {
    this.sessao.set(null);
    try {
      localStorage.removeItem(SESSAO_STORAGE_KEY);
    } catch {
      // armazenamento indisponível: a sessão em memória já foi descartada
    }
  }

  private salvarSessao(resposta: LoginResponse): void {
    this.persistir({
      token: resposta.token,
      expiraEm: Date.now() + resposta.expiraEmSegundos * 1000,
      usuario: resposta.usuario,
    });
  }

  private persistir(sessao: Sessao): void {
    this.sessao.set(sessao);
    try {
      localStorage.setItem(SESSAO_STORAGE_KEY, JSON.stringify(sessao));
    } catch {
      // sem armazenamento a sessão vale apenas até recarregar a página
    }
  }

  private carregarSessao(): Sessao | null {
    try {
      const bruto = localStorage.getItem(SESSAO_STORAGE_KEY);
      if (!bruto) return null;
      const sessao = JSON.parse(bruto) as Sessao;
      const valida =
        typeof sessao.token === 'string' &&
        typeof sessao.expiraEm === 'number' &&
        sessao.expiraEm > Date.now() &&
        !!sessao.usuario;
      return valida ? sessao : null;
    } catch {
      return null;
    }
  }
}
