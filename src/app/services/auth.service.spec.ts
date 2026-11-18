import { HttpErrorResponse, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginResposta } from '../models/api.models';
import { descreverErroLogin } from '../pages/login/login.component';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

const RESPOSTA_LOGIN: LoginResposta = {
  token: 'token-de-teste',
  tipo: 'Bearer',
  expiraEm: '2026-11-14T20:00:00Z',
  usuario: { id: 2, nome: 'Marina Souza', email: 'marina.souza@equiptrack.local', perfil: 'OPERADOR' },
};

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function fazerLogin(): Promise<void> {
    const login = auth.login('marina.souza@equiptrack.local', 'senha');
    http.expectOne('/api/auth/login').flush(RESPOSTA_LOGIN);
    await login;
  }

  it('envia as credenciais e guarda o token e o usuário', async () => {
    const login = auth.login('marina.souza@equiptrack.local', 'senha');
    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'marina.souza@equiptrack.local', senha: 'senha' });
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(RESPOSTA_LOGIN);

    await expect(login).resolves.toEqual(RESPOSTA_LOGIN.usuario);
    expect(auth.autenticado()).toBe(true);
    expect(auth.token).toBe('token-de-teste');
    expect(sessionStorage.getItem('equiptrack.token')).toBe('token-de-teste');
  });

  it('envia o token como Bearer nas chamadas seguintes', async () => {
    await fazerLogin();
    auth.usuario.set(null);

    const restaurar = auth.restaurarSessao();
    const req = http.expectOne('/api/auth/me');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-de-teste');
    req.flush(RESPOSTA_LOGIN.usuario);

    await expect(restaurar).resolves.toBe(true);
    expect(auth.usuario()?.nome).toBe('Marina Souza');
  });

  it('não chama a API para restaurar sem token salvo', async () => {
    await expect(auth.restaurarSessao()).resolves.toBe(false);
    http.expectNone('/api/auth/me');
  });

  it('encerra a sessão e volta ao login quando a API responde 401', async () => {
    await fazerLogin();
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    auth.usuario.set(null);

    const restaurar = auth.restaurarSessao();
    http.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(restaurar).resolves.toBe(false);
    expect(auth.token).toBeNull();
    expect(sessionStorage.getItem('equiptrack.token')).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/']);
  });

  it('revoga o token no logout e limpa a sessão', async () => {
    await fazerLogin();

    const logout = auth.logout();
    const req = http.expectOne('/api/auth/logout');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-de-teste');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await logout;

    expect(auth.autenticado()).toBe(false);
    expect(auth.token).toBeNull();
  });

  it('limpa a sessão local mesmo se o logout falhar', async () => {
    await fazerLogin();

    const logout = auth.logout();
    http.expectOne('/api/auth/logout').flush(null, { status: 401, statusText: 'Unauthorized' });
    await logout;

    expect(auth.token).toBeNull();
  });
});

describe('descreverErroLogin', () => {
  function erroHttp(status: number, corpo: unknown = null, headers?: HttpHeaders): HttpErrorResponse {
    return new HttpErrorResponse({ status, error: corpo, headers });
  }

  it('marca credenciais inválidas no 401', () => {
    expect(descreverErroLogin(erroHttp(401))).toMatchObject({
      titulo: 'E-mail ou senha inválidos',
      credenciais: true,
    });
  });

  it('mostra os erros de campo do 400', () => {
    const corpo = { mensagem: 'Dados inválidos.', campos: { email: 'O e-mail é inválido.' } };
    expect(descreverErroLogin(erroHttp(400, corpo)).texto).toBe('O e-mail é inválido.');
  });

  it('usa a mensagem do backend no 403', () => {
    const corpo = { mensagem: 'Usuário desativado. Procure o administrador.' };
    expect(descreverErroLogin(erroHttp(403, corpo)).texto).toBe(
      'Usuário desativado. Procure o administrador.',
    );
  });

  it('converte o Retry-After do 429 em minutos', () => {
    const headers = new HttpHeaders({ 'Retry-After': '600' });
    expect(descreverErroLogin(erroHttp(429, null, headers)).texto).toContain('10 min');
  });

  it('avisa quando o servidor não responde', () => {
    expect(descreverErroLogin(erroHttp(0)).titulo).toBe('Servidor indisponível');
  });
});
