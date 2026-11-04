import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SenhaService } from '../../core/auth/senha.service';
import { EsqueciSenha } from './esqueci-senha';

function montar(resposta = of(null as unknown)) {
  const solicitar = vi.fn().mockReturnValue(resposta);
  TestBed.configureTestingModule({
    imports: [EsqueciSenha],
    providers: [
      provideRouter([]),
      { provide: SenhaService, useValue: { solicitarRecuperacao: solicitar } },
    ],
  });
  const fixture = TestBed.createComponent(EsqueciSenha);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const enviar = (email: string) => {
    const input = el.querySelector<HTMLInputElement>('input#email')!;
    input.value = email;
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  return { el, enviar, solicitar };
}

describe('EsqueciSenha', () => {
  it('valida o e-mail antes de chamar o backend', () => {
    const { el, enviar, solicitar } = montar();
    enviar('invalido');
    expect(el.textContent).toContain('E-mail em formato inválido');
    expect(solicitar).not.toHaveBeenCalled();
  });

  it('mostra a mesma confirmação em sucesso', () => {
    const { el, enviar, solicitar } = montar();
    enviar('ana@empresa.com');
    expect(solicitar).toHaveBeenCalledWith('ana@empresa.com');
    expect(el.textContent).toContain('Se o e-mail estiver cadastrado');
  });

  it('não revela se o e-mail existe quando o backend falha', () => {
    const { el, enviar } = montar(throwError(() => new Error('404')));
    enviar('ana@empresa.com');
    expect(el.textContent).toContain('Se o e-mail estiver cadastrado');
  });
});
