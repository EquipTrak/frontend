import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { EquipTrackService } from '../../services/equiptrack.service';
import { DisponiveisSolicitanteComponent } from './disponiveis-solicitante.component';

describe('DisponiveisSolicitanteComponent (bloqueio por atraso)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(AuthService).usuario.set({
      id: 3,
      nome: 'Rafael Lima',
      email: 'r@equiptrack.local',
      perfil: 'SOLICITANTE',
    });
    TestBed.inject(EquipTrackService).equipamentos.set([
      {
        id: 12,
        patrimonio: 'PJ-0001',
        descricao: 'Projetor Epson',
        categoria: 'Projetor',
        categoriaId: 2,
        condicao: 'BOA',
        situacao: 'DISPONIVEL',
        prazoMaxHoras: 24,
      },
    ]);
  });

  it('desabilita "Solicitar" e mostra o aviso quando há empréstimo atrasado', () => {
    const service = TestBed.inject(EquipTrackService);
    const fixture = TestBed.createComponent(DisponiveisSolicitanteComponent);
    fixture.detectChanges();
    const botao = (): HTMLButtonElement => fixture.nativeElement.querySelector('article button');

    expect(botao().disabled).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Novas solicitações bloqueadas');

    service.solicitacoes.set([
      {
        id: 'S-1',
        numero: 1,
        solicitante: 'Rafael Lima',
        patrimonio: 'NB-0002',
        inicio: '11/11/2026 09:00',
        fim: '13/11/2026 09:00',
        status: 'ATRASADO',
        emprestimoId: 5,
      },
    ]);
    fixture.detectChanges();

    expect(botao().getAttribute('aria-disabled')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('Novas solicitações bloqueadas');
  });

  it('com atraso, clicar em "Solicitar" mostra o pop-up de bloqueio e não abre o formulário', () => {
    const service = TestBed.inject(EquipTrackService);
    service.solicitacoes.set([
      {
        id: 'S-1',
        numero: 1,
        solicitante: 'Rafael Lima',
        patrimonio: 'NB-0002',
        inicio: '11/11/2026 09:00',
        fim: '13/11/2026 09:00',
        status: 'ATRASADO',
        emprestimoId: 5,
      },
    ]);
    const fixture = TestBed.createComponent(DisponiveisSolicitanteComponent);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('article button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const dialogo: HTMLElement = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialogo.getAttribute('aria-label')).toBe('Solicitação bloqueada');
    expect(dialogo.textContent).toContain('empréstimos em atraso');
    expect(dialogo.textContent).toContain('NB-0002');
    expect(fixture.componentInstance.equipamentoSelecionado()).toBeNull();

    const entendi = Array.from(dialogo.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Entendi'),
    ) as HTMLButtonElement;
    entendi.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('sem atraso, clicar em "Solicitar" abre o formulário', () => {
    const fixture = TestBed.createComponent(DisponiveisSolicitanteComponent);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('article button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.alertaAtrasoAberto()).toBe(false);
    expect(fixture.componentInstance.equipamentoSelecionado()?.patrimonio).toBe('PJ-0001');
  });

  it('um empréstimo em dia não bloqueia', () => {
    const service = TestBed.inject(EquipTrackService);
    service.solicitacoes.set([
      {
        id: 'S-1',
        numero: 1,
        solicitante: 'Rafael Lima',
        patrimonio: 'NB-0002',
        inicio: '',
        fim: '',
        status: 'RETIRADO',
        emprestimoId: 5,
      },
    ]);
    const fixture = TestBed.createComponent(DisponiveisSolicitanteComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.possuiAtraso()).toBe(false);
  });
});
