# 🚀 Guía de Despliegue en Servidores y VPS — Otter Escape: Yeti Chase Suite

Esta guía detalla las diferentes opciones para desplegar la suite en producción, desde contenedores Docker ultraligeros hasta plataformas PaaS y servidores estáticos tradicionales.

---

## 🐳 Opción 1: Despliegue con Docker & Docker Compose (Recomendada para VPS)

La suite cuenta con un empaquetado multi-etapa (*multi-stage build*) con **Node.js 22 Alpine** (compilación y suite de 33 tests unitarios certificados) y **Nginx Alpine** (runtime de solo ~26.5 MB).

### Paso 1: Clonar el repositorio en tu VPS
```bash
git clone <URL_DE_TU_REPOSITORIO>
cd Yeti
```

### Paso 2: Configurar variables de entorno (Opcional)
```bash
cp .env.example .env
# Modifica el puerto si deseas uno distinto al 8088 por defecto:
# PORT=80
```

### Paso 3: Construir y levantar
```bash
docker compose up -d --build
```

El portal y todos los juegos estarán disponibles inmediatamente en:
`http://IP_DE_TU_VPS:8088/`

### Paso 4: Actualizaciones continuas (Zero-Downtime)
```bash
git pull
docker compose up -d --build
```

Para apagar el servicio:
```bash
docker compose down
```

---

## 🌐 Opción 2: Nginx Nativo en el Host

Si ya cuentas con Nginx instalado en tu VPS sin usar Docker:

1. Compila la edición PRO en tu máquina o en el servidor:
   ```bash
   npm install
   npm run build
   ```

2. Configura un bloque de servidor en `/etc/nginx/sites-available/snow-escape`:
   ```nginx
   server {
       listen 80;
       server_name juegos.tudominio.com;
       root /var/www/Yeti;
       index index.html;

       gzip on;
       gzip_types text/plain text/css application/json application/javascript image/svg+xml;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location ~* \.(?:css|js|woff2?|svg|png|jpg|jpeg|gif|webp|ico|mp3|wav|ogg)$ {
           expires 1y;
           add_header Cache-Control "public, max-age=31536000, immutable";
       }
   }
   ```

3. Habilita el sitio y recarga:
   ```bash
   sudo ln -s /etc/nginx/sites-available/snow-escape /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

---

## ⚡ Opción 3: Plataformas Estáticas Globales ($0 / Serverless)

Dado que la suite es 100% estática en el cliente, puedes alojarla gratuitamente en redes CDN mundiales:

* **Cloudflare Pages:** Conecta tu repositorio de GitHub, comando de build: `npm run build`, directorio de salida: `.`.
* **Vercel / Netlify:** Build command: `npm run build`, output: `.`.
* **GitHub Pages:** Habilita GitHub Pages apuntando a la rama `main` tras compilar `dist/`.

---

## 💻 Opción 4: Ejecución Local en Windows (Sin Servidor Remoto)

Para probar o jugar de manera inmediata en una máquina local con Windows sin necesidad de levantar infraestructura:

1. **Lanzador Interactivo 1-Clic (`jugar.bat`):**
   - Ejecuta [`jugar.bat`](../jugar.bat) para abrir un menú interactivo en terminal que permite abrir el **Portal Hub**, iniciar el servidor local de alta velocidad (`npm run preview`), o abrir las ediciones 2D y 3D standalone.
2. **Servidor Local de Alto Rendimiento:**
   ```bash
   npm run build
   npm run preview
   ```
   Disponible inmediatamente en `http://localhost:4173/`.
3. **Modo Directo Offline (`file:///`):**
   - Gracias al bundle IIFE y los estilos CSS inline generados durante `npm run build`, puedes hacer doble clic directamente en `games/3d-pro/dist/index.html` o `index.html` en el explorador de archivos.

