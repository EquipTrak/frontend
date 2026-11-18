import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { errosDaSolicitacao } from '../components/disponiveis-solicitante/disponiveis-solicitante.component';
import { erroDaDevolucao } from '../components/fila-solicitacoes/fila-solicitacoes.component';
import { errosDoCadastro } from '../components/equipamentos-operador/equipamentos-operador.component';
import { erroDaDecisao } from '../components/fila-solicitacoes/fila-solicitacoes.component';
import { erroDoCancelamento } from '../components/minhas-solicitacoes/minhas-solicitacoes.component';
import {
  CategoriaApi,
  EquipamentoApi,
  EventoHistoricoApi,
  IndicadoresApi,
  NovoEquipamentoApi,
  SolicitacaoApi,
} from '../models/api.models';
import { AuthService } from './auth.service';
import { EquipTrackService, paraEventoHistorico, paraSolicitacao } from './equiptrack.service';

const CATEGORIAS: CategoriaApi[] = [
  { id: 1, nome: 'Notebook' },
  { id: 2, nome: 'Projetor' },
];

const INDICADORES: IndicadoresApi = {
  disponiveis: 3,
  emprestados: 2,
  atrasados: 1,
  indisponiveis: 1,
  total: 6,
};

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
    // Depois do cadastro, os totais do painel são buscados de novo.
    http.expectOne('/api/painel/indicadores').flush(INDICADORES);

    expect(criado.id).toBe(13);
    expect(service.equipamentos().map((e) => e.patrimonio)).toEqual(['NB-0001', 'NB-0003', 'PJ-0001']);
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

describe('EquipTrackService (indicadores do painel)', () => {
  let service: EquipTrackService;
  let auth: AuthService;
  let http: HttpTestingController;

  const valores = () => service.indicadores().map((i) => [i.rotulo, i.valor]);

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EquipTrackService);
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    auth.usuario.set({ id: 2, nome: 'Marina Souza', email: 'm@equiptrack.local', perfil: 'OPERADOR' });
    // Catálogo com um disponível só, para diferenciar dos totais da API.
    const catalogo = service.carregarCatalogo();
    http.expectOne('/api/categorias').flush(CATEGORIAS);
    http.expectOne('/api/equipamentos').flush([equipamentoApi({})]);
    await catalogo;
  });

  afterEach(() => http.verify());

  it('o operador vê os totais da API', async () => {
    const carga = service.carregarIndicadores();
    http.expectOne('/api/painel/indicadores').flush(INDICADORES);
    await carga;

    expect(valores()).toEqual([
      ['DISPONÍVEIS', 3],
      ['EMPRESTADOS', 2],
      ['ATRASADOS', 1],
      ['INDISPONÍVEIS', 1],
    ]);
  });

  it('se a API falhar, conta nas listas carregadas', async () => {
    const carga = service.carregarIndicadores();
    http.expectOne('/api/painel/indicadores').flush(null, { status: 500, statusText: 'Erro' });
    await carga;

    expect(service.indicadoresApi()).toBeNull();
    expect(valores()[0]).toEqual(['DISPONÍVEIS', 1]);
  });

  it('o solicitante não chama a API e vê os totais contados nas listas', async () => {
    auth.usuario.set({ id: 3, nome: 'Rafael Lima', email: 'r@equiptrack.local', perfil: 'SOLICITANTE' });
    await service.carregarIndicadores();

    http.expectNone('/api/painel/indicadores');
    expect(valores()[0]).toEqual(['DISPONÍVEIS', 1]);
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

describe('EquipTrackService (criar solicitação)', () => {
  let service: EquipTrackService;
  let http: HttpTestingController;

  const formatar = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).replace(',', '');

  const CRIADA: SolicitacaoApi = {
    id: 42,
    solicitante: { id: 7, nome: 'Rafael Lima' },
    equipamento: { id: 12, patrimonio: 'PJ-0001', descricao: 'Projetor Epson' },
    dataSolicitacao: '2026-11-15T12:00:00Z',
    inicioPrevisto: '2026-11-20T12:00:00Z',
    fimPrevisto: '2026-11-20T15:00:00Z',
    status: 'PENDENTE',
    motivoRejeicao: null,
    emprestimo: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EquipTrackService);
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).usuario.set({
      id: 3,
      nome: 'Rafael Lima',
      email: 'r@equiptrack.local',
      perfil: 'SOLICITANTE',
    });
  });

  afterEach(() => http.verify());

  async function carregarProjetor(): Promise<void> {
    const carregamento = service.carregarCatalogo();
    http.expectOne('/api/categorias').flush(CATEGORIAS);
    http
      .expectOne('/api/equipamentos')
      .flush([equipamentoApi({ id: 12, patrimonio: 'PJ-0001', prazoMaxHoras: 24 })]);
    await carregamento;
  }

  it('envia o id do equipamento e o período em ISO-8601 e põe a solicitação no topo da lista', async () => {
    await carregarProjetor();
    const projetor = service.buscarEquipamento('PJ-0001')!;
    const antes = service.solicitacoes().length;

    const criacao = service.criarSolicitacao(projetor, '2026-11-20T09:00', '2026-11-20T12:00');
    const requisicao = http.expectOne('/api/solicitacoes');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({
      equipamentoId: 12,
      inicioPrevisto: new Date('2026-11-20T09:00').toISOString(),
      fimPrevisto: new Date('2026-11-20T12:00').toISOString(),
    });
    requisicao.flush(CRIADA);
    const nova = await criacao;

    expect(nova).toEqual({
      id: 'S-42',
      numero: 42,
      solicitante: 'Rafael Lima',
      patrimonio: 'PJ-0001',
      descricaoEquipamento: 'Projetor Epson',
      inicio: formatar(CRIADA.inicioPrevisto),
      fim: formatar(CRIADA.fimPrevisto),
      status: 'PENDENTE',
    });
    expect(service.solicitacoes().length).toBe(antes + 1);
    expect(service.solicitacoes()[0]).toEqual(nova);
    // Pedir não muda a situação do equipamento.
    expect(service.buscarEquipamento('PJ-0001')?.situacao).toBe('DISPONIVEL');
  });

  it('repassa o erro da API sem alterar a lista', async () => {
    await carregarProjetor();
    const antes = service.solicitacoes().length;

    const criacao = service.criarSolicitacao(
      service.buscarEquipamento('PJ-0001')!,
      '2026-11-20T09:00',
      '2026-11-20T12:00',
    );
    http
      .expectOne('/api/solicitacoes')
      .flush(
        { status: 409, campos: { equipamentoId: 'Este equipamento não está disponível.' } },
        { status: 409, statusText: 'Conflict' },
      );

    await expect(criacao).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(service.solicitacoes().length).toBe(antes);
  });

  it('paraSolicitacao leva o motivo da rejeição quando existe', () => {
    expect(
      paraSolicitacao({ ...CRIADA, status: 'REJEITADA', motivoRejeicao: 'Em avaliação técnica.' }),
    ).toMatchObject({ id: 'S-42', status: 'REJEITADA', motivo: 'Em avaliação técnica.' });
  });
});

