export type CategoriaEquipamento = 'Notebook' | 'Projetor' | 'Câmera' | 'Kit' | 'Adaptador';

export type CondicaoEquipamento = 'OTIMA' | 'BOA' | 'COM_AVARIA';

export type SituacaoEquipamento = 'DISPONIVEL' | 'EMPRESTADO' | 'INDISPONIVEL';

export type StatusSolicitacao =
  'PENDENTE' | 'APROVADA' | 'RETIRADO' | 'DEVOLVIDO' | 'REJEITADA' | 'ATRASADO';

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

export type PerfilUsuario = 'operador' | 'rafael' | 'beatriz';

export type EstadoTela = 'normal' | 'carregando' | 'vazio' | 'erro';

export type AbaNavegacao = 'PAINEL' | 'SOLICITAÇÕES' | 'DISPONÍVEIS' | 'MINHAS SOLICITAÇÕES';

export type AbaFilaSolicitacoes = 'Pendentes' | 'Aprovadas' | 'Em uso' | 'Atrasados';

export type AbaSituacaoEquipamento = 'Disponíveis' | 'Emprestados' | 'Indisponíveis';

export interface Equipamento {
  patrimonio: string;
  descricao: string;
  categoria: CategoriaEquipamento | string;
  condicao: CondicaoEquipamento;
  situacao: SituacaoEquipamento;
}

export interface Solicitacao {
  id: string;
  solicitante: string;
  patrimonio: string;
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
  badge: BadgeValor;
}

export interface ConfiguracaoBadge {
  texto: string;
  tom: TomSemantica;
  icone?: NomeIcone;
}

export const CATEGORIAS: CategoriaEquipamento[] = [
  'Notebook',
  'Projetor',
  'Câmera',
  'Kit',
  'Adaptador',
];

export const NOMES_PERFIL: Record<PerfilUsuario, string> = {
  operador: 'Marina Souza',
  rafael: 'Rafael Lima',
  beatriz: 'Beatriz Alves',
};

export const FILA_ABAS_STATUS: Record<AbaFilaSolicitacoes, StatusSolicitacao[]> = {
  Pendentes: ['PENDENTE'],
  Aprovadas: ['APROVADA'],
  'Em uso': ['RETIRADO'],
  Atrasados: ['ATRASADO'],
};

export const FILA_ABAS_SITUACAO: Record<AbaSituacaoEquipamento, SituacaoEquipamento> = {
  Disponíveis: 'DISPONIVEL',
  Emprestados: 'EMPRESTADO',
  Indisponíveis: 'INDISPONIVEL',
};

export const BADGE_CONFIG: Record<BadgeValor, ConfiguracaoBadge> = {
  DISPONIVEL: { texto: 'Disponível', tom: 'success', icone: 'check' },
  EMPRESTADO: { texto: 'Emprestado', tom: 'info', icone: 'rotate-ccw' },
  INDISPONIVEL: { texto: 'Indisponível', tom: 'neutral', icone: 'circle-slash' },
  PENDENTE: { texto: 'Pendente', tom: 'warning', icone: 'clock' },
  APROVADA: { texto: 'Aprovada', tom: 'warning', icone: 'check' },
  RETIRADO: { texto: 'Retirado', tom: 'info', icone: 'rotate-ccw' },
  DEVOLVIDO: { texto: 'Devolvido', tom: 'success', icone: 'check' },
  REJEITADA: { texto: 'Rejeitada', tom: 'danger', icone: 'x' },
  ATRASADO: { texto: 'Atrasado', tom: 'danger', icone: 'triangle-alert' },
  // Selos de condição: estritamente sem ícones ou símbolos conforme Guia de Design
  OTIMA: { texto: 'Ótima', tom: 'success' },
  BOA: { texto: 'Boa', tom: 'warning' },
  COM_AVARIA: { texto: 'Com avaria', tom: 'danger' },
};

export function formatarValorBadge(valor: BadgeValor | string): string {
  return BADGE_CONFIG[valor as BadgeValor]?.texto ?? valor;
}

