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
