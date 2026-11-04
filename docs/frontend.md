# Frontend

## Telas

| Tela | Arquivo | Perfil |
|---|---|---|
| Login | `features/login` | anônimo |
| Recuperar senha | `features/esqueci-senha` | anônimo |
| Redefinir senha | `features/redefinir-senha` | anônimo |
| Painel: indicadores e equipamentos | `pages/painel` + `components/equipamentos-operador` | operador |
| Fila de solicitações | `components/fila-solicitacoes` | operador |
| Equipamentos disponíveis | `components/disponiveis-solicitante` | solicitante |
| Minhas solicitações | `components/minhas-solicitacoes` | solicitante |
| Histórico do equipamento (gaveta lateral) | `components/historico-equipamento` | operador |
| 404 | `pages/not-found` | todos |

Toda lista trata os quatro estados de tela previstos no design: **normal**, **carregando** (skeleton), **vazio** e **erro**, este com a ação de tentar novamente.

## Design system

Os tokens ficam em `src/styles.css` (`:root` + `@theme`) e seguem o **Guia de Design** anexado ao SCRUM-20.

**Cores de estado (OKLCH):**

| Tom | HEX aprox. | Uso |
|---|---|---|
| `success` | `#00742E` | Disponível, Devolvido, condição Ótima |
| `info` | `#006F9D` | Emprestado, Retirado |
| `warning` | `#B16600` | Pendente, Aprovada, condição Boa |
| `danger` | `#C21725` | Atrasado, Rejeitada, Com avaria |
| `neutral` | `#555E6C` | Indisponível |

**Selos** (`ui/selo.component.ts`):
- O texto usa a cor semântica, o fundo a mistura 14% e a borda a mistura 40%.
- Os selos de **condição** não têm ícone.
- Os de **situação** e **status** podem ter ícone (Lucide, em SVG inline).
- O selo **Atrasado** pulsa.

**Tipografia:**
- **Bebas Neue**: títulos e números grandes.
- **Inter**: texto corrido.
- **JetBrains Mono**: patrimônios e códigos, como `NB-0001`.

**Componentes de UI** (`components/ui`):
- `appBotao`: variantes primário, secundário, fantasma e perigo.
- `appInput` / `appSelect` + `app-campo`: rótulo, ajuda e erro acessíveis.
- `app-selo`, `app-modal` / `app-gaveta`, `app-toaster`.
- Estados visuais: `app-estado-carregando`, `app-estado-vazio`, `app-estado-erro` e `app-alerta`.
- `app-icon`, `app-brand-logo`, `app-mascote`.

## Convenções

- Componentes standalone, `inject()` no lugar de construtor e `signal`/`computed` para estado.
- Controle de fluxo novo (`@if`, `@for … track`). Formulários reativos nas telas de acesso.
- Textos da interface em português do Brasil.
- Estilo só com Tailwind e os tokens do tema. Nada de CSS solto por componente, exceto `:host`.
- `app-campo` recebe o id como **binding** (`[id]="'email'"`), não como atributo, para não duplicar o `id` no DOM.
- Formatação com Prettier (`.prettierrc`): `npx prettier --write "src/**/*.{ts,html}"`.

## Testes

```bash
npm test                         # executa uma vez
npx ng test                      # modo watch
```

O Vitest, com jsdom e `HttpTestingController`, cobre:
- o serviço de autenticação, o interceptor e os guards;
- as mensagens de erro HTTP;
- o login (validação, sucesso, `returnUrl`, redirecionamento aberto, erro do backend e duplo envio);
- a recuperação e a redefinição de senha;
- as rotas e o estado do painel.

## Desempenho

- **Lazy loading em todas as rotas**: o bundle inicial tem cerca de 80 KB comprimidos, e o painel (~15 KB) só carrega depois do login.
- **No build de produção**:
  - o Angular embute o CSS das fontes do Google;
  - o CSS crítico vai inline;
  - os arquivos ganham hash no nome.
- **nginx** (`nginx.conf`): gzip, `Cache-Control: immutable` de 1 ano nos estáticos e `no-cache` no `index.html`.
- **Budgets** em `angular.json`: aviso aos 500 KB e erro a 1 MB no bundle inicial.
