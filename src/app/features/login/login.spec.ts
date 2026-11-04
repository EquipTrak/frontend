import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { LoginResponse } from '../../core/auth/auth.models';
import { RESPOSTA_LOGIN } from '../../core/auth/testing';
import { Login } from './login';

function montar(query: Record<string, string> = {}, login?: Observable<LoginResponse>) {
  TestBed.configureTestingModule({
    imports: [Login],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap(query) } },
      },
    ],
  });
  const auth = TestBed.inject(AuthService);
  const loginSpy = vi.spyOn(auth, 'login').mockReturnValue(login ?? of(RESPOSTA_LOGIN));
  const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture: ComponentFixture<Login> = TestBed.createComponent(Login);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const preencher = (email: string, senha: string) => {
    const e = el.querySelector<HTMLInputElement>('#email')!;
    const s = el.querySelector<HTMLInputElement>('#senha')!;
    e.value = email;
    e.dispatchEvent(new Event('input'));
    s.value = senha;
    s.dispatchEvent(new Event('input'));
  };
  const enviar = () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  return { fixture, el, preencher, enviar, loginSpy, navegar };
}

describe('Login', () => {
  beforeEach(() => localStorage.clear());

  it('mostra erros de validação e não chama o backend com formulário vazio', () => {
    const { el, enviar, loginSpy } = montar();
    enviar();
    expect(el.textContent).toContain('E-mail é obrigatório');
    expect(el.textContent).toContain('Senha é obrigatória');
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it('rejeita e-mail em formato inválido', () => {
    const { el, preencher, enviar, loginSpy } = montar();
    preencher('nao-e-email', 'x');
    enviar();
    expect(el.textContent).toContain('E-mail em formato inválido');
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it('faz login e vai para a home', () => {
    const { preencher, enviar, loginSpy, navegar } = montar();
    preencher('admin@equiptrack.local', 'Admin@123');
    enviar();
    expect(loginSpy).toHaveBeenCalledWith({ email: 'admin@equiptrack.local', senha: 'Admin@123' });
    expect(navegar).toHaveBeenCalledWith('/');
  });

  it('volta para a returnUrl interna após o login', () => {
    const { preencher, enviar, navegar } = montar({ returnUrl: '/equipamentos' });
    preencher('a@b.com', 'x');
    enviar();
    expect(navegar).toHaveBeenCalledWith('/equipamentos');
  });

  it('ignora returnUrl externa (open redirect)', () => {
    const { preencher, enviar, navegar } = montar({ returnUrl: '//malicioso.example' });
    preencher('a@b.com', 'x');
    enviar();
    expect(navegar).toHaveBeenCalledWith('/');
  });

  it('exibe a mensagem do backend em 401 e libera o botão', () => {
    const erro = new HttpErrorResponse({
      status: 401,
      error: { mensagem: 'E-mail ou senha inválidos.' },
    });
    const { fixture, el, preencher, enviar, navegar } = montar(
      {},
      throwError(() => erro),
    );
    preencher('a@b.com', 'errada');
    enviar();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('E-mail ou senha inválidos.');
    expect(el.querySelector<HTMLButtonElement>('button')!.disabled).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('desabilita o botão e ignora duplo envio enquanto carrega', () => {
    const pendente = new Subject<LoginResponse>();
    const { el, preencher, enviar, loginSpy } = montar({}, pendente);
    preencher('a@b.com', 'x');
    enviar();
    enviar();
    expect(el.querySelector<HTMLButtonElement>('button')!.disabled).toBe(true);
    expect(loginSpy).toHaveBeenCalledTimes(1);
  });

  it('avisa quando a sessão expirou', () => {
    const { el } = montar({ sessaoExpirada: 'true' });
    expect(el.textContent).toContain('Sua sessão expirou');
  });
});
