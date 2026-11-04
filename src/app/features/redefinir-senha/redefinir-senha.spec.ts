import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SenhaService } from '../../core/auth/senha.service';
import { RedefinirSenha } from './redefinir-senha';

function montar(query: Record<string, string>) {
  const redefinir = vi.fn().mockReturnValue(of(null));
  TestBed.configureTestingModule({
    imports: [RedefinirSenha],
    providers: [
      provideRouter([]),
      { provide: SenhaService, useValue: { redefinir } },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap(query) } },
      },
    ],
  });
  const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(RedefinirSenha);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const enviar = (nova: string, confirmacao: string) => {
    for (const [id, valor] of [
      ['novaSenha', nova],
      ['confirmacao', confirmacao],
    ]) {
      const input = el.querySelector<HTMLInputElement>(`input#${id}`)!;
      input.value = valor;
      input.dispatchEvent(new Event('input'));
    }
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  return { el, enviar, redefinir, navegar };
}

describe('RedefinirSenha', () => {
  it('avisa quando o link não tem token', () => {
    const { el } = montar({});
    expect(el.textContent).toContain('Link inválido');
  });

  it('exige senhas iguais e com 8+ caracteres', () => {
    const { el, enviar, redefinir } = montar({ token: 't' });
    enviar('curta', 'outra');
    expect(el.textContent).toContain('Use pelo menos 8 caracteres');
    expect(el.textContent).toContain('As senhas não conferem');
    expect(redefinir).not.toHaveBeenCalled();
  });

  it('redefine e volta ao login', () => {
    const { enviar, redefinir, navegar } = montar({ token: 'tok' });
    enviar('NovaSenha@1', 'NovaSenha@1');
    expect(redefinir).toHaveBeenCalledWith('tok', 'NovaSenha@1');
    expect(navegar).toHaveBeenCalledWith(['/login'], { queryParams: { senhaRedefinida: true } });
  });
});
