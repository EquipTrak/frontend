import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../api.config';
import {
  AbaNavegacao,
  BadgeValor,
  CondicaoEquipamento,
  Equipamento,
  EstadoTela,
  EventoHistorico,
  formatarValorBadge,
  SITUACOES_INDISPONIVEIS,
  Solicitacao,
} from '../models/equiptrack.models';
import {
  CategoriaApi,
  EquipamentoApi,
  EventoHistoricoApi,
  NovaSolicitacaoApi,
  NovoEquipamentoApi,
  ROTULOS_PERFIL,
  SolicitacaoApi,
  TipoEventoApi,
} from '../models/api.models';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

export function paraEquipamento(api: EquipamentoApi): Equipamento {
  return {
    id: api.id,
    patrimonio: api.patrimonio,
    descricao: api.descricao,
    categoria: api.categoria.nome,
    categoriaId: api.categoria.id,
    condicao: api.condicao,
    situacao: api.situacao,
    prazoMaxHoras: api.prazoMaxHoras,
  };
}

const ROTULOS_EVENTO: Record<TipoEventoApi, string> = {
  CADASTRO: 'Equipamento cadastrado',
  RETIRADA: 'Retirada registrada',
  DEVOLUCAO: 'Devolução registrada',
  MUDANCA_CONDICAO: 'Condição atualizada',
  MUDANCA_SITUACAO: 'Situação atualizada',
  MANUTENCAO: 'Manutenção registrada',
  CORRECAO: 'Correção registrada',
};

function formatarDataHora(data: Date): string {
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).replace(',', '');
}

/** Converte uma solicitação da API para o formato das listas: número com prefixo e datas no fuso do navegador. */
export function paraSolicitacao(api: SolicitacaoApi): Solicitacao {
  return {
    id: `S-${api.id}`,
    numero: api.id,
    solicitante: api.solicitante.nome,
    patrimonio: api.equipamento.patrimonio,
    descricaoEquipamento: api.equipamento.descricao,
    inicio: formatarDataHora(new Date(api.inicioPrevisto)),
    fim: formatarDataHora(new Date(api.fimPrevisto)),
    status: api.status,
    ...(api.motivoRejeicao ? { motivo: api.motivoRejeicao } : {}),
  };
}

/** Converte um evento da API para o formato exibido na gaveta de histórico. */
export function paraEventoHistorico(api: EventoHistoricoApi): EventoHistorico {
  let badge: BadgeValor | undefined;
  switch (api.tipo) {
    case 'RETIRADA':
      badge = 'RETIRADO';
      break;
    case 'DEVOLUCAO':
      badge = 'DEVOLVIDO';
      break;
    case 'MUDANCA_CONDICAO':
      badge = api.condicaoNova ?? undefined;
      break;
    default:
      badge = api.situacaoNova ?? api.condicaoNova ?? undefined;
  }
  return {
    data: formatarDataHora(new Date(api.dataHora)),
    usuario: api.usuario.nome,
    tipo: ROTULOS_EVENTO[api.tipo] ?? api.tipo,
    observacao: api.observacao ?? 'Sem observações.',
    badge,
  };
}

