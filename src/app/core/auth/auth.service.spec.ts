import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../config';
import { AuthService, SESSAO_STORAGE_KEY } from './auth.service';
import { RESPOSTA_LOGIN } from './testing';

const API = 'http://localhost:8080';

function criar(): { auth: AuthService; http: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: API },
    ],
  });
  return { auth: TestBed.inject(AuthService), http: TestBed.inject(HttpTestingController) };
}

describe('AuthService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  it('login envia e-mail aparado, guarda a sessão e expõe o usuário', () => {
    const { auth, http } = criar();
    auth.login({ email: '  admin@equiptrack.local ', senha: 'Admin@123' }).subscribe();

    const req = http.expectOne(`${API}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'admin@equiptrack.local', senha: 'Admin@123' });
    req.flush(RESPOSTA_LOGIN);

    expect(auth.autenticado).toBe(true);
    expect(auth.token).toBe('token-abc');
    expect(auth.usuario()?.perfil).toBe('ADMINISTRADOR');
    expect(localStorage.getItem(SESSAO_STORAGE_KEY)).toContain('token-abc');
  });

  it('login com 401 não cria sessão', () => {
    const { auth, http } = criar();
    let status = 0;
    auth.login({ email: 'a@b.com', senha: 'x' }).subscribe({ error: (e) => (status = e.status) });
    http
      .expectOne(`${API}/auth/login`)
      .flush(
        { mensagem: 'E-mail ou senha inválidos.' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(status).toBe(401);
    expect(auth.autenticado).toBe(false);
    expect(localStorage.getItem(SESSAO_STORAGE_KEY)).toBeNull();
  });

  it('restaura uma sessão válida do armazenamento', () => {
    localStorage.setItem(
      SESSAO_STORAGE_KEY,
      JSON.stringify({
        token: 't',
        expiraEm: Date.now() + 60_000,
        usuario: RESPOSTA_LOGIN.usuario,
      }),
    );
    const { auth } = criar();
    expect(auth.autenticado).toBe(true);
  });

  it('ignora sessão expirada ou corrompida no armazenamento', () => {
    localStorage.setItem(
      SESSAO_STORAGE_KEY,
      JSON.stringify({ token: 't', expiraEm: Date.now() - 1, usuario: RESPOSTA_LOGIN.usuario }),
    );
    expect(criar().auth.autenticado).toBe(false);

    TestBed.resetTestingModule();
    localStorage.setItem(SESSAO_STORAGE_KEY, '{nao-e-json');
    expect(criar().auth.autenticado).toBe(false);
  });

  it('token expira com o tempo e a sessão é limpa', () => {
    vi.useFakeTimers();
    const { auth, http } = criar();
    auth.login({ email: 'a@b.com', senha: 'x' }).subscribe();
    http.expectOne(`${API}/auth/login`).flush({ ...RESPOSTA_LOGIN, expiraEmSegundos: 10 });
    expect(auth.autenticado).toBe(true);

    vi.advanceTimersByTime(11_000);
    expect(auth.autenticado).toBe(false);
    expect(localStorage.getItem(SESSAO_STORAGE_KEY)).toBeNull();
  });

  it('logout chama o backend e limpa a sessão', () => {
    const { auth, http } = criar();
    auth.login({ email: 'a@b.com', senha: 'x' }).subscribe();
    http.expectOne(`${API}/auth/login`).flush(RESPOSTA_LOGIN);

    auth.logout().subscribe();
    const req = http.expectOne(`${API}/auth/logout`);
    expect(req.request.method).toBe('POST');
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(auth.autenticado).toBe(false);
    expect(auth.usuario()).toBeNull();
  });

  it('logout limpa a sessão local mesmo se o backend falhar', () => {
    const { auth, http } = criar();
    auth.login({ email: 'a@b.com', senha: 'x' }).subscribe();
    http.expectOne(`${API}/auth/login`).flush(RESPOSTA_LOGIN);

    auth.logout().subscribe();
    http.expectOne(`${API}/auth/logout`).error(new ProgressEvent('error'));

    expect(auth.autenticado).toBe(false);
  });

  it('logout sem sessão não chama o backend', () => {
    const { auth, http } = criar();
    auth.logout().subscribe();
    http.expectNone(`${API}/auth/logout`);
  });

  it('me atualiza o usuário da sessão', () => {
    const { auth, http } = criar();
    auth.login({ email: 'a@b.com', senha: 'x' }).subscribe();
    http.expectOne(`${API}/auth/login`).flush(RESPOSTA_LOGIN);

    auth.me().subscribe();
    http.expectOne(`${API}/auth/me`).flush({ ...RESPOSTA_LOGIN.usuario, nome: 'Novo Nome' });
    expect(auth.usuario()?.nome).toBe('Novo Nome');
  });
});