describe('EquipTrackService (minhas solicitações)', () => {
  let service: EquipTrackService;
  let http: HttpTestingController;

  const solicitacaoApi = (parcial: Partial<SolicitacaoApi>): SolicitacaoApi => ({
    id: 42,
    solicitante: { id: 7, nome: 'Rafael Lima' },
    equipamento: { id: 12, patrimonio: 'PJ-0001', descricao: 'Projetor Epson' },
    dataSolicitacao: '2026-11-15T12:00:00Z',
    inicioPrevisto: '2026-11-20T12:00:00Z',
    fimPrevisto: '2026-11-20T15:00:00Z',
    status: 'PENDENTE',
    motivoRejeicao: null,
    emprestimo: null,
    ...parcial,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EquipTrackService);
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).usuario.set({
      id: 3,
      nome: 'Rafael Lima',
      email: 'r@equiptrack.local',
      perfil: 'SOLICITANTE',
    });
  });

  afterEach(() => http.verify());

  async function carregar(lista: SolicitacaoApi[]): Promise<void> {
    const carregamento = service.carregarSolicitacoes();
    http.expectOne('/api/solicitacoes/minhas').flush(lista);
    await carregamento;
  }

  it('busca a lista do solicitante, na ordem recebida', async () => {
    const carregamento = service.carregarSolicitacoes();
    expect(service.estadoSolicitacoes()).toBe('carregando');
    expect(service.solicitacoes()).toEqual([]);
    http
      .expectOne('/api/solicitacoes/minhas')
      .flush([
        solicitacaoApi({ id: 43, equipamento: { id: 10, patrimonio: 'NB-0001', descricao: 'Notebook Dell' } }),
        solicitacaoApi({ id: 42, status: 'REJEITADA', motivoRejeicao: 'Reservado para aula.' }),
      ]);
    await carregamento;

    expect(service.estadoSolicitacoes()).toBe('normal');
    expect(service.solicitacoes().map((s) => s.id)).toEqual(['S-43', 'S-42']);
    expect(service.solicitacoes()[0]).toMatchObject({
      numero: 43,
      patrimonio: 'NB-0001',
      descricaoEquipamento: 'Notebook Dell',
      status: 'PENDENTE',
    });
    expect(service.solicitacoes()[1]).toMatchObject({
      status: 'REJEITADA',
      motivo: 'Reservado para aula.',
    });
  });

  it('mostra o estado de erro quando a API falha e permite tentar de novo', async () => {
    const carregamento = service.carregarSolicitacoes();
    http.expectOne('/api/solicitacoes/minhas').flush(null, { status: 500, statusText: 'Erro' });
    await carregamento;
    expect(service.estadoSolicitacoes()).toBe('erro');
    expect(service.solicitacoes()).toEqual([]);

    await carregar([solicitacaoApi({})]);
    expect(service.estadoSolicitacoes()).toBe('normal');
    expect(service.solicitacoes().length).toBe(1);
  });

  it('cancela pela API e atualiza o status na lista', async () => {
    await carregar([solicitacaoApi({ id: 43 }), solicitacaoApi({ id: 42 })]);

    const cancelamento = service.cancelarSolicitacao(service.solicitacoes()[1]);
    const requisicao = http.expectOne('/api/solicitacoes/42/cancelamento');
    expect(requisicao.request.method).toBe('POST');
    requisicao.flush(solicitacaoApi({ id: 42, status: 'CANCELADA' }));
    await cancelamento;

    expect(service.solicitacoes().map((s) => s.status)).toEqual(['PENDENTE', 'CANCELADA']);
  });

  it('repassa o erro do cancelamento sem alterar a lista', async () => {
    await carregar([solicitacaoApi({})]);

    const cancelamento = service.cancelarSolicitacao(service.solicitacoes()[0]);
    http
      .expectOne('/api/solicitacoes/42/cancelamento')
      .flush(
        { status: 409, mensagem: 'Só é possível cancelar uma solicitação pendente.' },
        { status: 409, statusText: 'Conflict' },
      );

    await expect(cancelamento).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(service.solicitacoes()[0].status).toBe('PENDENTE');
  });
});

