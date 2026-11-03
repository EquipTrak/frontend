import { computed, inject, Injectable, signal } from '@angular/core';
import {
  AbaNavegacao,
  CondicaoEquipamento,
  Equipamento,
  EQUIPAMENTOS_INICIAIS,
  EstadoTela,
  EventoHistorico,
  formatarValorBadge,
  HISTORICO_INICIAL,
  NOMES_PERFIL,
  PerfilUsuario,
  Solicitacao,
  SOLICITACOES_INICIAIS,
} from '../models/equiptrack.models';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root',
})
export class EquipTrackService {
  private readonly toast = inject(ToastService);

  readonly perfil = signal<PerfilUsuario>('operador');
  readonly estado = signal<EstadoTela>('normal');
  readonly equipamentos = signal<Equipamento[]>([...EQUIPAMENTOS_INICIAIS]);
  readonly solicitacoes = signal<Solicitacao[]>([...SOLICITACOES_INICIAIS]);
  readonly historico = signal<Record<string, EventoHistorico[]>>({ ...HISTORICO_INICIAL });
  readonly abaAtiva = signal<AbaNavegacao>('PAINEL');
  readonly patrimonioHistoricoAberto = signal<string | null>(null);

  readonly ehOperador = computed(() => this.perfil() === 'operador');
  readonly nomeUsuarioAtual = computed(() => NOMES_PERFIL[this.perfil()]);
  readonly iniciaisUsuarioAtual = computed(() =>
    this.nomeUsuarioAtual()
      .split(' ')
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
        valor: equips.filter((e) => e.situacao === 'INDISPONIVEL').length,
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
    return this.historico()[pat] ?? [];
  });

  definirPerfil(novoPerfil: PerfilUsuario): void {
    this.perfil.set(novoPerfil);
    this.abaAtiva.set(novoPerfil === 'operador' ? 'PAINEL' : 'DISPONÍVEIS');
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

  abrirHistorico(patrimonio: string | null): void {
    this.patrimonioHistoricoAberto.set(patrimonio);
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

  cadastrarEquipamento(novo: Equipamento): void {
    this.equipamentos.update((lista) => [novo, ...lista]);
    this.adicionarEvento(novo.patrimonio, {
      usuario: 'Marina Souza',
      tipo: 'Equipamento cadastrado',
      observacao: 'Situação inicial definida.',
      badge: novo.situacao,
    });
    this.toast.success(
      `${novo.patrimonio} cadastrado como ${formatarValorBadge(novo.situacao).toUpperCase()}.`,
    );
  }

  aprovarSolicitacao(solicitacao: Solicitacao): void {
    this.atualizarSolicitacao(solicitacao.id, { status: 'APROVADA' });
    this.adicionarEvento(solicitacao.patrimonio, {
      usuario: 'Marina Souza',
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
      usuario: 'Marina Souza',
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
      situacao: condicao === 'COM_AVARIA' ? 'INDISPONIVEL' : 'DISPONIVEL',
      condicao,
    });
    this.adicionarEvento(solicitacao.patrimonio, {
      usuario: 'Marina Souza',
      tipo: 'Devolução registrada',
      observacao: observacao.trim() || 'Sem observações.',
      badge: 'DEVOLVIDO',
    });
    this.adicionarEvento(solicitacao.patrimonio, {
      usuario: 'Marina Souza',
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
    return new Date()
      .toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      .replace(',', '');
  }

  private formatarDataHoraIso(valorIso: string): string {
    return new Date(valorIso)
      .toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      .replace(',', '');
  }
}

