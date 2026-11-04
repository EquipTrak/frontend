# Banco de dados

Banco **MySQL**, acessado pelo backend via JPA. Em desenvolvimento, ele sobe pelo `compose.yaml` do backend.

> **Status:**
> - As tabelas `usuario` e `sessao_token` vêm do módulo de autenticação (`backend-auth`).
> - As demais tabelas são o **modelo proposto** a partir das telas e regras do frontend. A equipe do backend deve validá-las e criá-las nas migrations.

## Diagrama

```mermaid
erDiagram
  USUARIO ||--o{ SESSAO_TOKEN : possui
  USUARIO ||--o{ TOKEN_REDEFINICAO_SENHA : solicita
  USUARIO ||--o{ SOLICITACAO : "faz (solicitante)"
  USUARIO ||--o{ SOLICITACAO : "decide (operador)"
  EQUIPAMENTO ||--o{ SOLICITACAO : "é pedido em"
  EQUIPAMENTO ||--o{ EVENTO_HISTORICO : registra
  USUARIO ||--o{ EVENTO_HISTORICO : "autor"

  USUARIO {
    bigint id PK
    varchar nome
    varchar email UK "até 150"
    varchar senha_hash "BCrypt"
    enum perfil "SOLICITANTE, OPERADOR, ADMINISTRADOR, ENCARREGADO"
    boolean ativo
    datetime criado_em
  }
  SESSAO_TOKEN {
    bigint id PK
    bigint usuario_id FK
    varchar token_hash
    datetime expira_em
    datetime revogado_em "nulo enquanto válido"
  }
  TOKEN_REDEFINICAO_SENHA {
    bigint id PK
    bigint usuario_id FK
    varchar token_hash UK
    datetime expira_em
    datetime usado_em
  }
  EQUIPAMENTO {
    varchar patrimonio PK "AA-0000"
    varchar descricao
    enum categoria "NOTEBOOK, PROJETOR, CAMERA, KIT, ADAPTADOR"
    enum condicao "OTIMA, BOA, COM_AVARIA"
    enum situacao "DISPONIVEL, EMPRESTADO, INDISPONIVEL"
    datetime criado_em
  }
  SOLICITACAO {
    bigint id PK
    varchar patrimonio FK
    bigint solicitante_id FK
    bigint operador_id FK "quem decidiu"
    date inicio_previsto
    date fim_previsto
    enum status "PENDENTE, APROVADA, RETIRADO, DEVOLVIDO, REJEITADA, ATRASADO"
    varchar motivo_rejeicao
    enum condicao_devolucao
    varchar observacao_devolucao
    datetime retirado_em
    datetime devolvido_em
    datetime criado_em
  }
  EVENTO_HISTORICO {
    bigint id PK
    varchar patrimonio FK
    bigint usuario_id FK
    varchar tipo "CADASTRO, APROVACAO, RETIRADA, DEVOLUCAO..."
    varchar observacao
    varchar badge
    datetime ocorrido_em
  }
```

## Regras e índices recomendados

- **`equipamento.patrimonio`** é a chave natural: único, no formato `^[A-Z]{2}-\d{4}$`.
- **Um equipamento EMPRESTADO não pode ter uma segunda retirada.** O backend deve validar isso na transição APROVADA → RETIRADO.
- **Índices**:
  - `solicitacao (status)`, para a fila do operador;
  - `solicitacao (solicitante_id, status)`, para "minhas solicitações" e o bloqueio por atraso;
  - `evento_historico (patrimonio, ocorrido_em DESC)`, para o histórico.
- **ATRASADO** pode ser gravado por um job diário ou calculado na consulta (`status = RETIRADO AND fim_previsto < hoje`).
- **Limpeza de tokens**: os registros vencidos de `sessao_token` e `token_redefinicao_senha` devem ser apagados periodicamente. Essa pendência já aparece na documentação do backend.
- **Senhas**: só o hash BCrypt é guardado, e o limite de 72 caracteres vem do próprio BCrypt.