describe('EquipTrackService (fila do operador)', () => {
  let service: EquipTrackService;
  let http: HttpTestingController;

  const solicitacaoApi = (parcial: Partial<SolicitacaoApi>): SolicitacaoApi => ({
    id: 42,
    solicitante: { id: 7, nome: 'Rafael Lima' },
    equipamento: { id: 12, patrimonio: 'PJ-0001', descricao: 'Projetor Epson' },
    dataSolicitacao: '2026-11-15T12:00:00Z',
    inicioPrevisto: '2026-11-20T12:00:00Z',
    fimPrevisto: '2026-11-20T15:00:00Z',
    status: 'PENDENTE',
    motivoRejeicao: null,
    emprestimo: null,
    ...parcial,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EquipTrackService);
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).usuario.set({
      id: 2,
      nome: 'Marina Souza',
      email: 'm@equiptrack.local',
      perfil: 'OPERADOR',
    });
  });

  afterEach(() => http.verify());

  async function carregarFila(lista: SolicitacaoApi[]): Promise<void> {
    const carregamento = service.carregarSolicitacoes();
    http.expectOne('/api/solicitacoes').flush(lista);
    await carregamento;
  }

  it('o operador busca a fila completa', async () => {
    await carregarFila([
      solicitacaoApi({ id: 1 }),
      solicitacaoApi({ id: 2, solicitante: { id: 8, nome: 'Beatriz Alves' }, status: 'APROVADA' }),
    ]);

    expect(service.estadoSolicitacoes()).toBe('normal');
    expect(service.solicitacoes().map((s) => [s.id, s.solicitante, s.status])).toEqual([
      ['S-1', 'Rafael Lima', 'PENDENTE'],
      ['S-2', 'Beatriz Alves', 'APROVADA'],
    ]);
  });

  it('aprova pela API sem corpo e atualiza a lista', async () => {
    await carregarFila([solicitacaoApi({})]);

    const aprovacao = service.aprovarSolicitacao(service.solicitacoes()[0]);
    const requisicao = http.expectOne('/api/solicitacoes/42/aprovacao');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toBeNull();
    requisicao.flush(solicitacaoApi({ status: 'APROVADA' }));
    await aprovacao;

    expect(service.solicitacoes()[0].status).toBe('APROVADA');
  });

  it('rejeita pela API com o motivo', async () => {
    await carregarFila([solicitacaoApi({})]);

    const rejeicao = service.rejeitarSolicitacao(service.solicitacoes()[0], 'Reservado para aula.');
    const requisicao = http.expectOne('/api/solicitacoes/42/rejeicao');
    expect(requisicao.request.body).toEqual({ motivo: 'Reservado para aula.' });
    requisicao.flush(solicitacaoApi({ status: 'REJEITADA', motivoRejeicao: 'Reservado para aula.' }));
    await rejeicao;

    expect(service.solicitacoes()[0]).toMatchObject({
      status: 'REJEITADA',
      motivo: 'Reservado para aula.',
    });
  });

  it('repassa o erro da aprovação sem alterar a lista', async () => {
    await carregarFila([solicitacaoApi({})]);

    const aprovacao = service.aprovarSolicitacao(service.solicitacoes()[0]);
    http
      .expectOne('/api/solicitacoes/42/aprovacao')
      .flush({ status: 409, mensagem: 'Período sobreposto.' }, { status: 409, statusText: 'Conflict' });

    await expect(aprovacao).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(service.solicitacoes()[0].status).toBe('PENDENTE');
  });
});

