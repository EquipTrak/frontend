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
