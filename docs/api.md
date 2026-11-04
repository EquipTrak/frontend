# API: contrato entre frontend e backend

- **URL base**: `API_URL`, `http://localhost:8080` por padrão.
- **Formato**: JSON.
- **Autenticação**: `Authorization: Bearer <token>`. O interceptor do front anexa esse cabeçalho automaticamente.
- **Erros**: corpo `{ "mensagem": "texto para o usuário" }`. O front exibe `mensagem` quando ela existe (`core/http/mensagem-erro.ts`).

Legenda de status:
- ✅ **implementado**: existe no backend (`backend-auth`) e o front já usa.
- 📝 **proposto**: o front precisa e o backend ainda vai implementar.

## Autenticação ✅

| Método | Caminho | Corpo | Resposta |
|---|---|---|---|
| POST | `/auth/login` | `{ email, senha }` | `200 { token, tipo, expiraEmSegundos, usuario }` · `401 { mensagem }` |
| POST | `/auth/logout` | — | `204` (revoga o token) |
| GET | `/auth/me` | — | `200 Usuario` |

```ts
Usuario = { id: number; nome: string; email: string; perfil: 'SOLICITANTE' | 'OPERADOR' | 'ADMINISTRADOR' | 'ENCARREGADO' }
```

Regras:
- O 401 do login traz a mesma mensagem para e-mail inexistente, senha errada e usuário inativo.
- Não existe refresh token: quando o token expira, o usuário entra de novo.

## Recuperação de senha 📝 (SCRUM-24)

| Método | Caminho | Corpo | Resposta |
|---|---|---|---|
| POST | `/auth/esqueci-senha` | `{ email }` | `202`, a mesma resposta exista ou não o e-mail |
| POST | `/auth/redefinir-senha` | `{ token, novaSenha }` | `204` · `400 { mensagem }` para token inválido ou expirado |

Recomendações para o backend:
- token de uso único, com validade de 30 a 60 minutos e guardado como hash;
- `novaSenha` com 8 a 72 caracteres (o limite do BCrypt);
- o link enviado por e-mail deve apontar para `<front>/redefinir-senha?token=<token>`.

## Equipamentos 📝

| Método | Caminho | Perfil | Descrição |
|---|---|---|---|
| GET | `/equipamentos?categoria=&situacao=&busca=` | todos | Lista com filtros |
| GET | `/equipamentos/{patrimonio}` | todos | Detalhe |
| POST | `/equipamentos` | operador | Cadastra `{ patrimonio, descricao, categoria, condicao, situacao }` |
| GET | `/equipamentos/{patrimonio}/historico` | operador | Eventos do equipamento, do mais recente para o mais antigo |

```ts
Equipamento = {
  patrimonio: string;          // formato AA-0000, único (ex.: NB-0001)
  descricao: string;
  categoria: 'Notebook' | 'Projetor' | 'Câmera' | 'Kit' | 'Adaptador';
  condicao: 'OTIMA' | 'BOA' | 'COM_AVARIA';
  situacao: 'DISPONIVEL' | 'EMPRESTADO' | 'INDISPONIVEL';
}
EventoHistorico = { data: string /* ISO 8601 */; usuario: string; tipo: string; observacao: string; badge: string }
```

## Solicitações 📝

| Método | Caminho | Perfil | Descrição |
|---|---|---|---|
| GET | `/solicitacoes?status=` | operador | Fila de solicitações |
| GET | `/solicitacoes/minhas` | solicitante | Solicitações do usuário logado |
| POST | `/solicitacoes` | solicitante | `{ patrimonio, inicio, fim }`. Recusa (`409`) se o usuário tiver um empréstimo ATRASADO ou se o equipamento não estiver DISPONÍVEL |
| POST | `/solicitacoes/{id}/aprovar` | operador | PENDENTE → APROVADA |
| POST | `/solicitacoes/{id}/rejeitar` | operador | `{ motivo }`, PENDENTE → REJEITADA |
| POST | `/solicitacoes/{id}/retirada` | operador | APROVADA → RETIRADO, e o equipamento passa a EMPRESTADO |
| POST | `/solicitacoes/{id}/devolucao` | operador | `{ condicao, observacao? }`, RETIRADO/ATRASADO → DEVOLVIDO, e o equipamento volta a DISPONIVEL (ou INDISPONIVEL, se COM_AVARIA) |

```ts
Solicitacao = {
  id: string; solicitante: string; patrimonio: string;
  inicio: string; fim: string;   // ISO 8601
  status: 'PENDENTE' | 'APROVADA' | 'RETIRADO' | 'DEVOLVIDO' | 'REJEITADA' | 'ATRASADO';
  motivo?: string;
}
```

Uma transição inválida, como aprovar algo já rejeitado, deve responder `409 { mensagem }`. O status ATRASADO pode ser calculado pelo backend (RETIRADO com `fim` no passado), por um job agendado ou na consulta.
