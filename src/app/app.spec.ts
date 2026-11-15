import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { UsuarioApi } from './models/api.models';
import { AuthService } from './services/auth.service';
import { EquipTrackService } from './services/equiptrack.service';

const SOLICITANTE: UsuarioApi = {
  id: 3,
  nome: 'Rafael Lima',
  email: 'rafael.lima@equiptrack.local',
  perfil: 'SOLICITANTE',
};

describe('App & EquipTrackService', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should start with no equipment until the catalog is loaded from the API', () => {
    const service = TestBed.inject(EquipTrackService);
    expect(service.equipamentos().length).toBe(0);
    expect(service.categorias().length).toBe(0);
    expect(service.solicitacoes().length).toBe(0);
    expect(service.perfil()).toBeNull();
    expect(service.abaAtiva()).toBe('PAINEL');
  });

  it('should follow the logged-in user profile and name', () => {
    const service = TestBed.inject(EquipTrackService);
    TestBed.inject(AuthService).usuario.set(SOLICITANTE);
    service.abrirAbaInicial();
    expect(service.ehOperador()).toBe(false);
    expect(service.abaAtiva()).toBe('DISPONÍVEIS');
    expect(service.nomeUsuarioAtual()).toBe('Rafael Lima');
    expect(service.iniciaisUsuarioAtual()).toBe('RL');
    expect(service.rotuloPerfilAtual()).toBe('Solicitante');
  });

  it('should use the operator view for the other profiles', () => {
    const service = TestBed.inject(EquipTrackService);
    TestBed.inject(AuthService).usuario.set({ ...SOLICITANTE, perfil: 'ADMINISTRADOR' });
    service.abrirAbaInicial();
    expect(service.ehOperador()).toBe(true);
    expect(service.abaAtiva()).toBe('PAINEL');
  });
});
