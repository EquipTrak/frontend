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
  SOLICITACOES_INICIAIS,
} from '../models/equiptrack.models';
import {
  CategoriaApi,
  EquipamentoApi,
  EventoHistoricoApi,
  NovoEquipamentoApi,
  ROTULOS_PERFIL,
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

  // Equipamentos, categorias e histórico vêm da API. As solicitações ainda são dados de
  // demonstração e passam a vir da API nas próximas etapas (ver backend/docs/integracao-frontend.md).
  readonly perfil = computed(() => this.auth.usuario()?.perfil ?? null);
  readonly estado = signal<EstadoTela>('normal');
  readonly categorias = signal<CategoriaApi[]>([]);
  readonly equipamentos = signal<Equipamento[]>([]);
  readonly solicitacoes = signal<Solicitacao[]>([...SOLICITACOES_INICIAIS]);
  /** Eventos das ações que ainda são locais (solicitações, retirada e devolução), por patrimônio. */
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

  aprovarSolicitacao(solicitacao: Solicitacao): void {
    this.atualizarSolicitacao(solicitacao.id, { status: 'APROVADA' });
    this.adicionarEvento(solicitacao.patrimonio, {
      usuario: this.nomeUsuarioAtual(),
      tipo: 'Solicitação aprovada',
      observacao: `Aprovada para ${solicitacao.solicitante}. Aguardando retirada.`,
      badge: 'APROVADA',
    });
    this.toast.success('Solicitação aprovada. Aguardando retirada.');
  }

  rejeitarSolicitacao(solicitacao: Solicitacao, motivo: string): void {
    this.atualizarSolicitacao(solicitacao.id, { status: 'REJEITADA', motivo });
    this.toast.success('Solicitação rejeitada.');
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

  criarSolicitacao(equipamento: Equipamento, inicioIso: string, fimIso: string): void {
    const id = `S-${Math.floor(200 + Math.random() * 800)}`;
    const solicitante = this.nomeUsuarioAtual();
    const inicio = this.formatarDataHoraIso(inicioIso);
    const fim = this.formatarDataHoraIso(fimIso);

    this.solicitacoes.update((lista) => [
      {
        id,
        solicitante,
        patrimonio: equipamento.patrimonio,
        inicio,
        fim,
        status: 'PENDENTE',
      },
      ...lista,
    ]);

    this.adicionarEvento(equipamento.patrimonio, {
      usuario: solicitante,
      tipo: 'Solicitação criada',
      observacao: `Período ${inicio} → ${fim}.`,
      badge: 'PENDENTE',
    });

    this.toast.success('Solicitação enviada! Status: PENDENTE.');
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

  private formatarDataHoraIso(valorIso: string): string {
    return formatarDataHora(new Date(valorIso));
  }
}

