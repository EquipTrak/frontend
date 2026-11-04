# syntax=docker/dockerfile:1

# ---- dev: servidor de desenvolvimento com hot reload (usado pelo compose.yaml) ----
FROM node:22-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 4200
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--poll", "2000"]

# ---- build: gera o bundle de produção ----
FROM dev AS build
RUN npx ng build --configuration production

# ---- prod: nginx servindo os arquivos estáticos ----
FROM nginx:1.27-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/equiptrack-frontend/browser /usr/share/nginx/html
EXPOSE 80
