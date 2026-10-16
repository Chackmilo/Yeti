# ==========================================
# ETAPA 1: Construcción y Test de Vite 3D PRO
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app/games/3d-pro

COPY games/3d-pro/package*.json ./
RUN npm ci --workspaces=false

COPY games/3d-pro/ ./
RUN npm test && npm run build

# ==========================================
# ETAPA 2: Servidor Nginx Alpine Ultraligero
# ==========================================
FROM nginx:alpine AS runner

RUN rm -rf /usr/share/nginx/html/*

COPY index.html /usr/share/nginx/html/index.html
COPY assets /usr/share/nginx/html/assets
COPY games/2d-retro /usr/share/nginx/html/games/2d-retro
COPY games/3d-standalone /usr/share/nginx/html/games/3d-standalone
COPY --from=builder /app/games/3d-pro/dist /usr/share/nginx/html/games/3d-pro/dist
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
