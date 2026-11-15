// Contratos da API do backend (ver backend/docs/autenticacao.md).

export type PerfilApi = 'SOLICITANTE' | 'OPERADOR' | 'ADMINISTRADOR' | 'ENCARREGADO';

export const ROTULOS_PERFIL: Record<PerfilApi, string> = {
  SOLICITANTE: 'Solicitante',
  OPERADOR: 'Operador',
  ADMINISTRADOR: 'Administrador',
  ENCARREGADO: 'Encarregado',
};

export interface UsuarioApi {
  id: number;
  nome: string;
  email: string;
  perfil: PerfilApi;
}

export interface LoginResposta {
  token: string;
  tipo: 'Bearer';
  expiraEm: string;
  usuario: UsuarioApi;
}

/** Formato de todas as respostas de erro do backend. */
export interface ErroApi {
  timestamp: string;
  status: number;
  erro: string;
  mensagem: string;
  caminho: string;
  campos?: Record<string, string>;
}

// Equipamentos e categorias (ver backend/docs/integracao-frontend.md, parte 2).

export interface CategoriaApi {
  id: number;
  nome: string;
}

export interface EquipamentoApi {
  id: number;
  patrimonio: string;
  descricao: string;
  categoria: CategoriaApi;
  marca: string | null;
  modelo: string | null;
  numeroSerie: string | null;
  condicao: 'OTIMA' | 'BOA' | 'REGULAR' | 'COM_AVARIA';
  situacao: 'DISPONIVEL' | 'EMPRESTADO' | 'DANIFICADO' | 'EM_MANUTENCAO';
  prazoMaxHoras: number;
}

/** Corpo de POST /api/equipamentos. */
export interface NovoEquipamentoApi {
  patrimonio: string;
  categoriaId: number;
  descricao: string;
  condicao: EquipamentoApi['condicao'];
  situacao: Exclude<EquipamentoApi['situacao'], 'EMPRESTADO'>;
  prazoMaxHoras: number;
}

// Solicitações de empréstimo (parte 3a).

/** Corpo de POST /api/solicitacoes. As datas vão em ISO-8601 (UTC). */
export interface NovaSolicitacaoApi {
  equipamentoId: number;
  inicioPrevisto: string;
  fimPrevisto: string;
}

/** Empréstimo criado na retirada (parte 4). `ATRASADO` é calculado pelo backend. */
export interface EmprestimoResumoApi {
  id: number;
  status: 'ATIVO' | 'ATRASADO' | 'DEVOLVIDO';
  dataRetirada: string;
  dataPrevistaDevolucao: string;
  dataDevolucao: string | null;
}

/** Corpo de POST /api/emprestimos/{id}/devolucao. */
export interface DevolucaoApi {
  condicao: EquipamentoApi['condicao'];
  observacao: string | null;
}

export interface SolicitacaoApi {
  id: number;
  solicitante: { id: number; nome: string };
  equipamento: { id: number; patrimonio: string; descricao: string };
  dataSolicitacao: string;
  inicioPrevisto: string;
  fimPrevisto: string;
  status: 'PENDENTE' | 'APROVADA' | 'REJEITADA' | 'CANCELADA';
  motivoRejeicao: string | null;
  /** Preenchido depois da retirada. */
  emprestimo: EmprestimoResumoApi | null;
}

// Histórico do equipamento (parte 2b).

export type TipoEventoApi =
  | 'CADASTRO'
  | 'RETIRADA'
  | 'DEVOLUCAO'
  | 'MUDANCA_CONDICAO'
  | 'MUDANCA_SITUACAO'
  | 'MANUTENCAO'
  | 'CORRECAO';

/** Item de GET /api/equipamentos/{patrimonio}/historico, do mais recente para o mais antigo. */
export interface EventoHistoricoApi {
  id: number;
  /** Data e hora em ISO-8601 (UTC). */
  dataHora: string;
  tipo: TipoEventoApi;
  usuario: { id: number; nome: string };
  situacaoAnterior: EquipamentoApi['situacao'] | null;
  situacaoNova: EquipamentoApi['situacao'] | null;
  condicaoAnterior: EquipamentoApi['condicao'] | null;
  condicaoNova: EquipamentoApi['condicao'] | null;
  observacao: string | null;
  emprestimoId: number | null;
}
