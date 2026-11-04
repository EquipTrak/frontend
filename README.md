# EquipTrack — Frontend

Sistema de **empréstimo e rastreabilidade de equipamentos de informática**: solicitação, aprovação, retirada e devolução em um só lugar, do notebook ao adaptador HDMI.

Este repositório é o **frontend** (Angular 22 + Tailwind CSS 4). Ele consome a API REST do backend (Spring Boot + MySQL), em `http://localhost:8080` por padrão.

| | |
|---|---|
| Ticket | SCRUM-20, dentro do épico SCRUM-10 "Identidade e acesso", com as subtarefas SCRUM-23 (login/logout) e SCRUM-24 (recuperação de senha) |
| Design | Figma "EquipTrack-design", [versão de homologação](https://equiptrackhomo.lovable.app/) e o Guia de Design anexado ao SCRUM-20 |
| Stack | Angular 22 (standalone, signals, controle de fluxo `@if`/`@for`), Tailwind CSS 4, Vitest, Docker |

## Como rodar

### Opção 1: Node local

Requer Node 22 ou superior.

```bash
npm ci
npm start                 # http://localhost:4200
npm test                  # testes unitários (Vitest)
npm run build             # build de produção em dist/
```

### Opção 2: Docker (mesmo ambiente no Mac e no Windows)

```bash
docker compose up --build                     # desenvolvimento com hot reload: http://localhost:4200
docker compose --profile prod up --build      # build de produção servido pelo nginx: http://localhost:8081
```

### Opção 3: IntelliJ IDEA

Abra a pasta do projeto. As configurações de execução já vêm versionadas em `.idea/runConfigurations`:
**ng serve**, **ng test**, **ng build** e **Debug no Chrome**. Elas aparecem no seletor de execução, no canto superior direito.

### Backend

Para logar de verdade, suba o backend em `http://localhost:8080`. O CORS dele precisa liberar `http://localhost:4200`. Para apontar o front para outra URL, sobrescreva o token `API_URL` (veja `src/app/core/config.ts`).

## Telas e rotas

| Rota | Acesso | Tela |
|---|---|---|
| `/login` | anônimo | Login com e-mail corporativo (JWT) |
| `/esqueci-senha` | anônimo | Pedido de link de recuperação |
| `/redefinir-senha?token=…` | anônimo | Cadastro de nova senha |
| `/painel` | autenticado | **Operador**: indicadores, equipamentos (cadastro, filtros, histórico) e fila de solicitações (aprovar, rejeitar, registrar retirada e devolução). **Solicitante**: equipamentos disponíveis, nova solicitação e minhas solicitações |
| `/` | — | Redireciona para `/painel` |
| qualquer outra | — | Página 404 |

O perfil do painel vem do usuário autenticado: `SOLICITANTE` abre a visão do solicitante, os demais perfis abrem a do operador.

## Estrutura

```
src/app/
  core/          infraestrutura: config (API_URL), auth (serviço, guards, interceptor, senha), http (mensagens de erro)
  features/      telas de acesso: login, esqueci-senha, redefinir-senha
  pages/         páginas do sistema: painel, not-found
  components/    blocos do painel (topbar, equipamentos, fila, disponíveis, minhas solicitações, histórico)
    ui/          design system: botão, campo, selo, modal/gaveta, ícones, estados visuais, toaster, logo
  models/        tipos do domínio e dados de exemplo
  services/      estado do painel (EquipTrackService) e toasts
```

## Documentação

- [Arquitetura](docs/arquitetura.md): visão geral do sistema, fluxo de dados e decisões
- [Frontend](docs/frontend.md): telas, design system, convenções, testes e desempenho
- [API](docs/api.md): contrato entre o front e o backend
- [Banco de dados](docs/banco-de-dados.md): modelo de dados
- [Autenticação](docs/autenticacao.md): login, sessão, guards e recuperação de senha

## Estado atual

- **Autenticação**: integrada à API real (JWT).
- **Equipamentos, solicitações e histórico**: usam **dados de exemplo em memória** (`EquipTrackService`) até o backend publicar esses endpoints. O contrato esperado está em [docs/api.md](docs/api.md).
- **Seletores de "Estado" e "Perfil" no topo do painel**: ferramentas de homologação para revisar as telas em todos os estados e perfis.
