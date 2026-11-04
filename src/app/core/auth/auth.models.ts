export type Perfil = 'SOLICITANTE' | 'OPERADOR' | 'ADMINISTRADOR' | 'ENCARREGADO';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
}

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
  tipo: string;
  expiraEmSegundos: number;
  usuario: Usuario;
}

/** Sessão persistida no navegador. `expiraEm` é um timestamp em milissegundos. */
export interface Sessao {
  token: string;
  expiraEm: number;
  usuario: Usuario;
}
