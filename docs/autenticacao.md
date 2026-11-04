# Autenticação no front-end

Implementa o login do EquipTrak sobre a API de autenticação do backend (JWT, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`). O contrato completo está em `docs/auth-api.md` do repositório do backend.

> Origem: contrato do backend (`backend-auth`). Os critérios do ticket SCRUM-20 e do Figma ainda não foram conferidos; ver "Pendências".

## Estrutura

| Arquivo | Responsabilidade |
|---|---|
| `src/app/core/config.ts` | `API_URL` (padrão `http://localhost:8080`), sobrescrevível por provider |
| `src/app/core/auth/auth.service.ts` | login, logout, `me`, sessão em `localStorage` (`equiptrack.sessao`) |
| `src/app/core/auth/auth.interceptor.ts` | anexa `Authorization: Bearer`; em 401 limpa a sessão e vai a `/login` |
| `src/app/core/auth/auth.guard.ts` | `authGuard` (rotas privadas) e `guestGuard` (tela de login) |
| `src/app/core/http/mensagem-erro.ts` | converte erros HTTP no texto exibido ao usuário |
| `src/app/features/login/` | tela de login (formulário reativo, Tailwind) |
| `src/app/features/home/` | página provisória com nome, perfil e botão **Sair** |

## Fluxo

1. Usuário anônimo em qualquer rota privada é enviado a `/login?returnUrl=<rota>`.
2. O login válido guarda token, expiração e usuário; navega para `returnUrl` (só caminhos internos) ou `/`.
3. Toda chamada a `API_URL` leva o Bearer token. Token vencido é descartado localmente antes de usar.
4. Um 401 em rota protegida (token expirado ou revogado) limpa a sessão e abre `/login?sessaoExpirada=true`.
5. **Sair** chama `/auth/logout` para revogar o token e limpa a sessão local mesmo se a chamada falhar.

## Decisões

- Sem refresh token (o backend não oferece): ao expirar, o usuário entra de novo.
- Token em `localStorage` por simplicidade da entrega acadêmica. Em produção, avaliar cookie `HttpOnly`, o que exige mudança no backend.
- O 401 do login mostra a mensagem do backend, que é a mesma para e-mail inexistente, senha errada e usuário inativo.
- `returnUrl` só aceita caminho iniciado em `/` e não em `//`, para evitar redirecionamento aberto.
- Validação no cliente espelha a do backend: e-mail obrigatório, formato válido e até 150 caracteres; senha obrigatória e até 72.

## Rodar

Backend (pasta `backend-auth`, perfil `dev`, requer MySQL via `compose.yaml`) em `http://localhost:8080`. O CORS do backend libera `http://localhost:4200`.

```bash
npm install
npm start            # http://localhost:4200
npm test             # testes unitários (Vitest)
npm run build
```

Usuário de desenvolvimento: `admin@equiptrack.local` / `Admin@123`.

## Testes

Unitários, com `HttpTestingController`: serviço (login, 401, restauração e expiração de sessão, logout, `me`), interceptor (Bearer, domínios externos, 401), guards, mensagens de erro e a tela (validação, sucesso, `returnUrl`, open redirect, erro do backend, duplo envio).

## Pendências

- Conferir critérios do SCRUM-20 e subtarefas, do doc de codificação e do Figma (sem acesso ao Atlassian na hora da implementação). Ajustar visual e textos conforme o Figma.
- Teste ao vivo contra o backend (exige Docker/MySQL e Gradle) e fluxo no navegador.
- Backend sem rate limit de login e sem limpeza de `sessao_token` (ver doc do backend).