describe('EquipTrackService (retirada)', () => {
  let service: EquipTrackService;
  let http: HttpTestingController;

  const EMPRESTIMO = {
    id: 9,
    status: 'ATIVO' as const,
    dataRetirada: '2026-11-20T12:05:00Z',
    dataPrevistaDevolucao: '2026-11-20T15:00:00Z',
    dataDevolucao: null,
  };

  const aprovada = (parcial: Partial<SolicitacaoApi> = {}): SolicitacaoApi => ({
    id: 42,
    solicitante: { id: 7, nome: 'Rafael Lima' },
    equipamento: { id: 12, patrimonio: 'PJ-0001', descricao: 'Projetor Epson' },
    dataSolicitacao: '2026-11-15T12:00:00Z',
    inicioPrevisto: '2026-11-20T12:00:00Z',
    fimPrevisto: '2026-11-20T15:00:00Z',
    status: 'APROVADA',
    motivoRejeicao: null,
    emprestimo: null,
    ...parcial,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EquipTrackService);
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).usuario.set({
      id: 2,
      nome: 'Marina Souza',
      email: 'm@equiptrack.local',
      perfil: 'OPERADOR',
    });
  });

  afterEach(() => http.verify());

  it('combina o status da solicitação com o do empréstimo', () => {
    expect(paraSolicitacao(aprovada()).status).toBe('APROVADA');
    expect(paraSolicitacao(aprovada({ emprestimo: EMPRESTIMO }))).toMatchObject({
      status: 'RETIRADO',
      emprestimoId: 9,
    });
    expect(paraSolicitacao(aprovada({ emprestimo: { ...EMPRESTIMO, status: 'ATRASADO' } })).status).toBe(
      'ATRASADO',
    );
    expect(
      paraSolicitacao(aprovada({ emprestimo: { ...EMPRESTIMO, status: 'DEVOLVIDO' } })).status,
    ).toBe('DEVOLVIDO');
  });

  it('registra a retirada pela API, passa a solicitação a RETIRADO e o equipamento a EMPRESTADO', async () => {
    const catalogo = service.carregarCatalogo();
    http.expectOne('/api/categorias').flush(CATEGORIAS);
    http
      .expectOne('/api/equipamentos')
      .flush([equipamentoApi({ id: 12, patrimonio: 'PJ-0001', situacao: 'DISPONIVEL' })]);
    await catalogo;
    const fila = service.carregarSolicitacoes();
    http.expectOne('/api/solicitacoes').flush([aprovada()]);
    await fila;

    const retirada = service.registrarRetirada(service.solicitacoes()[0]);
    const requisicao = http.expectOne('/api/solicitacoes/42/retirada');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toBeNull();
    requisicao.flush(aprovada({ emprestimo: EMPRESTIMO }));
    await retirada;
    http.expectOne('/api/painel/indicadores').flush(INDICADORES);

    expect(service.solicitacoes()[0].status).toBe('RETIRADO');
    expect(service.buscarEquipamento('PJ-0001')?.situacao).toBe('EMPRESTADO');
  });

  it('repassa o erro da retirada sem alterar a lista nem o equipamento', async () => {
    const fila = service.carregarSolicitacoes();
    http.expectOne('/api/solicitacoes').flush([aprovada()]);
    await fila;

    const retirada = service.registrarRetirada(service.solicitacoes()[0]);
    http
      .expectOne('/api/solicitacoes/42/retirada')
      .flush(
        { status: 409, mensagem: 'Este equipamento não está disponível para retirada.' },
        { status: 409, statusText: 'Conflict' },
      );

    await expect(retirada).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(service.solicitacoes()[0].status).toBe('APROVADA');
  });
});

