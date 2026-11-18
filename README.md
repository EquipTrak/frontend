# EquipTrack — Front-end

Interface web do EquipTrack, sistema de empréstimo e rastreabilidade de equipamentos compartilhados. Este é o repositório do **front-end**; a API e o `compose.yaml` que sobe o sistema inteiro ficam no repositório [`EquipTrak/backend`](https://github.com/EquipTrak/backend), onde está o [passo a passo completo](https://github.com/EquipTrak/backend#início-rápido-com-docker).

## Tecnologias

Angular 22 (componentes standalone e signals), TypeScript, Tailwind CSS 4, RxJS. Testes com Vitest. Em contêiner, nginx (sem root).

## Estrutura

```
src/app/
  pages/        login, painel, página não encontrada
  components/   fila do operador, equipamentos, solicitações do solicitante, histórico, topbar e componentes de UI
  services/     auth (login, token, guard, interceptor) e equiptrack (chamadas à API e estado das telas)
  models/       contratos da API (api.models.ts) e modelos de tela
nginx.conf.template   servidor de produção (imagem Docker)
proxy.conf.mjs        proxy do ng serve em desenvolvimento
```

## Como o front fala com o backend

O navegador chama sempre **`/api`**, na própria origem do front. Quem repassa ao backend é o servidor:

- **Produção (Docker):** o nginx repassa `/api/` para a variável `API_URL` (padrão `http://backend:8080`), lida quando o contêiner sobe. A URL do backend **não** fica no código: a mesma imagem serve a qualquer ambiente. Não há CORS.
- **Desenvolvimento (`ng serve`):** o `proxy.conf.mjs` repassa `/api` para `API_URL` (padrão `http://localhost:8080`).

O token de login fica na `sessionStorage` (some ao fechar a aba) e vai no cabeçalho `Authorization: Bearer`. A segurança de verdade é a do backend; o `guard` e a visão por perfil só organizam a interface.

## Executar com Docker

### Sistema completo (recomendado)

Use o `compose.yaml` do backend (MySQL + backend + front). Os dois repositórios ficam lado a lado:

```bash
git clone https://github.com/EquipTrak/backend.git
git clone https://github.com/EquipTrak/frontend.git
cd backend
cp .env.example .env    # preencha as senhas e a chave
docker compose up --build -d
```

Acesse `http://localhost:4200`. O README do backend traz a criação do primeiro usuário, backup e solução de problemas.

### Só o front, com o backend rodando na sua máquina

Este repositório tem o próprio `compose.yaml`, que sobe o front em nginx apontando para um backend já rodando em `localhost:8080`:

```bash
docker compose up --build
```

Acesse `http://localhost:4200`. Para outra porta do front ou outro endereço do backend, defina `FRONTEND_PORT` e `API_URL` no ambiente (o padrão de `API_URL` é `http://host.docker.internal:8080`). Os dois compose usam a porta 4200: suba um de cada vez.

### Desenvolvimento com recarga automática

```bash
docker compose -f compose.dev.yaml up --build
```

Usa o `ng serve` (servidor de **desenvolvimento**, não para produção) com o código montado como volume.

### Imagem de produção

```bash
docker build -t equiptrack-frontend .
docker run --rm -p 4200:8080 -e API_URL=http://endereco-do-backend:8080 equiptrack-frontend
```

A imagem roda como usuário comum (nginx, uid 101), escuta na porta **8080** do contêiner e tem health check em `/healthz`. O nginx resolve o nome do backend a cada requisição, então sobe mesmo antes do backend e acompanha a troca de IP.

## Executar sem Docker

Requer Node 22. Com o backend rodando na porta 8080 (veja o README dele):

```bash
npm ci
npm start
```

Acesse `http://localhost:4200`. Para outro backend: `API_URL=http://outro-host:8080 npm start` (no PowerShell: `$env:API_URL='http://outro-host:8080'; npm start`).

Os usuários de demonstração (`marina.souza@equiptrack.local` etc.) só existem quando o backend sobe com o perfil `dev`; em um banco novo, o primeiro usuário é criado pela API de gestão (README do backend).

## Build e testes

```bash
npm run build      # build de produção em dist/equiptrack-frontend/browser
npm test -- --watch=false
```

O build de produção usa `inlineCritical: false`, de propósito: o CSS crítico inline do Angular depende de um `onload` que a Content-Security-Policy do nginx bloqueia e deixaria a página sem estilo.

## Segurança do servidor (nginx)

A imagem envia `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy`. A CSP só permite scripts da própria origem. As fontes ainda vêm do Google Fonts (`fonts.googleapis.com` e `fonts.gstatic.com`), que a CSP libera; hospedá-las localmente é uma melhoria pendente.

O nginx **sobrescreve** o `X-Forwarded-For` com o IP de quem chamou (não acrescenta), e o backend usa isso no bloqueio de tentativas de login. No Docker Desktop, esse IP é o do gateway do Docker.

## Solução de problemas

| Sintoma | O que fazer |
|---|---|
| Porta 4200 em uso | Pare o que a usa, ou defina `FRONTEND_PORT` (compose do front) / `FRONTEND_PORT` no `.env` do backend. |
| `502 Bad Gateway` nas chamadas `/api` | O backend não está acessível em `API_URL`. Veja se ele está de pé; dentro do compose do backend, `docker compose ps`. |
| A página abre sem estilo | A CSP bloqueou algo. Abra o console do navegador e procure `Content Security Policy`. Não use `inlineCritical` no build de produção. |
| Login mostra "Acesso desativado" | O backend devolveu 403. Acesse pelo mesmo endereço e porta do front (o proxy repassa o `Host` com a porta); em desenvolvimento, use `http://localhost:4200`. |
| O front em contêiner não acha o backend no seu computador | Use `host.docker.internal` (já é o padrão do `compose.yaml` deste repositório). No Linux, o `extra_hosts` do compose resolve isso. |
| `npm ci` falha | Use Node 22 e rode `npm ci` na pasta do projeto, com o `package-lock.json` presente. |
| Rotas como `/painel` dão 404 em outro servidor | O servidor precisa devolver o `index.html` para rotas desconhecidas (o nginx da imagem já faz). |

## Angular CLI

Este projeto foi gerado com o [Angular CLI](https://github.com/angular/angular-cli) 22. Comandos úteis: `ng generate component nome`, `ng build`, `ng test`. A lista completa: `ng generate --help`.
