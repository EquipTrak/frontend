import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { errosDoCadastro } from '../components/equipamentos-operador/equipamentos-operador.component';
import {
  CategoriaApi,
  EquipamentoApi,
  EventoHistoricoApi,
  NovoEquipamentoApi,
} from '../models/api.models';
import { AuthService } from './auth.service';
import { EquipTrackService, paraEventoHistorico } from './equiptrack.service';

const CATEGORIAS: CategoriaApi[] = [
  { id: 1, nome: 'Notebook' },
  { id: 2, nome: 'Projetor' },
];

function equipamentoApi(parcial: Partial<EquipamentoApi>): EquipamentoApi {
  return {
    id: 10,
    patrimonio: 'NB-0001',
    descricao: 'Notebook Dell Latitude',
    categoria: CATEGORIAS[0],
    marca: null,
    modelo: null,
    numeroSerie: null,
    condicao: 'BOA',
    situacao: 'DISPONIVEL',
    prazoMaxHoras: 72,
    ...parcial,
  };
}

const NOVO: NovoEquipamentoApi = {
  patrimonio: 'NB-0003',
  categoriaId: 1,
  descricao: 'Notebook HP',
  condicao: 'REGULAR',
  situacao: 'DISPONIVEL',
  prazoMaxHoras: 24,
};

describe('EquipTrackService (catálogo de equipamentos)', () => {
  let service: EquipTrackService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EquipTrackService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function carregar(equipamentos: EquipamentoApi[]): Promise<void> {
    const carregamento = service.carregarCatalogo();
    expect(service.estado()).toBe('carregando');
    http.expectOne('/api/categorias').flush(CATEGORIAS);
    http.expectOne('/api/equipamentos').flush(equipamentos);
    await carregamento;
  }

  it('carrega categorias e equipamentos da API', async () => {
    await carregar([
      equipamentoApi({}),
      equipamentoApi({
        id: 11,
        patrimonio: 'CM-0001',
        categoria: { id: 3, nome: 'Câmera' },
        condicao: 'COM_AVARIA',
        situacao: 'DANIFICADO',
      }),
    ]);

    expect(service.estado()).toBe('normal');
    expect(service.categorias()).toEqual(CATEGORIAS);
    expect(service.buscarEquipamento('NB-0001')).toEqual({
      id: 10,
      patrimonio: 'NB-0001',
      descricao: 'Notebook Dell Latitude',
      categoria: 'Notebook',
      categoriaId: 1,
      condicao: 'BOA',
      situacao: 'DISPONIVEL',
      prazoMaxHoras: 72,
    });
  });

  it('soma DANIFICADO e EM_MANUTENCAO no indicador de indisponíveis', async () => {
    await carregar([
      equipamentoApi({ id: 1, patrimonio: 'A-1', situacao: 'DANIFICADO' }),
      equipamentoApi({ id: 2, patrimonio: 'A-2', situacao: 'EM_MANUTENCAO' }),
      equipamentoApi({ id: 3, patrimonio: 'A-3', situacao: 'DISPONIVEL' }),
    ]);

    const indisponiveis = service.indicadores().find((i) => i.rotulo === 'INDISPONÍVEIS');
    expect(indisponiveis?.valor).toBe(2);
  });

  it('mostra o estado de erro quando a API falha', async () => {
    const carregamento = service.carregarCatalogo();
    http.expectOne('/api/categorias').flush(CATEGORIAS);
    http.expectOne('/api/equipamentos').flush(null, { status: 500, statusText: 'Erro' });
    await carregamento;

    expect(service.estado()).toBe('erro');
    expect(service.equipamentos()).toEqual([]);
  });

  it('cadastra pela API e insere o equipamento na lista, em ordem de patrimônio', async () => {
    await carregar([equipamentoApi({}), equipamentoApi({ id: 12, patrimonio: 'PJ-0001' })]);

    const cadastro = service.cadastrarEquipamento(NOVO);
    const requisicao = http.expectOne('/api/equipamentos');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual(NOVO);
    requisicao.flush(
      equipamentoApi({ id: 13, patrimonio: 'NB-0003', descricao: 'Notebook HP', condicao: 'REGULAR' }),
    );
    const criado = await cadastro;

    expect(criado.id).toBe(13);
    expect(service.equipamentos().map((e) => e.patrimonio)).toEqual(['NB-0001', 'NB-0003', 'PJ-0001']);
    // O evento de cadastro é gravado pelo backend, não mais na tela.
    expect(service.historico()['NB-0003']).toBeUndefined();
  });

  it('repassa o erro do cadastro sem alterar a lista', async () => {
    await carregar([equipamentoApi({})]);

    const cadastro = service.cadastrarEquipamento(NOVO);
    http
      .expectOne('/api/equipamentos')
      .flush(
        { status: 409, mensagem: 'Este patrimônio já está cadastrado.', campos: { patrimonio: 'Este patrimônio já está cadastrado.' } },
        { status: 409, statusText: 'Conflict' },
      );

    await expect(cadastro).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(service.equipamentos().length).toBe(1);
  });
});