describe('EquipTrackService (devolução)', () => {
  let service: EquipTrackService;
  let http: HttpTestingController;

  const retirada = (status: 'ATIVO' | 'DEVOLVIDO'): SolicitacaoApi => ({
    id: 42,
    solicitante: { id: 7, nome: 'Rafael Lima' },
    equipamento: { id: 12, patrimonio: 'PJ-0001', descricao: 'Projetor Epson' },
    dataSolicitacao: '2026-11-15T12:00:00Z',
    inicioPrevisto: '2026-11-20T12:00:00Z',
    fimPrevisto: '2026-11-20T15:00:00Z',
    status: 'APROVADA',
    motivoRejeicao: null,
    emprestimo: {
      id: 9,
      status,
      dataRetirada: '2026-11-20T12:05:00Z',
      dataPrevistaDevolucao: '2026-11-20T15:00:00Z',
      dataDevolucao: status === 'DEVOLVIDO' ? '2026-11-20T14:00:00Z' : null,
    },
  });

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EquipTrackService);
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).usuario.set({
      id: 2,
      nome: 'Marina Souza',
      email: 'm@equiptrack.local',
      perfil: 'OPERADOR',
    });
    const catalogo = service.carregarCatalogo();
    http.expectOne('/api/categorias').flush(CATEGORIAS);
    http
      .expectOne('/api/equipamentos')
      .flush([equipamentoApi({ id: 12, patrimonio: 'PJ-0001', situacao: 'EMPRESTADO' })]);
    await catalogo;
    const fila = service.carregarSolicitacoes();
    http.expectOne('/api/solicitacoes').flush([retirada('ATIVO')]);
    await fila;
  });

  afterEach(() => http.verify());

  it('envia a condição e a observação para o empréstimo e atualiza lista e equipamento', async () => {
    expect(service.solicitacoes()[0]).toMatchObject({ status: 'RETIRADO', emprestimoId: 9 });

    const devolucao = service.registrarDevolucao(service.solicitacoes()[0], 'REGULAR', '  Risco.  ');
    const requisicao = http.expectOne('/api/emprestimos/9/devolucao');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ condicao: 'REGULAR', observacao: 'Risco.' });
    requisicao.flush(retirada('DEVOLVIDO'));
    await devolucao;
    http.expectOne('/api/painel/indicadores').flush(INDICADORES);

    expect(service.solicitacoes()[0].status).toBe('DEVOLVIDO');
    expect(service.buscarEquipamento('PJ-0001')).toMatchObject({
      situacao: 'DISPONIVEL',
      condicao: 'REGULAR',
    });
  });

  it('com avaria, o equipamento fica DANIFICADO; observação vazia vai como nula', async () => {
    const devolucao = service.registrarDevolucao(service.solicitacoes()[0], 'COM_AVARIA', '   ');
    const requisicao = http.expectOne('/api/emprestimos/9/devolucao');
    expect(requisicao.request.body).toEqual({ condicao: 'COM_AVARIA', observacao: null });
    requisicao.flush(retirada('DEVOLVIDO'));
    await devolucao;
    http.expectOne('/api/painel/indicadores').flush(INDICADORES);

    expect(service.buscarEquipamento('PJ-0001')?.situacao).toBe('DANIFICADO');
  });

  it('repassa o erro da devolução sem alterar lista nem equipamento', async () => {
    const devolucao = service.registrarDevolucao(service.solicitacoes()[0], 'BOA', '');
    http
      .expectOne('/api/emprestimos/9/devolucao')
      .flush(
        { status: 409, mensagem: 'A devolução deste empréstimo já foi registrada.' },
        { status: 409, statusText: 'Conflict' },
      );

    await expect(devolucao).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(service.solicitacoes()[0].status).toBe('RETIRADO');
    expect(service.buscarEquipamento('PJ-0001')?.situacao).toBe('EMPRESTADO');
  });
});

