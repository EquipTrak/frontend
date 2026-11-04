import { HttpErrorResponse } from '@angular/common/http';

/** Formato de erro padrão da API (ver docs do backend). */
export interface ErroResposta {
  timestamp: string;
  status: number;
  erro: string;
  mensagem: string;
  detalhes?: string[];
}

export function mensagemDeErro(erro: unknown): string {
  if (!(erro instanceof HttpErrorResponse)) return 'Ocorreu um erro inesperado. Tente novamente.';
  if (erro.status === 0) return 'Não foi possível conectar ao servidor. Verifique sua conexão.';

  const corpo = erro.error as Partial<ErroResposta> | null;
  if (erro.status === 400 || erro.status === 401) {
    return (
      corpo?.mensagem ?? (erro.status === 401 ? 'E-mail ou senha inválidos.' : 'Dados inválidos.')
    );
  }
  if (erro.status === 403) return 'Você não tem permissão para esta ação.';
  return 'Erro no servidor. Tente novamente em instantes.';
}
