import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { UsuarioApi } from '../models/api.models';
import { autenticadoGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

const USUARIO: UsuarioApi = {
  id: 2,
  nome: 'Marina Souza',
  email: 'marina.souza@equiptrack.local',
  perfil: 'OPERADOR',
};

describe('autenticadoGuard', () => {
  let http: HttpTestingController;

  /** O AuthService lê o token da sessionStorage ao ser criado, então ele é guardado antes do inject. */
  function preparar(tokenSalvo: string | null): void {
    sessionStorage.clear();
    if (tokenSalvo) sessionStorage.setItem('equiptrack.token', tokenSalvo);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  }

  function executarGuard(): Promise<boolean | UrlTree> {
    return TestBed.runInInjectionContext(
      () =>
        autenticadoGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as Promise<boolean | UrlTree>;
  }

  afterEach(() => http.verify());

  it('sem token salvo, manda para o login sem chamar a API', async () => {
    preparar(null);

    const resultado = await executarGuard();

    expect(resultado).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/');
  });

  it('com token válido, restaura a sessão pela API e libera a rota', async () => {
    preparar('token-valido');

    const resultado = executarGuard();
    http.expectOne('/api/auth/me').flush(USUARIO);

    await expect(resultado).resolves.toBe(true);
    expect(TestBed.inject(AuthService).usuario()).toEqual(USUARIO);
  });

  it('com token recusado pela API (401), limpa a sessão e manda para o login', async () => {
    preparar('token-expirado');

    const resultado = executarGuard();
    http
      .expectOne('/api/auth/me')
      .flush({ status: 401, mensagem: 'Autenticação necessária.' }, { status: 401, statusText: 'Unauthorized' });

    const rota = await resultado;
    expect(rota).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(AuthService).autenticado()).toBe(false);
    expect(sessionStorage.getItem('equiptrack.token')).toBeNull();
  });

  it('já autenticado, libera a rota sem nova chamada à API', async () => {
    preparar('token-valido');
    TestBed.inject(AuthService).usuario.set(USUARIO);

    await expect(executarGuard()).resolves.toBe(true);
  });
});
