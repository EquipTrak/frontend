# EquiptrackFrontend

## Integração com o backend

O front chama a API do backend (`EquipTrak/backend`) pelo prefixo `/api`.

1. Suba o backend na porta 8080 com usuários de demonstração (ver o README do backend):

   ```bash
   SPRING_PROFILES_ACTIVE=mysql,dev EQUIPTRACK_DEV_SENHA=sua-senha ./gradlew bootRun
   ```

2. Neste projeto, rode `npm install` e depois `npm start`.
3. Acesse `http://localhost:4200` e entre com um dos usuários de demonstração, como `marina.souza@equiptrack.local` (Operador) ou `rafael.lima@equiptrack.local` (Solicitante).

Esses usuários só existem com o perfil `dev` do backend. Sem ele, por exemplo no MySQL limpo ou no Docker, o banco começa **sem usuários**, e eles são criados pela API de gestão, com a chave de desenvolvedor (ver o README do backend).

O `ng serve` repassa `/api` para `http://localhost:8080` (`proxy.conf.mjs`). Para outro endereço, defina a variável `API_URL`.

## Docker

- **Só o front em contêiner:** o `compose.yaml` deste projeto sobe apenas o front, na porta 4200, apontando para um backend que já esteja rodando na máquina (`host.docker.internal:8080`).
- **Tudo em contêineres (MySQL + backend + front):** use o `compose.mysql.yaml` do repositório do backend. Ele constrói o front a partir de `../frontend`, então os dois repositórios precisam estar lado a lado na mesma pasta. O passo a passo está na seção "Rodar tudo com Docker" do README do backend.

Os dois compose usam a porta 4200: suba um de cada vez.

Por enquanto usam a API a autenticação, a tela de Equipamentos (categorias, lista, filtros e cadastro), a gaveta de histórico do equipamento as telas do solicitante (botão "Solicitar", lista "Minhas solicitações" e cancelamento) e a fila do operador (lista, aprovar e rejeitar). A retirada, a devolução, o atraso (com o bloqueio de quem está em atraso) e os indicadores do painel do operador também usam a API. Não há mais dados de demonstração no front. O andamento está em `docs/integracao-frontend.md`, no backend.

## Angular CLI

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.8.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
