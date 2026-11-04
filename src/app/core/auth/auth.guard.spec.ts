import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from './auth.service';

function executar(guard: typeof authGuard, autenticado: boolean, url = '/equipamentos') {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  vi.spyOn(TestBed.inject(AuthService), 'autenticado', 'get').mockReturnValue(autenticado);
  return TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  );
}

describe('guards', () => {
  it('authGuard libera usuário autenticado', () => {
    expect(executar(authGuard, true)).toBe(true);
  });

  it('authGuard envia anônimo ao login guardando returnUrl', () => {
    const resultado = executar(authGuard, false) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(resultado)).toBe('/login?returnUrl=%2Fequipamentos');
  });

  it('guestGuard libera anônimo', () => {
    expect(executar(guestGuard, false)).toBe(true);
  });

  it('guestGuard redireciona autenticado para a home', () => {
    const resultado = executar(guestGuard, true) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(resultado)).toBe('/');
  });
});
