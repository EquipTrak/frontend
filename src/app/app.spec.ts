import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { EquipTrackService } from './services/equiptrack.service';

describe('App & EquipTrackService', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('cria a aplicação', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('protege o painel e libera as telas de acesso para anônimos', () => {
    const porCaminho = Object.fromEntries(routes.map((r) => [r.path, r]));
    expect(porCaminho['painel'].canActivate?.length).toBe(1);
    expect(porCaminho['login'].canActivate?.length).toBe(1);
    expect(porCaminho[''].redirectTo).toBe('painel');
  });

  it('inicia o EquipTrackService com equipamentos e solicitações padrão', () => {
    const service = TestBed.inject(EquipTrackService);
    expect(service.equipamentos().length).toBe(6);
    expect(service.solicitacoes().length).toBe(8);
    expect(service.perfil()).toBe('operador');
    expect(service.abaAtiva()).toBe('PAINEL');
  });

  it('troca as abas de navegação quando o perfil muda', () => {
    const service = TestBed.inject(EquipTrackService);
    service.definirPerfil('rafael');
    expect(service.ehOperador()).toBe(false);
    expect(service.abaAtiva()).toBe('DISPONÍVEIS');
    expect(service.nomeUsuarioAtual()).toBe('Rafael Lima');
  });

  it('mostra o nome do usuário autenticado para o operador', () => {
    const service = TestBed.inject(EquipTrackService);
    service.nomeLogado.set('Ana Operadora');
    expect(service.nomeExibicao()).toBe('Ana Operadora');
    expect(service.iniciaisUsuarioAtual()).toBe('AO');
  });

  it('cadastra equipamento e registra evento no histórico', () => {
    const service = TestBed.inject(EquipTrackService);
    service.cadastrarEquipamento({
      patrimonio: 'NB-0003',
      descricao: 'Notebook MacBook Pro',
      categoria: 'Notebook',
      condicao: 'OTIMA',
      situacao: 'DISPONIVEL',
    });
    expect(service.buscarEquipamento('NB-0003')?.descricao).toBe('Notebook MacBook Pro');
    expect(service.historico()['NB-0003']?.length).toBe(1);
  });
});
