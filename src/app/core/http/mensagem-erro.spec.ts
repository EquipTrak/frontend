import { HttpErrorResponse } from '@angular/common/http';
import { mensagemDeErro } from './mensagem-erro';

const erro = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });

describe('mensagemDeErro', () => {
  it('usa a mensagem da API em 401 e 400', () => {
    expect(mensagemDeErro(erro(401, { mensagem: 'E-mail ou senha inválidos.' }))).toBe(
      'E-mail ou senha inválidos.',
    );
    expect(mensagemDeErro(erro(400, { mensagem: 'Um ou mais campos são inválidos.' }))).toBe(
      'Um ou mais campos são inválidos.',
    );
  });
  it('tem texto padrão quando a API não envia corpo', () => {
    expect(mensagemDeErro(erro(401))).toBe('E-mail ou senha inválidos.');
    expect(mensagemDeErro(erro(400))).toBe('Dados inválidos.');
  });
  it('trata falta de conexão, 403 e 500', () => {
    expect(mensagemDeErro(erro(0))).toContain('conectar');
    expect(mensagemDeErro(erro(403))).toContain('permissão');
    expect(mensagemDeErro(erro(500))).toContain('servidor');
  });
  it('trata erros que não são HTTP', () => {
    expect(mensagemDeErro(new Error('x'))).toContain('inesperado');
  });
});
