# ---------- FASE 1: BUILD (Vite) ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
ENV npm_config_legacy_peer_deps=true

RUN npm ci --no-audit --no-fund

COPY . .

# Vite construye en dist/
RUN npm run build

# ---------- FASE 2: NGINX ----------
FROM nginx:alpine

# Copiamos el build al root que sirve Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# 👇 Sobrescribimos la config por defecto con la nuestra
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
