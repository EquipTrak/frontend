# Imagem do front-end do EquipTrack (Angular).
#
# Estágios:
#   desenvolvimento  `ng serve` com recarga automática (usado só pelo compose.dev.yaml).
#   producao         build otimizado servido pelo nginx, sem root. É o estágio padrão: `docker build .`
#
# Em produção a URL do backend NÃO fica no bundle: o navegador chama sempre `/api` (mesma origem) e o nginx
# repassa para a variável API_URL, lida quando o contêiner sobe. A mesma imagem serve a qualquer ambiente.

# ---- Dependências (camada reaproveitada enquanto o package-lock não mudar) ----
FROM node:22-alpine AS dependencias
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Desenvolvimento ----
FROM dependencias AS desenvolvimento
COPY . .
# O ng serve grava cache em /app/.angular; o usuário "node" precisa poder escrever lá.
RUN chown -R node:node /app
USER node
EXPOSE 4200
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--poll", "2000"]

# ---- Build de produção ----
FROM dependencias AS compilacao
COPY . .
RUN npx ng build --configuration production

# ---- Produção ----
# nginx-unprivileged: roda como usuário comum (uid 101) e escuta na porta 8080, sem precisar de privilégios.
FROM nginxinc/nginx-unprivileged:1.31-alpine AS producao
# Os arquivos em /etc/nginx/templates passam por envsubst quando o contêiner sobe (vira conf.d/default.conf).
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=compilacao /app/dist/equiptrack-frontend/browser /usr/share/nginx/html

# Onde fica o backend, visto de dentro do contêiner. Sobrescreva com -e API_URL=... ou no compose.
ENV API_URL=http://backend:8080
# Pede à imagem do nginx que leia o DNS do contêiner (/etc/resolv.conf) e o exponha como NGINX_LOCAL_RESOLVERS,
# usado no template para resolver o nome do backend a cada requisição.
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
