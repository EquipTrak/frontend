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

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should initialize EquipTrackService with default equipments and requests', () => {
    const service = TestBed.inject(EquipTrackService);
    expect(service.equipamentos().length).toBe(6);
    expect(service.solicitacoes().length).toBe(8);
    expect(service.perfil()).toBe('operador');
    expect(service.abaAtiva()).toBe('PAINEL');
  });

  it('should switch navigation tabs when profile changes', () => {
    const service = TestBed.inject(EquipTrackService);
    service.definirPerfil('rafael');
    expect(service.ehOperador()).toBe(false);
    expect(service.abaAtiva()).toBe('DISPONÍVEIS');
    expect(service.nomeUsuarioAtual()).toBe('Rafael Lima');
  });

  it('should register new equipment and add history event', () => {
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
