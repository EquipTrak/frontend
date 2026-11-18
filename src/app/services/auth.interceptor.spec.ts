import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor (bordas)', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('equiptrack.token', 'token-secreto');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => controller.verify());

  it('não envia o token para endereços fora da API (não vaza a credencial)', async () => {
    const chamada = firstValueFrom(http.get('https://servico-externo.example/dados'));
    const req = controller.expectOne('https://servico-externo.example/dados');

    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
    await chamada;
  });

  it('um 401 no próprio login não derruba a sessão que já existia', async () => {
    const chamada = firstValueFrom(http.post('/api/auth/login', {}));
    controller
      .expectOne('/api/auth/login')
      .flush({ mensagem: 'E-mail ou senha inválidos.' }, { status: 401, statusText: 'Unauthorized' });

    await expect(chamada).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(auth.token).toBe('token-secreto');
  });

  it('um 403 não encerra a sessão (só o 401 faz isso)', async () => {
    const chamada = firstValueFrom(http.get('/api/solicitacoes'));
    controller
      .expectOne('/api/solicitacoes')
      .flush({ mensagem: 'Você não tem permissão para esta ação.' }, { status: 403, statusText: 'Forbidden' });

    await expect(chamada).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(auth.token).toBe('token-secreto');
  });
});