export const EQUIPAMENTOS_INICIAIS: Equipamento[] = [
  {
    patrimonio: 'NB-0001',
    descricao: 'Notebook Dell Latitude',
    categoria: 'Notebook',
    condicao: 'BOA',
    situacao: 'DISPONIVEL',
  },
  {
    patrimonio: 'NB-0002',
    descricao: 'Notebook Lenovo ThinkPad',
    categoria: 'Notebook',
    condicao: 'OTIMA',
    situacao: 'EMPRESTADO',
  },
  {
    patrimonio: 'PJ-0001',
    descricao: 'Projetor Epson',
    categoria: 'Projetor',
    condicao: 'BOA',
    situacao: 'DISPONIVEL',
  },
  {
    patrimonio: 'CM-0001',
    descricao: 'Câmera Canon',
    categoria: 'Câmera',
    condicao: 'COM_AVARIA',
    situacao: 'INDISPONIVEL',
  },
  {
    patrimonio: 'KT-0001',
    descricao: 'Kit tripé e iluminação',
    categoria: 'Kit',
    condicao: 'OTIMA',
    situacao: 'DISPONIVEL',
  },
  {
    patrimonio: 'AD-0001',
    descricao: 'Adaptador HDMI',
    categoria: 'Adaptador',
    condicao: 'BOA',
    situacao: 'DISPONIVEL',
  },
];

export const SOLICITACOES_INICIAIS: Solicitacao[] = [
  {
    id: 'S-101',
    solicitante: 'Rafael Lima',
    patrimonio: 'PJ-0001',
    inicio: '05/10/2026 09:00',
    fim: '05/10/2026 12:00',
    status: 'PENDENTE',
  },
  {
    id: 'S-102',
    solicitante: 'Rafael Lima',
    patrimonio: 'KT-0001',
    inicio: '06/10/2026 14:00',
    fim: '07/10/2026 18:00',
    status: 'APROVADA',
  },
  {
    id: 'S-103',
    solicitante: 'Rafael Lima',
    patrimonio: 'NB-0002',
    inicio: '01/10/2026 08:00',
    fim: '04/10/2026 18:00',
    status: 'RETIRADO',
  },
  {
    id: 'S-104',
    solicitante: 'Rafael Lima',
    patrimonio: 'AD-0001',
    inicio: '20/09/2026 10:00',
    fim: '21/09/2026 10:00',
    status: 'DEVOLVIDO',
  },
  {
    id: 'S-105',
    solicitante: 'Rafael Lima',
    patrimonio: 'CM-0001',
    inicio: '03/10/2026 09:00',
    fim: '03/10/2026 17:00',
    status: 'REJEITADA',
    motivo: 'Câmera em avaliação técnica após avaria.',
  },
  {
    id: 'S-106',
    solicitante: 'Beatriz Alves',
    patrimonio: 'NB-0001',
    inicio: '25/09/2026 09:00',
    fim: '29/09/2026 18:00',
    status: 'ATRASADO',
  },
  {
    id: 'S-107',
    solicitante: 'Beatriz Alves',
    patrimonio: 'AD-0001',
    inicio: '08/10/2026 09:00',
    fim: '08/10/2026 12:00',
    status: 'PENDENTE',
  },
  {
    id: 'S-108',
    solicitante: 'Beatriz Alves',
    patrimonio: 'NB-0002',
    inicio: '05/10/2026 08:00',
    fim: '06/10/2026 18:00',
    status: 'APROVADA',
  },
];

export const HISTORICO_INICIAL: Record<string, EventoHistorico[]> = {
  'NB-0002': [
    {
      data: '01/10/2026 08:12',
      usuario: 'Marina Souza',
      tipo: 'Retirada registrada',
      observacao: 'Entregue com carregador e mochila.',
      badge: 'RETIRADO',
    },
    {
      data: '30/09/2026 16:40',
      usuario: 'Marina Souza',
      tipo: 'Solicitação aprovada',
      observacao: 'Período confirmado.',
      badge: 'APROVADA',
    },
    {
      data: '30/09/2026 10:05',
      usuario: 'Rafael Lima',
      tipo: 'Solicitação criada',
      observacao: 'Uso em apresentação para cliente.',
      badge: 'PENDENTE',
    },
    {
      data: '18/09/2026 17:20',
      usuario: 'Marina Souza',
      tipo: 'Devolução registrada',
      observacao: 'Devolvido sem avarias.',
      badge: 'DEVOLVIDO',
    },
    {
      data: '18/09/2026 17:21',
      usuario: 'Marina Souza',
      tipo: 'Condição atualizada',
      observacao: 'Revisão concluída, teclado limpo.',
      badge: 'OTIMA',
    },
    {
      data: '15/09/2026 09:00',
      usuario: 'Marina Souza',
      tipo: 'Retirada registrada',
      observacao: 'Retirado por Beatriz Alves.',
      badge: 'RETIRADO',
    },
    {
      data: '01/09/2026 11:30',
      usuario: 'Marina Souza',
      tipo: 'Equipamento cadastrado',
      observacao: 'Situação inicial definida.',
      badge: 'DISPONIVEL',
    },
  ],
};
