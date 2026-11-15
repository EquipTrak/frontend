// Condição e situação seguem os valores do DER e da API (ver backend/docs/integracao-frontend.md).
export type CondicaoEquipamento = 'OTIMA' | 'BOA' | 'REGULAR' | 'COM_AVARIA';

export type SituacaoEquipamento = 'DISPONIVEL' | 'EMPRESTADO' | 'DANIFICADO' | 'EM_MANUTENCAO';

/** Situações somadas no indicador e na aba "Indisponíveis". */
export const SITUACOES_INDISPONIVEIS: SituacaoEquipamento[] = ['DANIFICADO', 'EM_MANUTENCAO'];

export type StatusSolicitacao =
  | 'PENDENTE'
  | 'APROVADA'
  | 'RETIRADO'
  | 'DEVOLVIDO'
  | 'REJEITADA'
  | 'CANCELADA'
  | 'ATRASADO';

export type BadgeValor = CondicaoEquipamento | SituacaoEquipamento | StatusSolicitacao;

export type TomSemantica = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

export type NomeIcone =
  | 'check'
  | 'circle-slash'
  | 'circle-x'
  | 'clock'
  | 'loader'
  | 'rotate-ccw'
  | 'triangle-alert'
  | 'x'
  | 'chevron-down'
  | 'history'
  | 'log-out'
  | 'menu'
  | 'plus'
  | 'search';

export type EstadoTela = 'normal' | 'carregando' | 'vazio' | 'erro';

export type AbaNavegacao = 'PAINEL' | 'SOLICITAÇÕES' | 'DISPONÍVEIS' | 'MINHAS SOLICITAÇÕES';

export type AbaFilaSolicitacoes = 'Pendentes' | 'Aprovadas' | 'Em uso' | 'Atrasados';

export type AbaSituacaoEquipamento = 'Disponíveis' | 'Emprestados' | 'Indisponíveis';

export interface Equipamento {
  id: number;
  patrimonio: string;
  descricao: string;
  /** Nome da categoria, usado na exibição e nos filtros. */
  categoria: string;
  categoriaId: number;
  condicao: CondicaoEquipamento;
  situacao: SituacaoEquipamento;
  prazoMaxHoras: number;
}

export interface Solicitacao {
  id: string;
  /** Número da solicitação na API. Os dados de demonstração da fila do operador ainda não têm. */
  numero?: number;
  solicitante: string;
  patrimonio: string;
  /** Descrição do equipamento vinda da API; sem ela, a tela procura no catálogo carregado. */
  descricaoEquipamento?: string;
  /** Número do empréstimo, depois da retirada. */
  emprestimoId?: number;
  inicio: string;
  fim: string;
  status: StatusSolicitacao;
  motivo?: string;
}

export interface EventoHistorico {
  data: string;
  usuario: string;
  tipo: string;
  observacao: string;
  /** Selo opcional: alguns eventos da API não mudam situação nem condição. */
  badge?: BadgeValor;
}

export interface ConfiguracaoBadge {
  texto: string;
  tom: TomSemantica;
  icone?: NomeIcone;
}

export const FILA_ABAS_STATUS: Record<AbaFilaSolicitacoes, StatusSolicitacao[]> = {
  Pendentes: ['PENDENTE'],
  Aprovadas: ['APROVADA'],
  'Em uso': ['RETIRADO'],
  Atrasados: ['ATRASADO'],
};

export const FILA_ABAS_SITUACAO: Record<AbaSituacaoEquipamento, SituacaoEquipamento[]> = {
  Disponíveis: ['DISPONIVEL'],
  Emprestados: ['EMPRESTADO'],
  Indisponíveis: SITUACOES_INDISPONIVEIS,
};

export const BADGE_CONFIG: Record<BadgeValor, ConfiguracaoBadge> = {
  DISPONIVEL: { texto: 'Disponível', tom: 'success', icone: 'check' },
  EMPRESTADO: { texto: 'Emprestado', tom: 'info', icone: 'rotate-ccw' },
  DANIFICADO: { texto: 'Danificado', tom: 'danger', icone: 'circle-slash' },
  EM_MANUTENCAO: { texto: 'Em manutenção', tom: 'neutral', icone: 'circle-slash' },
  PENDENTE: { texto: 'Pendente', tom: 'warning', icone: 'clock' },
  APROVADA: { texto: 'Aprovada', tom: 'warning', icone: 'check' },
  RETIRADO: { texto: 'Retirado', tom: 'info', icone: 'rotate-ccw' },
  DEVOLVIDO: { texto: 'Devolvido', tom: 'success', icone: 'check' },
  REJEITADA: { texto: 'Rejeitada', tom: 'danger', icone: 'x' },
  CANCELADA: { texto: 'Cancelada', tom: 'neutral', icone: 'x' },
  ATRASADO: { texto: 'Atrasado', tom: 'danger', icone: 'triangle-alert' },
  // Selos de condição: estritamente sem ícones ou símbolos conforme Guia de Design
  OTIMA: { texto: 'Ótima', tom: 'success' },
  BOA: { texto: 'Boa', tom: 'warning' },
  REGULAR: { texto: 'Regular', tom: 'warning' },
  COM_AVARIA: { texto: 'Com avaria', tom: 'danger' },
};

export function formatarValorBadge(valor: BadgeValor | string): string {
  return BADGE_CONFIG[valor as BadgeValor]?.texto ?? valor;
}