@Injectable({
  providedIn: 'root',
})
export class EquipTrackService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  // Equipamentos, categorias, histórico e solicitações usam a API. Retirada e devolução ainda são
  // locais e passam a usar a API na parte 4 (ver backend/docs/integracao-frontend.md).
  readonly perfil = computed(() => this.auth.usuario()?.perfil ?? null);
  readonly estado = signal<EstadoTela>('normal');
  readonly categorias = signal<CategoriaApi[]>([]);
  readonly equipamentos = signal<Equipamento[]>([]);
  /** Para o solicitante, as próprias solicitações; para o operador, a fila. As duas vêm da API. */
  readonly solicitacoes = signal<Solicitacao[]>([]);
  readonly estadoSolicitacoes = signal<'normal' | 'carregando' | 'erro'>('normal');
  /** Eventos das ações que ainda são locais (retirada e devolução), por patrimônio. */
  readonly historico = signal<Record<string, EventoHistorico[]>>({});
  /** Eventos do equipamento aberto na gaveta, vindos da API. */
  readonly historicoDaApi = signal<EventoHistorico[]>([]);
  readonly estadoHistorico = signal<'normal' | 'carregando' | 'erro'>('normal');
  readonly abaAtiva = signal<AbaNavegacao>('PAINEL');
  readonly patrimonioHistoricoAberto = signal<string | null>(null);

  // Por enquanto, todo perfil que não é Solicitante usa a visão do Operador.
  readonly ehOperador = computed(() => this.perfil() !== 'SOLICITANTE');
  readonly nomeUsuarioAtual = computed(() => this.auth.usuario()?.nome ?? '');
  readonly rotuloPerfilAtual = computed(() => {
    const perfil = this.perfil();
    return perfil ? ROTULOS_PERFIL[perfil] : '';
  });
  readonly iniciaisUsuarioAtual = computed(() =>
    this.nomeUsuarioAtual()
      .split(' ')
      .filter(Boolean)
      .map((parte) => parte[0])
      .join(''),
  );

  readonly linksNavegacao = computed<AbaNavegacao[]>(() =>
    this.ehOperador() ? ['PAINEL', 'SOLICITAÇÕES'] : ['DISPONÍVEIS', 'MINHAS SOLICITAÇÕES'],
  );

  readonly indicadores = computed(() => {
    const equips = this.equipamentos();
    const sols = this.solicitacoes();
    return [
      {
        rotulo: 'DISPONÍVEIS',
        valor: equips.filter((e) => e.situacao === 'DISPONIVEL').length,
        corBarra: 'bg-success',
        destaquePerigo: false,
      },
      {
        rotulo: 'EMPRESTADOS',
        valor: equips.filter((e) => e.situacao === 'EMPRESTADO').length,
        corBarra: 'bg-info',
        destaquePerigo: false,
      },
      {
        rotulo: 'ATRASADOS',
        valor: sols.filter((s) => s.status === 'ATRASADO').length,
        corBarra: 'bg-danger',
        destaquePerigo: true,
      },
      {
        rotulo: 'INDISPONÍVEIS',
        valor: equips.filter((e) => SITUACOES_INDISPONIVEIS.includes(e.situacao)).length,
        corBarra: 'bg-neutral',
        destaquePerigo: false,
      },
    ];
  });

  readonly equipamentoHistoricoSelecionado = computed(() => {
    const pat = this.patrimonioHistoricoAberto();
    if (!pat) return null;
    return this.buscarEquipamento(pat) ?? null;
  });

  readonly eventosHistoricoSelecionado = computed<EventoHistorico[]>(() => {
    const pat = this.patrimonioHistoricoAberto();
    if (!pat) return [];
    // Os eventos locais são desta sessão, portanto mais recentes que os já salvos no backend.
    return [...(this.historico()[pat] ?? []), ...this.historicoDaApi()];
  });

  abrirAbaInicial(): void {
    this.abaAtiva.set(this.ehOperador() ? 'PAINEL' : 'DISPONÍVEIS');
  }

  definirEstado(novoEstado: EstadoTela): void {
    this.estado.set(novoEstado);
  }

  irParaAba(aba: AbaNavegacao): void {
    this.abaAtiva.set(aba);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /** Abre a gaveta de histórico (ou fecha, com null). Só a visão do operador tem histórico (RF15). */
  abrirHistorico(patrimonio: string | null): void {
    if (patrimonio && !this.ehOperador()) return;
    this.patrimonioHistoricoAberto.set(patrimonio);
    this.historicoDaApi.set([]);
    if (patrimonio) {
      void this.carregarHistorico();
    } else {
      this.estadoHistorico.set('normal');
    }
  }

  /** Busca na API o histórico do equipamento aberto na gaveta. */
  async carregarHistorico(): Promise<void> {
    const patrimonio = this.patrimonioHistoricoAberto();
    if (!patrimonio) return;
    this.estadoHistorico.set('carregando');
    try {
      const eventos = await firstValueFrom(
        this.http.get<EventoHistoricoApi[]>(
          `${API_URL}/equipamentos/${encodeURIComponent(patrimonio)}/historico`,
        ),
      );
      // A gaveta pode ter sido fechada ou trocada de equipamento enquanto a resposta vinha.
      if (this.patrimonioHistoricoAberto() !== patrimonio) return;
      this.historicoDaApi.set(eventos.map(paraEventoHistorico));
      this.estadoHistorico.set('normal');
    } catch {
      if (this.patrimonioHistoricoAberto() === patrimonio) {
        this.estadoHistorico.set('erro');
      }
    }
  }

  buscarEquipamento(patrimonio: string): Equipamento | undefined {
    return this.equipamentos().find((e) => e.patrimonio === patrimonio);
  }

  adicionarEvento(patrimonio: string, evento: Omit<EventoHistorico, 'data'>): void {
    const dataAtual = this.formatarDataHoraAtual();
    this.historico.update((mapa) => ({
      ...mapa,
      [patrimonio]: [{ data: dataAtual, ...evento }, ...(mapa[patrimonio] ?? [])],
    }));
  }

  /** Busca categorias e equipamentos na API. Em caso de falha, a tela mostra o estado de erro. */
  async carregarCatalogo(): Promise<void> {
    this.estado.set('carregando');
    try {
      const [categorias, equipamentos] = await Promise.all([
        firstValueFrom(this.http.get<CategoriaApi[]>(`${API_URL}/categorias`)),
        firstValueFrom(this.http.get<EquipamentoApi[]>(`${API_URL}/equipamentos`)),
      ]);
      this.categorias.set(categorias);
      this.equipamentos.set(equipamentos.map(paraEquipamento));
      this.estado.set('normal');
    } catch {
      this.estado.set('erro');
    }
  }

  /**
   * Cadastra pela API. Em caso de erro, a exceção (HttpErrorResponse com ErroApi) segue para a
   * tela, que mostra as mensagens de cada campo.
   */
  async cadastrarEquipamento(dados: NovoEquipamentoApi): Promise<Equipamento> {
    const novo = paraEquipamento(
      await firstValueFrom(this.http.post<EquipamentoApi>(`${API_URL}/equipamentos`, dados)),
    );
    this.equipamentos.update((lista) =>
      [...lista, novo].sort((a, b) => a.patrimonio.localeCompare(b.patrimonio)),
    );
    // O evento de cadastro é gravado pelo backend e aparece ao abrir o histórico.
    this.toast.success(
      `${novo.patrimonio} cadastrado como ${formatarValorBadge(novo.situacao).toUpperCase()}.`,
    );
    return novo;
  }

  /**
   * Aprova pela API (RF09). Aprovar não é retirar (RN03): o equipamento não muda. Em caso de erro, a
   * exceção segue para a tela.
   */
  async aprovarSolicitacao(solicitacao: Solicitacao): Promise<void> {
    await this.decidirSolicitacao(solicitacao, 'aprovacao', null);
    this.toast.success('Solicitação aprovada. Aguardando retirada.');
  }

  /** Rejeita pela API, com o motivo (RF09). Em caso de erro, a exceção segue para a tela. */
  async rejeitarSolicitacao(solicitacao: Solicitacao, motivo: string): Promise<void> {
    await this.decidirSolicitacao(solicitacao, 'rejeicao', { motivo });
    this.toast.success('Solicitação rejeitada.');
  }

  private async decidirSolicitacao(
    solicitacao: Solicitacao,
    acao: 'aprovacao' | 'rejeicao',
    corpo: { motivo: string } | null,
  ): Promise<void> {
    const decidida = paraSolicitacao(
      await firstValueFrom(
        this.http.post<SolicitacaoApi>(
          `${API_URL}/solicitacoes/${solicitacao.numero}/${acao}`,
          corpo,
        ),
      ),
    );
    this.substituirSolicitacao(decidida);
  }

  private substituirSolicitacao(nova: Solicitacao): void {
    this.solicitacoes.update((lista) => lista.map((item) => (item.id === nova.id ? nova : item)));
  }

  registrarRetirada(solicitacao: Solicitacao): void {
    this.atualizarSolicitacao(solicitacao.id, { status: 'RETIRADO' });
    this.atualizarEquipamento(solicitacao.patrimonio, { situacao: 'EMPRESTADO' });
    this.adicionarEvento(solicitacao.patrimonio, {
      usuario: this.nomeUsuarioAtual(),
      tipo: 'Retirada registrada',
      observacao: `Retirado por ${solicitacao.solicitante}.`,
      badge: 'RETIRADO',
    });
    this.toast.success(`${solicitacao.patrimonio} entregue a ${solicitacao.solicitante}.`);
  }

  registrarDevolucao(
    solicitacao: Solicitacao,
    condicao: CondicaoEquipamento,
    observacao: string,
  ): void {
    this.atualizarSolicitacao(solicitacao.id, { status: 'DEVOLVIDO' });
    this.atualizarEquipamento(solicitacao.patrimonio, {
      situacao: condicao === 'COM_AVARIA' ? 'DANIFICADO' : 'DISPONIVEL',
      condicao,
    });
    this.adicionarEvento(solicitacao.patrimonio, {
      usuario: this.nomeUsuarioAtual(),
      tipo: 'Devolução registrada',
      observacao: observacao.trim() || 'Sem observações.',
      badge: 'DEVOLVIDO',
    });
    this.adicionarEvento(solicitacao.patrimonio, {
      usuario: this.nomeUsuarioAtual(),
      tipo: 'Condição atualizada',
      observacao: `Condição na devolução: ${formatarValorBadge(condicao)}.`,
      badge: condicao,
    });
    this.toast.success('Devolução registrada.');
  }

  /**
   * Cria a solicitação pela API (RF08). `inicioLocal` e `fimLocal` vêm do campo datetime-local, no
   * fuso do navegador, e seguem para a API em ISO-8601 (UTC). Em caso de erro, a exceção segue para
   * a tela, que mostra as mensagens de cada campo.
   */
  async criarSolicitacao(
    equipamento: Equipamento,
    inicioLocal: string,
    fimLocal: string,
  ): Promise<Solicitacao> {
    const corpo: NovaSolicitacaoApi = {
      equipamentoId: equipamento.id,
      inicioPrevisto: new Date(inicioLocal).toISOString(),
      fimPrevisto: new Date(fimLocal).toISOString(),
    };
    const nova = paraSolicitacao(
      await firstValueFrom(this.http.post<SolicitacaoApi>(`${API_URL}/solicitacoes`, corpo)),
    );
    // A API lista da mais recente para a mais antiga, então a nova entra no topo.
    this.solicitacoes.update((lista) => [nova, ...lista]);
    this.toast.success('Solicitação enviada! Status: PENDENTE.');
    return nova;
  }

  /**
   * Busca as solicitações na API: para o solicitante, as próprias, da mais recente para a mais antiga
   * (RF18); para o operador, a fila completa, da mais antiga para a mais recente (RF09).
   */
  async carregarSolicitacoes(): Promise<void> {
    this.estadoSolicitacoes.set('carregando');
    // Tira da tela a lista de outra sessão enquanto a resposta não chega.
    this.solicitacoes.set([]);
    const caminho = this.ehOperador() ? 'solicitacoes' : 'solicitacoes/minhas';
    try {
      const lista = await firstValueFrom(
        this.http.get<SolicitacaoApi[]>(`${API_URL}/${caminho}`),
      );
      this.solicitacoes.set(lista.map(paraSolicitacao));
      this.estadoSolicitacoes.set('normal');
    } catch {
      this.estadoSolicitacoes.set('erro');
    }
  }

  /**
   * Cancela pela API a própria solicitação pendente (RF23). Em caso de erro, a exceção segue para a
   * tela, que mostra a mensagem.
   */
  async cancelarSolicitacao(solicitacao: Solicitacao): Promise<void> {
    const cancelada = paraSolicitacao(
      await firstValueFrom(
        this.http.post<SolicitacaoApi>(
          `${API_URL}/solicitacoes/${solicitacao.numero}/cancelamento`,
          null,
        ),
      ),
    );
    this.substituirSolicitacao(cancelada);
    this.toast.success('Solicitação cancelada.');
  }

  private atualizarSolicitacao(id: string, parcial: Partial<Solicitacao>): void {
    this.solicitacoes.update((lista) =>
      lista.map((item) => (item.id === id ? { ...item, ...parcial } : item)),
    );
  }

  private atualizarEquipamento(patrimonio: string, parcial: Partial<Equipamento>): void {
    this.equipamentos.update((lista) =>
      lista.map((item) => (item.patrimonio === patrimonio ? { ...item, ...parcial } : item)),
    );
  }

  private formatarDataHoraAtual(): string {
    return formatarDataHora(new Date());
  }
}

