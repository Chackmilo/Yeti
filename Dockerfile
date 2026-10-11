# ==========================================
# ETAPA 1: Construcción y Test de Vite 3D PRO
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app/games/3d-pro

# Copia de manifiestos para aprovechar el caché de capas de Docker
COPY games/3d-pro/package*.json ./

# Instalación limpia de dependencias de producción y desarrollo
RUN npm ci

# Copia del código fuente y tests
COPY games/3d-pro/ ./

# Validación de tests unitarios y compilación del bundle de producción
RUN npm test && npm run build

# ==========================================
# ETAPA 2: Servidor Nginx Alpine Ultraligero
# ==========================================
FROM nginx:alpine AS runner

# Limpiar archivos por defecto de Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiar portal web principal
COPY index.html /usr/share/nginx/html/index.html

# Copiar ediciones autónomas y compiladas
COPY games/2d-retro /usr/share/nginx/html/games/2d-retro
COPY games/3d-standalone /usr/share/nginx/html/games/3d-standalone
COPY --from=builder /app/games/3d-pro/dist /usr/share/nginx/html/games/3d-pro/dist

# Copiar configuración optimizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Puerto estándar de Nginx
EXPOSE 80

# Comprobación de salud del contenedor
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
