# EquipTrak: front-end

Aplicação Angular 22 (Tailwind 4, Vitest) do EquipTrak, sistema de controle de equipamentos. Consome a API Spring Boot do backend.

## Comandos

```bash
npm install
npm start         # servidor de desenvolvimento em http://localhost:4200
npm test          # testes unitários
npm run build     # build de produção em dist/
```

Também há `Dockerfile` e `compose.yaml` para rodar em contêiner.

## Documentação

- [Autenticação (login, sessão, guards)](docs/autenticacao.md)

## Estrutura

```
src/app/
  core/       serviços e infraestrutura compartilhada (config, auth, http)
  features/   telas por funcionalidade (login, home)
```

Configuração do backend: token `API_URL` em `src/app/core/config.ts` (padrão `http://localhost:8080`).