describe('erroDaDevolucao', () => {
  it('lê os erros dos campos da devolução e cai na regra geral nos demais casos', () => {
    expect(
      erroDaDevolucao(
        new HttpErrorResponse({
          status: 400,
          error: { campos: { observacao: 'A observação pode ter até 500 caracteres.' } },
        }),
        'padrão',
      ),
    ).toBe('A observação pode ter até 500 caracteres.');
    expect(
      erroDaDevolucao(
        new HttpErrorResponse({ status: 409, error: { mensagem: 'Já registrada.' } }),
        'padrão',
      ),
    ).toBe('Já registrada.');
    expect(erroDaDevolucao(new HttpErrorResponse({ status: 500 }), 'padrão')).toBe('padrão');
  });
});

describe('erroDaDecisao', () => {
  it('usa o erro do campo motivo no 400 e a mensagem do backend em 409, 404 e 403', () => {
    expect(
      erroDaDecisao(
        new HttpErrorResponse({ status: 400, error: { campos: { motivo: 'Informe o motivo da rejeição.' } } }),
        'padrão',
      ),
    ).toBe('Informe o motivo da rejeição.');
    expect(
      erroDaDecisao(
        new HttpErrorResponse({ status: 409, error: { mensagem: 'Esta solicitação não está mais pendente.' } }),
        'padrão',
      ),
    ).toBe('Esta solicitação não está mais pendente.');
  });

  it('explica falta de conexão e usa o texto padrão nos demais casos', () => {
    expect(erroDaDecisao(new HttpErrorResponse({ status: 0 }), 'padrão')).toContain('servidor');
    expect(erroDaDecisao(new HttpErrorResponse({ status: 500 }), 'padrão')).toBe('padrão');
  });
});

describe('erroDoCancelamento', () => {
  it('usa a mensagem do backend em 409, 404 e 403', () => {
    const erro = new HttpErrorResponse({
      status: 409,
      error: { mensagem: 'Só é possível cancelar uma solicitação pendente.' },
    });
    expect(erroDoCancelamento(erro)).toBe('Só é possível cancelar uma solicitação pendente.');
  });

  it('explica falta de conexão e erros inesperados', () => {
    expect(erroDoCancelamento(new HttpErrorResponse({ status: 0 }))).toContain('servidor');
    expect(erroDoCancelamento(new HttpErrorResponse({ status: 500 }))).toContain('Não foi possível');
  });
});

describe('errosDaSolicitacao', () => {
  it('leva os erros de período para os campos do formulário', () => {
    const erro = new HttpErrorResponse({
      status: 400,
      error: {
        campos: {
          inicioPrevisto: 'O início não pode estar no passado.',
          fimPrevisto: 'O prazo máximo deste equipamento é de 24 horas.',
        },
      },
    });
    expect(errosDaSolicitacao(erro)).toEqual({
      ini: 'O início não pode estar no passado.',
      fim: 'O prazo máximo deste equipamento é de 24 horas.',
    });
  });

  it('mostra como erro geral o que não tem campo no formulário', () => {
    const erro = new HttpErrorResponse({
      status: 409,
      error: { campos: { equipamentoId: 'Você já tem uma solicitação pendente para este equipamento.' } },
    });
    expect(errosDaSolicitacao(erro)).toEqual({
      geral: 'Você já tem uma solicitação pendente para este equipamento.',
    });
  });

  it('usa a mensagem do backend no 403 e explica falta de conexão e erros inesperados', () => {
    expect(
      errosDaSolicitacao(
        new HttpErrorResponse({ status: 403, error: { mensagem: 'Sua matrícula está inativa.' } }),
      ).geral,
    ).toBe('Sua matrícula está inativa.');
    expect(errosDaSolicitacao(new HttpErrorResponse({ status: 0 })).geral).toContain('servidor');
    expect(errosDaSolicitacao(new HttpErrorResponse({ status: 500 })).geral).toContain(
      'Não foi possível',
    );
  });
});
