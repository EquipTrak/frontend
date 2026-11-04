import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_URL } from '../config';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { RESPOSTA_LOGIN } from './testing';

const API = 'http://localhost:8080';

function preparar() {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
    ],
  });
  const auth = TestBed.inject(AuthService);
  auth.login({ email: 'a@b.com', senha: 'x' }).subscribe();
  const http = TestBed.inject(HttpTestingController);
  http.expectOne(`${API}/auth/login`).flush(RESPOSTA_LOGIN);
  return { auth, http, client: TestBed.inject(HttpClient), router: TestBed.inject(Router) };
}

describe('authInterceptor', () => {
  it('anexa o Bearer token em chamadas ao backend', () => {
    const { http, client } = preparar();
    client.get(`${API}/qualquer`).subscribe();
    expect(http.expectOne(`${API}/qualquer`).request.headers.get('Authorization')).toBe(
      'Bearer token-abc',
    );
  });

  it('não envia o token para outros domínios', () => {
    const { http, client } = preparar();
    client.get('https://terceiro.example/x').subscribe();
    expect(http.expectOne('https://terceiro.example/x').request.headers.has('Authorization')).toBe(
      false,
    );
  });

  it('401 em rota protegida limpa a sessão e vai ao login', () => {
    const { auth, http, client, router } = preparar();
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    client.get(`${API}/qualquer`).subscribe({ error: () => undefined });
    http.expectOne(`${API}/qualquer`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.autenticado).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['/login'], { queryParams: { sessaoExpirada: true } });
  });

  it('401 no próprio login não redireciona', () => {
    const { auth, http, client, router } = preparar();
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    client.post(`${API}/auth/login`, {}).subscribe({ error: () => undefined });
    http.expectOne(`${API}/auth/login`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(navegar).not.toHaveBeenCalled();
    expect(auth.autenticado).toBe(true);
  });
});
