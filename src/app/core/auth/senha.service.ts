import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../config';

/**
 * Recuperação e redefinição de senha (SCRUM-24).
 * TODO: os endpoints ainda não existem no backend; os caminhos abaixo são a proposta
 * do front e devem ser confirmados quando a API for publicada.
 */
@Injectable({ providedIn: 'root' })
export class SenhaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  /** Pede o envio do link de redefinição. A resposta é a mesma exista ou não o e-mail. */
  solicitarRecuperacao(email: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/auth/esqueci-senha`, { email: email.trim() });
  }

  /** Troca a senha usando o token recebido por e-mail. */
  redefinir(token: string, novaSenha: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/auth/redefinir-senha`, { token, novaSenha });
  }
}