describe('EquipTrackService (histórico do equipamento)', () => {
  let service: EquipTrackService;
  let auth: AuthService;
  let http: HttpTestingController;

  const CADASTRO: EventoHistoricoApi = {
    id: 1,
    dataHora: '2026-11-14T15:30:00Z',
    tipo: 'CADASTRO',
    usuario: { id: 2, nome: 'Marina Souza' },
    situacaoAnterior: null,
    situacaoNova: 'DISPONIVEL',
    condicaoAnterior: null,
    condicaoNova: 'BOA',
    observacao: 'Situação inicial definida.',
    emprestimoId: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EquipTrackService);
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    auth.usuario.set({ id: 2, nome: 'Marina Souza', email: 'm@equiptrack.local', perfil: 'OPERADOR' });
  });

  afterEach(() => http.verify());

  it('busca o histórico na API ao abrir a gaveta', async () => {
    service.abrirHistorico('NB-0001');
    expect(service.estadoHistorico()).toBe('carregando');
    http.expectOne('/api/equipamentos/NB-0001/historico').flush([CADASTRO]);
    await Promise.resolve();

    expect(service.estadoHistorico()).toBe('normal');
    expect(service.eventosHistoricoSelecionado()).toEqual([
      {
        data: new Date(CADASTRO.dataHora)
          .toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
          .replace(',', ''),
        usuario: 'Marina Souza',
        tipo: 'Equipamento cadastrado',
        observacao: 'Situação inicial definida.',
        badge: 'DISPONIVEL',
      },
    ]);
  });

  it('mostra erro quando a API falha e permite tentar de novo', async () => {
    service.abrirHistorico('NB-0001');
    http
      .expectOne('/api/equipamentos/NB-0001/historico')
      .flush(null, { status: 500, statusText: 'Erro' });
    await Promise.resolve();
    expect(service.estadoHistorico()).toBe('erro');

    const novaTentativa = service.carregarHistorico();
    http.expectOne('/api/equipamentos/NB-0001/historico').flush([CADASTRO]);
    await novaTentativa;
    expect(service.estadoHistorico()).toBe('normal');
    expect(service.eventosHistoricoSelecionado().length).toBe(1);
  });

  it('ignora a resposta de um equipamento que já não está aberto', async () => {
    service.abrirHistorico('NB-0001');
    const primeira = http.expectOne('/api/equipamentos/NB-0001/historico');
    service.abrirHistorico('PJ-0001');
    const segunda = http.expectOne('/api/equipamentos/PJ-0001/historico');

    segunda.flush([]);
    primeira.flush([CADASTRO]);
    await Promise.resolve();

    expect(service.patrimonioHistoricoAberto()).toBe('PJ-0001');
    expect(service.eventosHistoricoSelecionado()).toEqual([]);
  });

  it('fechar a gaveta limpa os eventos', async () => {
    service.abrirHistorico('NB-0001');
    http.expectOne('/api/equipamentos/NB-0001/historico').flush([CADASTRO]);
    await Promise.resolve();

    service.abrirHistorico(null);
    expect(service.historicoDaApi()).toEqual([]);
    expect(service.estadoHistorico()).toBe('normal');
  });

  it('solicitante não abre o histórico nem chama a API', () => {
    auth.usuario.set({ id: 3, nome: 'Rafael Lima', email: 'r@equiptrack.local', perfil: 'SOLICITANTE' });
    service.abrirHistorico('NB-0001');

    expect(service.patrimonioHistoricoAberto()).toBeNull();
    http.expectNone('/api/equipamentos/NB-0001/historico');
  });
});

describe('paraEventoHistorico', () => {
  const base: EventoHistoricoApi = {
    id: 1,
    dataHora: '2026-11-14T15:30:00Z',
    tipo: 'MUDANCA_CONDICAO',
    usuario: { id: 2, nome: 'Marina Souza' },
    situacaoAnterior: null,
    situacaoNova: null,
    condicaoAnterior: 'BOA',
    condicaoNova: 'REGULAR',
    observacao: null,
    emprestimoId: null,
  };

  it('escolhe o rótulo e o selo de cada tipo de evento', () => {
    expect(paraEventoHistorico(base)).toMatchObject({
      tipo: 'Condição atualizada',
      badge: 'REGULAR',
      observacao: 'Sem observações.',
    });
    expect(paraEventoHistorico({ ...base, tipo: 'RETIRADA' }).badge).toBe('RETIRADO');
    expect(paraEventoHistorico({ ...base, tipo: 'DEVOLUCAO' }).badge).toBe('DEVOLVIDO');
    expect(
      paraEventoHistorico({ ...base, tipo: 'MUDANCA_SITUACAO', situacaoNova: 'EM_MANUTENCAO' }),
    ).toMatchObject({ tipo: 'Situação atualizada', badge: 'EM_MANUTENCAO' });
    expect(
      paraEventoHistorico({ ...base, tipo: 'CORRECAO', condicaoNova: null }).badge,
    ).toBeUndefined();
  });
});

describe('errosDoCadastro', () => {
  it('usa as mensagens por campo de 400 e 409', () => {
    const erro = new HttpErrorResponse({
      status: 409,
      error: { campos: { patrimonio: 'Este patrimônio já está cadastrado.' } },
    });
    expect(errosDoCadastro(erro)).toEqual({ patrimonio: 'Este patrimônio já está cadastrado.' });
  });

  it('explica 403, falta de conexão e erros inesperados', () => {
    expect(errosDoCadastro(new HttpErrorResponse({ status: 403 })).geral).toContain('perfil');
    expect(errosDoCadastro(new HttpErrorResponse({ status: 0 })).geral).toContain('servidor');
    expect(errosDoCadastro(new HttpErrorResponse({ status: 500 })).geral).toContain('Não foi possível');
  });
});
