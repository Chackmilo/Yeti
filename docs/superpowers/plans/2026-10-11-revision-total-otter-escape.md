# Revisión Total — Otter Escape: Yeti Chase — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** Dejar toda la suite coherente y verificada tras las dos sesiones externas del 2026-10-11. La suite son el portal, 2D Retro, 3D Standalone, 3D PRO, la infraestructura y la documentación. Al terminar, el CI y Docker deben ser reproducibles, cada medio debe existir una sola vez, la alerta de proximidad debe verse en las tres ediciones, el prólogo y la galería deben ser accesibles y ligeros, y la documentación debe describir lo que hace el código.

**Arquitectura:**
- **Guardias primero.** Se añaden tests de suite en `tests/suite.test.js` (raíz) marcados como `todo`. Cada tarea pone en verde los suyos y quita la marca.
- **Medios.** Viven una sola vez en `assets/` como derivados web. Los originales van a `art/`, fuera de git. Todas las ediciones los referencian con rutas relativas al layout del portal. 3D PRO no empaqueta medios.
- **Modales del portal.** Usan fondo `inert`, foco dentro del modal y retorno del foco al cerrar.

**Stack:** HTML/CSS/JS sin framework (portal, 2D, Standalone). Three.js 0.170 + Vite 6 + esbuild IIFE (PRO). `node:test`. Python 3 con Pillow 12, solo para regenerar el arte. nginx:alpine + Docker. GitHub Actions.

**Spec:**
- Dos informes pegados en el chat el 2026-10-11: la "Nutria Esquiadora / coherencia" y el de "video + 3 imágenes".
- El plan anterior, [`2026-10-11-3d-pro-coherencia-nutria.md`](2026-10-11-3d-pro-coherencia-nutria.md), ya ejecutado en los commits `6f21734..3ddca8d`.
- La verificación de la sección *Contexto*.

## Restricciones globales

- No romper partidas guardadas. Las claves de `localStorage` `snow_escape_*` y la API `window.SnowEscape` se mantienen: el renombre a Otter Escape es solo de marca.
- Cada medio existe una sola vez en el árbol versionado (`assets/`). Los originales van en `art/`, que está en `.gitignore`.
- Toda referencia de una página a un archivo local es relativa y existe. Tiene que funcionar en `file://` (vía `jugar.bat`), con `npm run serve` y en Docker.
- Las dependencias de 3D PRO se instalan siempre con `npm ci --workspaces=false` dentro de `games/3d-pro`, porque el único lockfile vive ahí. Sin esa bandera, npm toma la raíz (workspace) como proyecto y falla.
- Alerta de proximidad, igual en las tres ediciones: umbral de 65 m, intensidad `0.35 + 0.65·(1 − gap/65)` y pulso de 0.9 s con `alternate` (< 1 Hz). Sin animación con `prefers-reduced-motion: reduce` y con `pointer-events: none`.
- Prólogo: nunca autoplay con sonido. Sin autoplay con `prefers-reduced-motion` ni con `Save-Data`. `preload="none"`.
- nginx: `immutable` solo para los bundles de Vite con hash. Las cabeceras de seguridad deben estar en toda respuesta.
- Textos de UI y nombres de tests en español.
- No editar `dist/` a mano.

## Review Focus

1. **Clon limpio.** El CI instala en un checkout nuevo, y ahí `npm ci` fallaba. Lo cubre el paso de simulación de clon limpio de la Tarea 10, además del cambio de CI de la Tarea 1.
2. **Portal sin JavaScript o con `localStorage` bloqueado.** El portal debe seguir siendo usable. Lo cubren el modal oculto por defecto y la lectura con try/catch: test estático "Portal…" de la Tarea 3.
3. **Uso solo con teclado.** Tab no debe escapar del modal, Escape lo cierra y el foco vuelve a donde estaba. Lo cubren el test estático y el chequeo en navegador de la Tarea 3.
4. **Doble clic en Windows (`file://`) y Docker.** Imágenes y video tienen que cargar en ambos. Lo cubren la guardia de referencias (Tarea 1, en verde en la 2) y la matriz de la Tarea 10.
5. **Reemplazar un asset por otro con el mismo nombre** (el arte se está iterando). nginx no debe servirlo como `immutable`. Lo cubre la guardia nginx (Tarea 1, en verde en la 6).

## Contexto: verificación (2026-10-11, segunda ronda)

**A. Plan anterior.** Se ejecutó completo: 10 commits en `feat/3d-pro-coherencia` y 33/33 tests en verde. Sigue pendiente la comprobación visual de la alerta de PRO en el navegador (Tarea 10).

**B. Informe "video + 3 imágenes".** Estos cambios están sin commitear.

| Afirmación | Estado real | Evidencia |
| :--- | :--- | :--- |
| Video vinculado y respaldado en `assets/intro_lake.mp4` | ⚠️ Hay **5 copias** de 6,6 MB: raíz, `assets/`, `games/3d-pro/public/` y dos dentro de `dist/`. El `moov` está al final (sin *faststart*). Es 1080p a ~5 Mbps para un bucle de 10 s | `find`, análisis de cajas MP4 |
| Modal cinemático del portal | ⚠️ Funciona. ❌ No gestiona el foco ni deja el fondo inerte. ❌ `preload="auto"` baja 6,6 MB aunque el autoplay esté desactivado. ⚠️ Ignora `prefers-reduced-motion` | `index.html:969-1004`, script final |
| Botón permanente en la cabecera | ✅ | `index.html:1053` |
| Prólogo en 3D PRO | ❌ `Enter` arranca la partida **debajo** del modal (`InputManager`) y `Escape` no lo cierra. ❌ `Espacio` y `F` van al turbo. ❌ Mete 2 copias del video en `dist/`. ❌ Las fuentes de respaldo `../../assets` y `../../Otter_…mp4` no existen desde `dist/` | `games/3d-pro/index.html`, `MenuManager.js`, `InputManager.js:63-71` |
| "Versiones optimizadas" de las 3 imágenes | ⚠️ 1024×571, 46–64 KB, que está bien. ❌ `otter_2d_pixel.jpg` tiene una **mancha gris sobre el torso**, y el original 2K también | Inspección visual |
| Avatares en los menús de 2D, Standalone y PRO | ✅ Se ven. ⚠️ 2D y Standalone ya dependen de `../../assets/`. ⚠️ El arte tiene suéter y el modelo del juego no | diffs |
| Galería y lightbox "HD" | ⚠️ Funciona con ratón. ❌ Las tarjetas no se pueden usar con teclado, no hay foco y el `alt` es fijo. ❌ El "HD" son las mismas imágenes de 1024 px | `index.html:1243-1290` |
| 33 tests al 100 % | ✅ 33/33 | `npm test` |
| Build reconstruido | ✅ El `dist/` de las 14:45 coincide con las fuentes | timestamps |
| nginx con caché para video | ❌ Marca `immutable` por 1 año archivos **sin hash** (`/assets/*`, `app.iife.js`) | `nginx.conf` |
| Dockerfile actualizado | ❌ Copia el video dos veces, y `dist/` lleva otras 2 (unos +26 MB). ❌ Copia archivos **sin versionar**, así que el job Docker del CI falla | `Dockerfile`, `git status` |

**C. Otros hallazgos.**

| Hallazgo | Severidad | Evidencia |
| :--- | :--- | :--- |
| **CI roto desde la línea base.** `cd games/3d-pro && npm ci` falla con `EUSAGE … can only install with an existing package-lock.json`, porque npm usa la raíz (workspace) y ahí no hay lockfile. Con `--workspaces=false` funciona y los 33 tests y el build pasan | Crítica | Clon limpio en el scratchpad |
| La alerta sigue **invisible en 2D y Standalone**. El commit `2ae4219` subió el umbral a 65 m, pero sigue usando `box-shadow: inset`, que queda bajo el canvas opaco | Alta | `games/2d-retro/index.html:3794-3811`, `updateHUD` de Standalone |
| nginx: los `add_header` de cada `location` **anulan** las cabeceras de seguridad del `server`. El HTML y los estáticos salen sin `X-Frame-Options` ni `nosniff` | Alta | Regla de herencia de `add_header` |
| `jugar.bat`: tiene finales **LF** (riesgo con `goto` en cmd.exe). La opción 2 abre el navegador antes de que arranque el servidor y `vite preview` solo sirve `dist/` | Media | 0 CRLF |
| Bundle `file://`: el CSS va duplicado (inline y enlazado). El `modulepreload crossorigin` da un error CORS en `file://` | Baja | `scripts/postbuild.js` |
| `esbuild` se usa sin declararlo; llega a través de Vite | Baja | `games/3d-pro/package.json` |
| Docs desactualizadas: Docker "~26,5 MB", Standalone "~51 KB" y "archivo único", "todo procedural", conteos de tests en ~10 sitios. El CI dice "(19 Unit Tests)". El arte no tiene créditos ni licencia | Media | grep |
| 6 originales (9,4 MB) y el video sueltos en la raíz sin versionar. `image.png_2K` es un mockup de otra marca ("HUILLIN") | Media | `git status` |
| No hay `.gitattributes` (`core.autocrlf=true`), lo que genera avisos LF→CRLF | Baja | `git status` |
| El portal solo lee los récords de 2D (`snow_escape_hi_*`) | Baja | `index.html:1378-1379` |
| `feat/3d-pro-coherencia` no está fusionada en `master`; el CI solo corre en `main`/`master` | Info | `git branch` |

## Decisiones (confirmadas por el usuario el 2026-10-11)

- **D1. Prólogo:** solo en el portal. 3D PRO enlaza a `index.html#prologo`.
- **D2. Originales:** van a `art/`, fuera de git. Se versiona `assets/`, porque el job Docker del CI lo necesita.
- **D3. Imagen pixel dañada:** se reemplaza por un recorte de la escena pixel-art del lago (`Otter_wearing_sweater_by_lake_2K_20261011145358.jpg`, limpia).
- **D4. Suéter en el modelo del juego:** **incluido** (Task 8).
- **D5. Video:** **se re-codifica con ffmpeg**, cuya instalación aprobó el usuario. Se hace dentro de la Task 0.
- **D6. Licencia de los medios:** fuera de MIT, con "todos los derechos reservados por el autor".
- **D7. Conteos de tests:** solo en los certificados (`VALIDATION`), en el badge y en la sección de tests del README de PRO. El resto de la prosa va sin números.

## Ejecución (decisiones del controlador)

- **Dónde se trabaja:** en el worktree `E:\Yeti\.claude\worktrees\revision-total`, rama `feat/3d-pro-coherencia`, base `7f31467`. El checkout principal `E:\Yeti` tiene activa la rama `experiment/fly-brain-ai`, de otra sesión: **no se modifica nada en `E:\Yeti`**.
- **Historial:** la integración multimedia ya está commiteada en `7f31467`, incluidos `games/3d-pro/public/assets/*` y el blob de 6,6 MB del video. El historial no se reescribe, porque `experiment/fly-brain-ai` parte de ese commit. Aun así, el video se optimiza para que el despliegue pese menos.
- **Orden:** Task 0 (incluye la Task 9), 1, 2, 3, 4, 5, 6, **8, 7**, 10. La documentación va al final para que use los conteos definitivos.
- **Verificación en navegador:** Chrome sin interfaz, mediante el Playwright global: `createRequire('D:/DevCache/npm-prefix/node_modules/@playwright/mcp/package.json')` y `chromium.launch({ channel: 'chrome', headless: true })`. Los scripts de verificación van en el workspace SDD (ignorado), nunca en el repo.

## Mapa de archivos

| Archivo | Responsabilidad | Tareas |
| :--- | :--- | :--- |
| `.gitattributes` (nuevo), `.gitignore` | Finales de línea estables y `art/` fuera de git | 0 |
| `art/` (nuevo, ignorado) | Originales de arte y video | 0, 5, 9 |
| `tests/suite.test.js` (nuevo) | Guardias de suite: referencias, Dockerfile, nginx, alerta, medios únicos, portal | 1, 2, 3, 4, 6 |
| `package.json` (raíz) | Scripts `setup`, `test`, `serve` | 1 |
| `.github/workflows/ci.yml` | Instalación con `--workspaces=false`, nombres de los pasos | 1 |
| `games/3d-pro/index.html`, `src/ui/MenuManager.js`, `vite.config.js` | Avatar compartido, enlace al prólogo, `publicDir` solo en dev | 2 |
| `games/3d-pro/public/` | Se elimina (duplicado) | 2 |
| `index.html` (portal) | Modales accesibles y ligeros, `#prologo`, galería con teclado, `data-full` a 1600 px | 0, 3, 5, 7 |
| `games/2d-retro/index.html`, `games/3d-standalone/index.html` | Capa `#yetiAlert` | 4 |
| `scripts/build_assets.py` (nuevo), `assets/*` | Derivados web reproducibles | 5 |
| `nginx.conf`, `Dockerfile`, `jugar.bat` | Caché, cabeceras, una sola copia de medios, lanzador | 0, 6 |
| `games/3d-pro/scripts/patch-html.js` (nuevo), `scripts/postbuild.js`, `tests/build.test.js` (nuevo) | Cargador `file://`/`http` sin duplicados | 6 |
| `README.md`, `docs/*.md`, `games/3d-pro/README.md`, `games/3d-pro/VALIDATION.txt`, `assets/CREDITS.md` (nuevo) | Documentación fiel al código | 7 |

---

### Task 0: Higiene de assets y video optimizado (núcleo)

**Archivos:**

- Crear: `.gitattributes`, `art/` (ignorado)
- Modificar: `.gitignore`, `.dockerignore`, `Dockerfile` (línea del mp4 de la raíz), `index.html` (`<source>` del mp4 de la raíz), `jugar.bat` (finales CRLF), `assets/intro_lake.mp4` (re-codificado)
- Copiar (no mover): los 7 originales desde la raíz de `E:\Yeti` → `art/` del worktree

**Interfaces:**

- Produce: `art/` con los 7 originales (fuera de git y fuera del contexto de Docker), `.gitattributes`, y `assets/intro_lake.mp4` a 720p con *faststart*.

**Contexto:** trabajas en el worktree `E:\Yeti\.claude\worktrees\revision-total`, rama `feat/3d-pro-coherencia`. La integración multimedia ya está commiteada. Los originales solo existen, SIN versionar, en la raíz de `E:\Yeti`, donde trabaja otra sesión: **cópialos y no muevas, borres ni edites nada en `E:\Yeti`**. Si el guardia del worktree rechaza un comando compuesto, divídelo en comandos simples o escribe el script con la herramienta Write dentro del workspace SDD.

- [ ] **Paso 1: Copiar los originales**

```bash
mkdir -p art
cp /e/Yeti/Otter_character_design_20261011142610.jpg /e/Yeti/Otter_character_design_illustration_2K_20261011142607.jpg /e/Yeti/Otter_pixel_art_character_design_2K_20261011142624.jpg /e/Yeti/Otter_wearing_sweater_by_lake_20261011145348.jpg /e/Yeti/Otter_wearing_sweater_by_lake_2K_20261011145358.jpg /e/Yeti/image.png_2K_20261011142716.jpg /e/Yeti/Otter_pouring_coffee_by_lake_20261011143032.mp4 art/
ls art
```

Esperado: 7 archivos (6 `.jpg` y 1 `.mp4`).

- [ ] **Paso 2: Ignorar `art/`, fijar los finales de línea y aligerar el contexto de Docker**

Añadir al final de `.dockerignore`:

```gitignore
art
.superpowers
.claude
```

Añadir al final de `.gitignore`:

```gitignore

# Originales de arte y video (fuente de assets/, fuera de git)
art/
```

Crear `.gitattributes`:

```gitattributes
* text=auto eol=lf
*.bat text eol=crlf
*.jpg binary
*.jpeg binary
*.png binary
*.webp binary
*.avif binary
*.mp4 binary
*.webm binary
```

Convertir la copia de trabajo de `jugar.bat` a CRLF (cmd.exe puede fallar con `goto` en archivos LF):

```bash
python -c "p='jugar.bat';d=open(p,'rb').read().replace(b'\r\n',b'\n').replace(b'\n',b'\r\n');open(p,'wb').write(d)"
python -c "d=open('jugar.bat','rb').read();print('CRLF',d.count(b'\r\n'),'LF',d.count(b'\n'))"
```

Esperado: el número de CRLF es igual al de LF.

- [ ] **Paso 3: Quitar las referencias al mp4 de la raíz**

En `Dockerfile`, borrar la línea:

```dockerfile
COPY Otter_pouring_coffee_by_lake_20261011143032.mp4 /usr/share/nginx/html/Otter_pouring_coffee_by_lake_20261011143032.mp4
```

En `index.html` (portal), borrar la línea:

```html
          <source src="./Otter_pouring_coffee_by_lake_20261011143032.mp4" type="video/mp4">
```

La tercera `<source>` de `games/3d-pro/index.html` se elimina en la Task 2, junto con el modal entero.

- [ ] **Paso 4: Re-codificar el video con ffmpeg (aprobado por el usuario)**

Instalar ffmpeg:

```powershell
winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements
```

Si `ffmpeg -version` no lo encuentra después (el PATH de la sesión no se recarga), usa la ruta completa `"/c/Users/Daniel Camilo Pardo/AppData/Local/Microsoft/WinGet/Links/ffmpeg.exe"`. Si tampoco está ahí, búscala con `ls "/c/Users/Daniel Camilo Pardo/AppData/Local/Microsoft/WinGet/Packages/"`.

Re-codificar a 720p con *faststart* desde el original:

```bash
ffmpeg -y -i art/Otter_pouring_coffee_by_lake_20261011143032.mp4 -vf scale=1280:-2 -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 96k assets/intro_lake.mp4
```

Comprobar el tamaño y el orden de las cajas MP4. Escribe este script con Write en el workspace SDD y ejecútalo con `python <ruta>`:

```python
import os
import struct

path = 'assets/intro_lake.mp4'
data = open(path, 'rb').read()
i, order = 0, []
while i < len(data):
    size, kind = struct.unpack('>I4s', data[i:i + 8])
    if size == 1:
        size = struct.unpack('>Q', data[i + 8:i + 16])[0]
    order.append(kind.decode('latin1'))
    if size == 0:
        break
    i += size
print(os.path.getsize(path) // 1024, 'KB', order)
```

Esperado: menos de 3072 KB y `moov` antes que `mdat` (por ejemplo, `['ftyp', 'moov', 'free', 'mdat']`).

- [ ] **Paso 5: Commit**

```bash
git add .gitattributes .gitignore .dockerignore Dockerfile index.html jugar.bat assets/intro_lake.mp4
git add --renormalize .
git status --short
git diff --cached --stat
```

Esperado: en staging, solo esos 7 archivos. `art/` y `.superpowers/` no aparecen. Si `--renormalize` añade otros archivos, comprueba que su diff sea solo de finales de línea y anótalos en el informe; si hay algo más, detente y repórtalo.

```bash
git commit -m "chore: higiene de assets: originales fuera de git, .gitattributes y video del prólogo a 720p con faststart" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git ls-files art
```

Esperado: `git ls-files art` sin salida.

---

### Task 1: Guardias automáticas de la suite, scripts y CI (núcleo)

**Archivos:**

- Crear: `tests/suite.test.js`
- Modificar: `package.json` (raíz), `.github/workflows/ci.yml`

**Interfaces:**

- Produce: los tests de suite con `{ todo: 'Tarea N' }` que las tareas 2, 4 y 6 deben quitar. También los scripts raíz `setup`, `test` (PRO + suite) y `serve` (sirve la raíz completa en `http://localhost:4173/`).

- [ ] **Paso 1: Escribir las guardias**

Crear `tests/suite.test.js`:

```js
// tests/suite.test.js
// Guardias de coherencia de toda la suite: portal + 3 ediciones + infraestructura.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(ROOT, path), 'utf8');

const PAGES = ['index.html', 'games/2d-retro/index.html', 'games/3d-standalone/index.html', 'games/3d-pro/index.html'];
const EDITIONS = ['games/2d-retro/index.html', 'games/3d-standalone/index.html', 'games/3d-pro/index.html'];
const REF = /\b(?:src|href|poster|data-full)="([^"]*)"/g;
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;
const GENERATED = /(?:^|\/)games\/3d-pro\/dist\//;

test('Suite: las páginas solo enlazan archivos locales relativos que existen', { todo: 'Tarea 2' }, () => {
  const problems = [];
  for (const page of PAGES) {
    for (const [, raw] of read(page).matchAll(REF)) {
      const ref = raw.split(/[?#]/)[0];
      if (!ref || EXTERNAL.test(raw) || GENERATED.test(ref)) continue;
      if (page === 'games/3d-pro/index.html' && ref.startsWith('/src/')) {
        if (!existsSync(resolve(ROOT, 'games/3d-pro', '.' + ref))) problems.push(`${page}: no existe ${raw}`);
        continue;
      }
      if (ref.startsWith('/')) {
        problems.push(`${page}: ruta absoluta ${raw} (rompe file:// y subrutas)`);
        continue;
      }
      if (!existsSync(resolve(ROOT, dirname(page), ref))) problems.push(`${page}: no existe ${raw}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('Suite: el Dockerfile solo copia rutas versionadas en git', () => {
  const sources = [...read('Dockerfile').matchAll(/^COPY (?!--from)(\S+) /gm)].map(m => m[1]);
  assert.ok(sources.length > 0, 'el Dockerfile debe copiar algo');
  const untracked = sources.filter(src =>
    execFileSync('git', ['ls-files', '--', src], { cwd: ROOT, encoding: 'utf8' }).trim() === '');
  assert.deepEqual(untracked, []);
});

test('Suite: nginx solo marca immutable los bundles con hash y no pierde cabeceras de seguridad', { todo: 'Tarea 6' }, () => {
  const blocks = [...read('nginx.conf').matchAll(/location\s+([^{]+)\{([^}]*)\}/g)]
    .map(([, where, body]) => ({ where: where.trim(), body }));
  const immutable = blocks.filter(b => b.body.includes('immutable'));
  assert.ok(immutable.length > 0, 'falta la regla immutable para los bundles de Vite');
  for (const b of immutable) assert.match(b.where, /games\/3d-pro\/dist\/assets/, `regla immutable demasiado amplia: ${b.where}`);
  for (const b of blocks.filter(b => b.body.includes('add_header'))) {
    assert.match(b.body, /X-Content-Type-Options/, `${b.where} anula las cabeceras de seguridad del server`);
    assert.match(b.body, /X-Frame-Options/, `${b.where} anula las cabeceras de seguridad del server`);
  }
});

test('Suite: la alerta de proximidad usa una capa visible en las tres ediciones', { todo: 'Tarea 4' }, () => {
  for (const page of EDITIONS) {
    const html = read(page);
    assert.match(html, /id="yetiAlert"/, `${page}: falta la capa #yetiAlert`);
    assert.doesNotMatch(html, /boxShadow\s*=\s*[`'"]inset/, `${page}: box-shadow inset queda bajo el canvas opaco`);
  }
});

test('Suite: cada medio existe una sola vez y los originales quedan fuera del despliegue', { todo: 'Tarea 2' }, () => {
  assert.equal(existsSync(resolve(ROOT, 'games/3d-pro/public')), false, 'games/3d-pro/public duplica assets/');
  assert.deepEqual(readdirSync(ROOT).filter(f => /\.(?:mp4|webm|jpe?g)$/i.test(f)), [],
    'originales sueltos en la raíz: muévelos a art/');
});
```

- [ ] **Paso 2: Scripts de la raíz**

En `package.json` (raíz), reemplazar:

```json
    "test": "npm --workspace=games/3d-pro run test",
```

por:

```json
    "setup": "cd games/3d-pro && npm ci --workspaces=false",
    "test": "npm --workspace=games/3d-pro run test && node --test tests/*.test.js",
    "serve": "cd games/3d-pro && npx vite preview --outDir ../.. --port 4173 --strictPort --open",
```

`serve` publica la raíz completa del repo (portal, 3 ediciones y `assets/`) igual que Docker, usando el Vite ya instalado.

- [ ] **Paso 3: CI**

En `.github/workflows/ci.yml`, reemplazar:

```yaml
      - name: Install Dependencies
        run: |
          cd games/3d-pro
          npm ci

      - name: Run Test Suite (19 Unit Tests)
```

por:

```yaml
      - name: Install Dependencies
        run: |
          cd games/3d-pro
          npm ci --workspaces=false

      - name: Run Test Suite (3D PRO + guardias de la suite)
```

- [ ] **Paso 4: Ejecutar**

Ejecutar: `cd E:/Yeti && npm test`
Esperado:
- PRO con `ℹ pass 33`.
- Suite con `ℹ tests 5`, `ℹ pass 1` (Dockerfile), `ℹ todo 4`, `ℹ fail 0`. Los `todo` aparecen con su error, lo cual es correcto en este punto.

- [ ] **Paso 5: Commit**

```bash
git add tests/suite.test.js package.json .github/workflows/ci.yml
git commit -m "test: guardias de coherencia de la suite y CI instalable desde un clon limpio" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 3D PRO sin medios empaquetados (núcleo, D1)

**Archivos:**

- Modificar: `games/3d-pro/index.html`, `games/3d-pro/src/ui/MenuManager.js`, `games/3d-pro/vite.config.js`
- Eliminar: `games/3d-pro/public/`
- Test: `games/3d-pro/tests/ui.test.js`, `tests/suite.test.js`

**Interfaces:**

- Consume: los helpers `fakeDom()` y `fakeElement()` de `games/3d-pro/tests/ui.test.js`.
- Produce: `export const SUITE_ASSETS` en `MenuManager.js`. Vale `'/'` en dev y `'../../../assets/'` en build, en el IIFE y en Node.

- [ ] **Paso 1: Test que falla**

En `games/3d-pro/tests/ui.test.js`, añadir `SUITE_ASSETS` al import existente de `../src/ui/MenuManager.js`. Por ejemplo: `import { MenuManager, selectRadio, SUITE_ASSETS } from '../src/ui/MenuManager.js';`. Después, añadir al final:

```js
test('Menú: avatar desde assets/ de la suite y sin prólogo empaquetado en 3D PRO', () => {
  const elements = fakeDom();
  globalThis.document.querySelectorAll = () => [];
  new MenuManager({ record: () => 0 }, {});
  assert.equal(SUITE_ASSETS, '../../../assets/');
  assert.equal(elements.get('menuAvatar').src, '../../../assets/otter_3d_coffee.jpg');
  assert.equal(elements.has('prologueModal'), false);
});
```

Ejecutar: `cd E:/Yeti/games/3d-pro && npm test`
Esperado: FAIL con `does not provide an export named 'SUITE_ASSETS'`.

- [ ] **Paso 2: `MenuManager.js`**

Justo antes del comentario `/** Marca un botón de un radiogroup…` que precede a `export function selectRadio`, añadir:

```js
/** Carpeta assets/ compartida de la suite: Vite la sirve en dev (publicDir); en dist se resuelve desde games/3d-pro/dist/. */
export const SUITE_ASSETS = import.meta.env?.DEV ? '/' : '../../../assets/';

```

En el constructor, reemplazar el bloque completo del prólogo:

```js

    const btnPrologue = document.getElementById('btnPrologue3D');
    const closePrologue = document.getElementById('closePrologue3D');
    const modalPrologue = document.getElementById('prologueModal');
    const videoPrologue = document.getElementById('prologueVideo3D');
    if (btnPrologue && modalPrologue) {
      btnPrologue.onclick = () => {
        modalPrologue.classList.remove('hidden');
        if (videoPrologue) {
          videoPrologue.currentTime = 0;
          videoPrologue.play().catch(() => {});
        }
      };
    }
    if (closePrologue && modalPrologue) {
      closePrologue.onclick = () => {
        modalPrologue.classList.add('hidden');
        if (videoPrologue) videoPrologue.pause();
      };
    }
```

por:

```js

    const avatar = document.getElementById('menuAvatar');
    if (avatar) avatar.src = SUITE_ASSETS + 'otter_3d_coffee.jpg';
```

- [ ] **Paso 3: `index.html` de PRO**

Reemplazar la imagen del avatar:

```html
  <img src="/assets/otter_3d_coffee.jpg" onerror="this.src='../../assets/otter_3d_coffee.jpg'" alt="Nutria Alpina 3D" style="width:54px;height:54px;border-radius:12px;object-fit:cover;border:2px solid #5fe6ff;box-shadow:0 4px 12px rgba(0,0,0,0.4);flex-shrink:0;">
```

por:

```html
  <img id="menuAvatar" alt="Nutria Alpina 3D" width="54" height="54" style="width:54px;height:54px;border-radius:12px;object-fit:cover;border:2px solid #5fe6ff;box-shadow:0 4px 12px rgba(0,0,0,0.4);flex-shrink:0;">
```

Reemplazar el botón del prólogo:

```html
<button id="btnPrologue3D" type="button" style="width:100%;margin-top:10px;background:rgba(2,132,199,0.22);border:1px solid rgba(95,230,255,0.45);color:#e0f2fe;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px;border-radius:12px;">☕ Ver Prólogo en el Lago (Cinemática)</button>
```

por un enlace al portal, que sigue el mismo patrón que "Volver al Portal":

```html
<a id="btnPrologue3D" href="../../index.html#prologo" onclick="if(location.pathname.includes('/dist/'))this.href='../../../index.html#prologo'" style="margin-top:10px;background:rgba(2,132,199,0.22);border:1px solid rgba(95,230,255,0.45);color:#e0f2fe;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px;border-radius:12px;text-decoration:none;">☕ Ver prólogo en el lago (portal)</a>
```

Borrar entera la sección `<section id="prologueModal" …> … </section>`, desde `<section id="prologueModal"` hasta su `</section>`. Contiene el `<video id="prologueVideo3D">` con 3 `<source>`.

- [ ] **Paso 4: `vite.config.js`**

Reemplazar el archivo completo por:

```js
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: './',
  // assets/ de la raíz: Vite lo sirve en dev; en build no se copia (dist lo resuelve como ../../../assets/)
  publicDir: command === 'serve' ? '../../assets' : false,
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three']
        }
      }
    }
  }
}));
```

- [ ] **Paso 5: Eliminar el duplicado y activar las guardias**

`games/3d-pro/public/` está versionado desde `7f31467`, así que se borra con git:

```bash
git rm -r -q games/3d-pro/public
```

En `tests/suite.test.js`, quitar `{ todo: 'Tarea 2' }, ` de los tests "las páginas solo enlazan…" y "cada medio existe una sola vez…".

- [ ] **Paso 6: Verificar**

```bash
cd E:/Yeti && npm test
npm run build
ls games/3d-pro/dist/assets
grep -c -E "intro_lake|otter_" games/3d-pro/dist/index.html
```

Esperado:
- PRO con `ℹ pass 34`.
- Suite con `ℹ pass 3`, `ℹ todo 2` y `ℹ fail 0`.
- En `dist/assets` solo hay `app.iife.js`, `index-*.css`, `index-*.js` y `three-*.js`.
- El `grep` devuelve `0`.

En el navegador:
1. `npm run dev`: el avatar se ve (sale de `/otter_3d_coffee.jpg`, gracias a `publicDir`).
2. `npm run serve` y abrir `/games/3d-pro/dist/`: el avatar se ve.
3. Abrir `games/3d-pro/dist/index.html` con doble clic (`file://`): el avatar se ve.

- [ ] **Paso 7: Commit**

```bash
git add games/3d-pro tests/suite.test.js
git commit -m "fix(3d-pro): sin medios empaquetados; avatar desde assets/ de la suite y prólogo enlazado al portal" -m "Elimina Enter/Escape/Espacio en conflicto con el modal y 13 MB de video duplicado en dist." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Portal con prólogo y galería accesibles y ligeros (núcleo)

**Archivos:**

- Modificar: `index.html` (marcado, CSS y script final)
- Test: `tests/suite.test.js`

**Interfaces:**

- Consume: el enlace `#prologo` de la Tarea 2.
- Produce: `showModal(modal, focusTarget)`, `hideModal(modal)` y `openIntro(muted?)` en el script del portal.

- [ ] **Paso 1: Test que falla**

Añadir al final de `tests/suite.test.js`:

```js
test('Portal: prólogo ligero y accesible, galería operable con teclado', () => {
  const html = read('index.html');
  assert.match(html, /<div id="intro-modal" class="intro-modal-backdrop hidden"/, 'sin JS el modal no debe tapar el portal');
  assert.match(html, /<video id="intro-video"[^>]*preload="none"/);
  assert.match(html, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(html, /location\.hash === '#prologo'/);
  assert.match(html, /\.inert = true/);
  const cards = (html.match(/<article class="character-card"/g) || []).length;
  const buttons = (html.match(/<button type="button" class="character-zoom-hint">/g) || []).length;
  assert.ok(cards > 0 && buttons === cards, 'cada tarjeta necesita un botón "Ampliar" alcanzable con teclado');
});
```

Ejecutar: `cd E:/Yeti && node --test tests/suite.test.js`
Esperado: FAIL en "Portal: …".

- [ ] **Paso 2: Marcado**

En `index.html`:
- Cambiar `<div id="intro-modal" class="intro-modal-backdrop" role="dialog"` por `<div id="intro-modal" class="intro-modal-backdrop hidden" role="dialog"`.
- En `<video id="intro-video" playsinline controls loop preload="auto" poster="./assets/otter_3d_coffee.jpg">`, cambiar `preload="auto"` por `preload="none"`.
- Reemplazar las **3** apariciones de `<span class="character-zoom-hint">🔍 Ampliar Arte</span>` por `<button type="button" class="character-zoom-hint">🔍 Ampliar arte</button>`.

- [ ] **Paso 3: CSS**

Justo después de la regla existente `.character-card:hover .character-zoom-hint { opacity: 1; }`, añadir:

```css
    .character-zoom-hint {
      font-family: inherit;
      cursor: pointer;
    }
    .character-card:focus-within .character-zoom-hint {
      opacity: 1;
    }
    @media (hover: none) {
      .character-zoom-hint { opacity: 1; }
    }
```

- [ ] **Paso 4: Script**

Reemplazar todo el tramo que va desde la línea `    // 4. Cinematic Intro Video Modal Controls` hasta el `});` que cierra el listener de `keydown` (justo antes de `  </script>`) por:

```js
    // 4. Modales accesibles: fondo inerte, foco dentro y retorno del foco al cerrar
    const introModal = document.getElementById('intro-modal');
    const introVideo = document.getElementById('intro-video');
    const btnCloseIntro = document.getElementById('btn-close-intro');
    const btnEnterHub = document.getElementById('btn-enter-hub');
    const btnHeroIntro = document.getElementById('hero-btn-intro');
    const btnToggleSound = document.getElementById('btn-toggle-sound');
    const soundIcon = document.getElementById('sound-icon');
    const soundLabel = document.getElementById('sound-label');
    const cbAutoIntro = document.getElementById('cb-auto-intro');
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const btnCloseLightbox = document.getElementById('btn-close-lightbox');
    const background = [document.querySelector('main.portal-container'), document.getElementById('snow-bg')];
    let returnFocus = null;

    function showModal(modal, focusTarget) {
      returnFocus = document.activeElement;
      modal.classList.remove('hidden');
      background.forEach(el => { if (el) el.inert = true; });
      focusTarget.focus();
    }

    function hideModal(modal) {
      if (modal.classList.contains('hidden')) return;
      modal.classList.add('hidden');
      background.forEach(el => { if (el) el.inert = false; });
      if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
      returnFocus = null;
    }

    function syncSoundLabel() {
      soundIcon.textContent = introVideo.muted ? '🔇' : '🔊';
      soundLabel.textContent = introVideo.muted ? 'Activar Sonido' : 'Silenciar';
    }

    function openIntro(muted) {
      if (typeof muted === 'boolean') introVideo.muted = muted;
      syncSoundLabel();
      showModal(introModal, btnEnterHub);
      introVideo.currentTime = 0;
      introVideo.play().catch(() => {});
    }

    function closeIntro() {
      introVideo.pause();
      hideModal(introModal);
    }

    btnCloseIntro.addEventListener('click', closeIntro);
    btnEnterHub.addEventListener('click', closeIntro);
    btnHeroIntro.addEventListener('click', () => openIntro());
    btnToggleSound.addEventListener('click', () => {
      introVideo.muted = !introVideo.muted;
      syncSoundLabel();
    });
    introModal.addEventListener('click', (e) => {
      if (e.target === introModal) closeIntro();
    });

    // Autoarranque silencioso solo si el usuario no lo desactivó ni pide menos movimiento o ahorro de datos
    let autoDisabled = false;
    try { autoDisabled = localStorage.getItem('otter_intro_disabled') === 'true'; } catch (e) {}
    cbAutoIntro.checked = !autoDisabled;
    cbAutoIntro.addEventListener('change', () => {
      try { localStorage.setItem('otter_intro_disabled', cbAutoIntro.checked ? 'false' : 'true'); } catch (e) {}
    });
    const quietStart = matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData === true;
    if (location.hash === '#prologo') openIntro(true);
    else if (!autoDisabled && !quietStart) openIntro(true);

    // 5. Lightbox de arte
    function closeLightbox() {
      hideModal(lightboxModal);
    }

    btnCloseLightbox.addEventListener('click', closeLightbox);
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) closeLightbox();
    });

    document.querySelectorAll('.character-card').forEach(card => {
      card.addEventListener('click', () => {
        const img = card.querySelector('img');
        lightboxImg.src = card.getAttribute('data-full');
        lightboxImg.alt = img ? img.alt : '';
        lightboxCaption.textContent = card.getAttribute('data-caption') || '';
        showModal(lightboxModal, btnCloseLightbox);
      });
    });

    // 6. Escape cierra el modal abierto
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!lightboxModal.classList.contains('hidden')) closeLightbox();
      else if (!introModal.classList.contains('hidden')) closeIntro();
    });
```

Los modales con `.hidden` usan `visibility: hidden`, así que su contenido no recibe foco. El fondo inerte encierra el foco dentro del modal abierto.

- [ ] **Paso 5: Verificar**

Ejecutar: `cd E:/Yeti && node --test tests/suite.test.js`
Esperado: "Portal: …" PASS.

Con `npm run serve`, en `http://localhost:4173/`:
1. Primera visita: el modal aparece silenciado y el foco está en "Entrar a la Montaña". Tab no sale del modal. Escape lo cierra.
2. Desmarcar "Mostrar prólogo…" y recargar: no hay modal y en la pestaña Network **no** aparece ninguna petición a `intro_lake.mp4`.
3. Con `prefers-reduced-motion: reduce` emulado (Playwright `page.emulateMedia({ reducedMotion: 'reduce' })` o el panel Rendering de DevTools) no hay autoplay.
4. `http://localhost:4173/#prologo` abre el modal.
5. Con Tab hasta "🔍 Ampliar arte" y Enter se abre el lightbox, con el `alt` de la tarjeta. Escape lo cierra y el foco vuelve al botón.

- [ ] **Paso 6: Commit**

```bash
git add index.html tests/suite.test.js
git commit -m "fix(portal): prólogo y galería accesibles (foco, fondo inerte, teclado), sin precarga de 6,6 MB y con enlace #prologo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Alerta de proximidad visible en 2D y Standalone (núcleo)

**Archivos:**

- Modificar: `games/3d-standalone/index.html` (marcado, CSS y `updateHUD`)
- Modificar: `games/2d-retro/index.html` (marcado, CSS, `cacheDOM`, el método nuevo `setYetiAlert`, `updateHUD` y los 3 reinicios)
- Test: `tests/suite.test.js`

**Interfaces:**

- Produce: la capa `#yetiAlert` en las dos ediciones, con la misma fórmula que `yetiAlertLevel()` de PRO.

- [ ] **Paso 1: Activar la guardia (roja)**

En `tests/suite.test.js`, quitar `{ todo: 'Tarea 4' }, ` del test "la alerta de proximidad usa una capa visible…".

Ejecutar: `cd E:/Yeti && node --test tests/suite.test.js`
Esperado: FAIL, con `games/2d-retro/index.html: falta la capa #yetiAlert`.

- [ ] **Paso 2: Standalone**

Marcado: reemplazar `<div id="viewport"></div>` por:

```html
<div id="viewport"></div><div id="yetiAlert" aria-hidden="true"></div>
```

CSS: insertar justo antes de `</style>`:

```css
#yetiAlert{position:fixed;inset:0;z-index:2;pointer-events:none;opacity:0;transition:opacity .25s linear}#yetiAlert::before{content:"";position:absolute;inset:0;box-shadow:inset 0 0 90px 14px rgba(239,68,68,.85)}#yetiAlert.on::before{animation:yetiAlertPulse .9s ease-in-out infinite alternate}@keyframes yetiAlertPulse{from{opacity:.55}to{opacity:1}}@media (prefers-reduced-motion:reduce){#yetiAlert.on::before{animation:none}}
```

JS: en `updateHUD`, reemplazar:

```js
const gap=Math.max(0,player.d-yeti.d);if(active&&gap<65){const a=Math.min(.65,.2+(65-gap)/75);$('viewport').style.boxShadow='inset 0 0 55px rgba(239,68,68,'+a.toFixed(2)+')';}else $('viewport').style.boxShadow='none';
```

por:

```js
const gap=player.d-yeti.d,alertLvl=(state==='playing'||state==='caught')&&active&&gap<65?Math.round(Math.min(1,.35+.65*(1-Math.max(0,gap)/65))*100)/100:0;$('yetiAlert').style.opacity=String(alertLvl);$('yetiAlert').classList.toggle('on',alertLvl>0);
```

`updateHUD()` corre cada 40 ms en todos los estados, así que la alerta se apaga sola al salir de la partida.

- [ ] **Paso 3: 2D, marcado y CSS**

Después de `<canvas id="gameCanvas" width="480" height="720"></canvas>`, añadir:

```html
    <div id="yetiAlert" aria-hidden="true"></div>
```

Después de la regla `#gameCanvas { … }`, añadir:

```css
    #yetiAlert {
      position: absolute;
      inset: 0;
      z-index: 5;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.25s linear;
    }

    #yetiAlert::before {
      content: "";
      position: absolute;
      inset: 0;
      box-shadow: inset 0 0 70px 10px rgba(239, 68, 68, 0.85);
    }

    #yetiAlert.on::before {
      animation: yetiAlertPulse 0.9s ease-in-out infinite alternate;
    }

    @keyframes yetiAlertPulse {
      from { opacity: 0.55; }
      to { opacity: 1; }
    }

    @media (prefers-reduced-motion: reduce) {
      #yetiAlert.on::before { animation: none; }
    }
```

El `z-index` 5 queda por encima del canvas y por debajo del HUD y los overlays de 2D, que usan valores entre 10 y 25.

- [ ] **Paso 4: 2D, JS**

En `cacheDOM()`, después de `          yetiAlertBanner: document.getElementById('yeti-alert-banner'),`, añadir:

```js
          yetiAlert: document.getElementById('yetiAlert'),
```

Justo antes de `      updateHUD() {`, añadir el método:

```js
      setYetiAlert(level) {
        const el = this.dom.yetiAlert;
        if (!el) return;
        const lvl = String(Math.round(level * 100) / 100);
        if (el.dataset.level === lvl) return;
        el.dataset.level = lvl;
        el.style.opacity = lvl;
        el.classList.toggle('on', Number(lvl) > 0);
      }

```

En `updateHUD()`, hacer tres reemplazos.

(a) Rama `INACTIVE`. Reemplazar:

```js
            this.dom.hudYetiDist.style.color = rem <= 100 ? '#f59e0b' : '#f8fafc';
            if (this.dom.canvas) this.dom.canvas.style.boxShadow = 'none';
```

por:

```js
            this.dom.hudYetiDist.style.color = rem <= 100 ? '#f59e0b' : '#f8fafc';
            this.setYetiAlert(0);
```

(b) Rama de persecución. Reemplazar:

```js
            if (sepMeters < 65) {
              const alpha = Math.min(0.65, 0.2 + (65 - sepMeters) / 75);
              if (this.dom.canvas) this.dom.canvas.style.boxShadow = `inset 0 0 50px rgba(239, 68, 68, ${alpha.toFixed(2)})`;
            } else {
              if (this.dom.canvas) this.dom.canvas.style.boxShadow = 'none';
            }
```

por:

```js
            this.setYetiAlert(sepMeters < 65 ? Math.min(1, 0.35 + 0.65 * (1 - sepMeters / 65)) : 0);
```

En esa misma rama, cambiar el texto `'¡El Yeti está a:'` por `'El Yeti está a:'`, porque el signo de apertura no tiene cierre.

(c) Rama `ESCAPED`. Reemplazar:

```js
            this.dom.hudYetiDist.style.color = '#10b981';
            if (this.dom.canvas) this.dom.canvas.style.boxShadow = 'none';
```

por:

```js
            this.dom.hudYetiDist.style.color = '#10b981';
            this.setYetiAlert(0);
```

Para los reinicios de menú, partida nueva y game over, reemplazar las **3** apariciones (con `replace_all`) de:

```js
        this.dom.yetiAlertBanner.style.display = 'none';
        this.dom.escapeBanner.style.display = 'none';
```

por:

```js
        this.dom.yetiAlertBanner.style.display = 'none';
        this.dom.escapeBanner.style.display = 'none';
        this.setYetiAlert(0);
```

Comprobar: `grep -c "setYetiAlert(" games/2d-retro/index.html` debe dar `7` (1 definición, 3 en `updateHUD` y 3 en los reinicios).

Después, `grep -n "this.dom.canvas" games/2d-retro/index.html`: si no quedan usos, borrar la entrada `canvas:` de `cacheDOM()`, porque ese huérfano lo dejó este cambio.

- [ ] **Paso 5: Verificar**

Ejecutar: `cd E:/Yeti && npm test`
Esperado: suite con `ℹ pass 5`, `ℹ todo 1` (nginx) y `ℹ fail 0`.

En el navegador:
- **2D:** elegir aparición a 500 m y esperar unos 25 s. Al acercarse el Yeti se ven los bordes rojos latiendo. Se apagan en el game over y al volver al menú.
- **Standalone:** si el panel F2 tiene "Invocar Yeti", usarlo; si no, esperar como en 2D. Se ve la misma alerta.
- **Táctil en las dos:** con la alerta encendida, `document.elementFromPoint(innerWidth - 40, innerHeight - 40)` devuelve un botón táctil, no la capa.

- [ ] **Paso 6: Commit**

```bash
git add games/2d-retro/index.html games/3d-standalone/index.html tests/suite.test.js
git commit -m "fix(2d,3d-standalone): alerta de proximidad visible en una capa sobre el canvas, como 3D PRO" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Arte con derivados reproducibles y reemplazo de la imagen dañada (núcleo, D3)

**Archivos:**

- Crear: `scripts/build_assets.py`
- Regenerar: `assets/otter_3d_coffee.jpg`, `assets/otter_cartoon_wanderer.jpg`, `assets/otter_2d_pixel.jpg`
- Crear: `assets/otter_3d_coffee_1600.jpg`, `assets/otter_cartoon_wanderer_1600.jpg`, `assets/otter_2d_pixel_1600.jpg`
- Modificar: `index.html` (los 3 `data-full`)

**Interfaces:**

- Consume: los originales de `art/` (Tarea 0).
- Produce: `<nombre>.jpg` de 1024 px de ancho, para tarjetas y avatares, y `<nombre>_1600.jpg` de hasta 1600 px, para el lightbox.

- [ ] **Paso 1: Script**

Crear `scripts/build_assets.py`:

```python
"""Genera los derivados web de assets/ a partir de los originales de art/ (requiere Pillow)."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ART, OUT = ROOT / 'art', ROOT / 'assets'

# salida: (original en art/, recorte (izq, sup, der, inf) en px del original o None)
SOURCES = {
    'otter_3d_coffee': ('Otter_character_design_20261011142610.jpg', None),
    'otter_cartoon_wanderer': ('Otter_character_design_illustration_2K_20261011142607.jpg', None),
    # Escena pixel-art limpia del lago, recorte 16:9 con la nutria centrada (el original pixel 2K está dañado)
    'otter_2d_pixel': ('Otter_wearing_sweater_by_lake_2K_20261011145358.jpg', (1248, 690, 2752, 1536)),
}
WIDTHS = {'': 1024, '_1600': 1600}  # tarjeta y avatar / lightbox


def main():
    for name, (source, box) in SOURCES.items():
        image = Image.open(ART / source).convert('RGB')
        if box:
            image = image.crop(box)
        for suffix, width in WIDTHS.items():
            w = min(width, image.width)
            h = round(image.height * w / image.width)
            out = OUT / f'{name}{suffix}.jpg'
            image.resize((w, h), Image.LANCZOS).save(out, 'JPEG', quality=82, optimize=True, progressive=True)
            print(f'{out.relative_to(ROOT)}  {w}x{h}  {out.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
```

- [ ] **Paso 2: Generar y revisar a ojo**

```bash
cd E:/Yeti && python scripts/build_assets.py
```

Esperado: 6 líneas, cada una de 300 KB o menos.

Abrir `assets/otter_2d_pixel.jpg` con la herramienta de lectura de imágenes. Tiene que verse la nutria pixel-art con suéter y la taza, **centrada** y sin mancha gris. Si no está centrada, ajustar `box` y volver a generar. Los avatares de 52 px usan `object-fit: cover` sobre el centro.

- [ ] **Paso 3: Lightbox a 1600 px**

En `index.html`, en los 3 `<article class="character-card" data-full="…">`, cambiar `data-full="./assets/otter_3d_coffee.jpg"`, `data-full="./assets/otter_2d_pixel.jpg"` y `data-full="./assets/otter_cartoon_wanderer.jpg"` por las versiones `…_1600.jpg`.

- [ ] **Paso 4: Verificar y hacer commit**

Ejecutar: `cd E:/Yeti && npm test`
Esperado: la guardia de referencias sigue en verde, porque comprueba que los `data-full` existen.

```bash
git add scripts/build_assets.py assets index.html
git commit -m "fix(arte): reemplaza la nutria pixel dañada, derivados reproducibles y lightbox a 1600 px" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Infraestructura — nginx, bundle `file://` y `jugar.bat` (núcleo)

**Archivos:**

- Modificar: `nginx.conf` (archivo completo), `jugar.bat` (archivo completo), `games/3d-pro/scripts/postbuild.js`
- Crear: `games/3d-pro/scripts/patch-html.js`, `games/3d-pro/tests/build.test.js`
- Test: `tests/suite.test.js`

**Interfaces:**

- Produce: `export function patchHtml(html: string): string` en `games/3d-pro/scripts/patch-html.js`.

- [ ] **Paso 1: Tests que fallan del postbuild**

Crear `games/3d-pro/tests/build.test.js`:

```js
// tests/build.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { patchHtml } from '../scripts/patch-html.js';

const VITE_HTML = `<!DOCTYPE html>
<html><head>
<script type="module" crossorigin src="./assets/index-AbCdEf12.js"></script>
<link rel="modulepreload" crossorigin href="./assets/three-XyZ12345.js">
<link rel="stylesheet" crossorigin href="./assets/index-QwErTy12.css">
</head><body></body></html>`;

test('Postbuild: un solo CSS enlazado sin crossorigin y sin copia inline', () => {
  const html = patchHtml(VITE_HTML);
  assert.match(html, /<link rel="stylesheet" href="\.\/assets\/index-QwErTy12\.css">/);
  assert.doesNotMatch(html, /<style>/);
});

test('Postbuild: ESM y modulepreload solo por http; IIFE en file://', () => {
  const html = patchHtml(VITE_HTML);
  assert.doesNotMatch(html, /<script type="module"/);
  assert.doesNotMatch(html, /<link rel="modulepreload"/);
  assert.match(html, /location\.protocol === 'file:'/);
  assert.match(html, /\.\/assets\/app\.iife\.js/);
  assert.match(html, /"\.\/assets\/index-AbCdEf12\.js"/);
  assert.match(html, /\["\.\/assets\/three-XyZ12345\.js"\]/);
});

test('Postbuild: falla con un mensaje claro si cambia el formato de Vite', () => {
  assert.throws(() => patchHtml('<html><head></head></html>'), /no se encontró el script ESM/);
});
```

Ejecutar: `cd E:/Yeti/games/3d-pro && npm test`
Esperado: FAIL con `Cannot find module …/scripts/patch-html.js`.

- [ ] **Paso 2: `patch-html.js` y `postbuild.js`**

Crear `games/3d-pro/scripts/patch-html.js`:

```js
/**
 * Parchea el index.html de Vite para que funcione igual en http(s):// (bundle ESM) y en file:/// (bundle IIFE):
 * - el CSS se enlaza sin crossorigin (en file:// una petición CORS con origen null falla);
 * - el script ESM y su modulepreload se insertan solo fuera de file://.
 */
export function patchHtml(html) {
  const moduleSrc = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/)?.[1];
  if (!moduleSrc) throw new Error('postbuild: no se encontró el script ESM de Vite en index.html');
  const preloads = [...html.matchAll(/<link rel="modulepreload" crossorigin href="([^"]+)">/g)].map(m => m[1]);
  const loader = `<script>
  (function () {
    if (location.protocol === 'file:') {
      var s = document.createElement('script');
      s.src = './assets/app.iife.js';
      document.head.appendChild(s);
      return;
    }
    ${JSON.stringify(preloads)}.forEach(function (href) {
      var l = document.createElement('link');
      l.rel = 'modulepreload'; l.crossOrigin = ''; l.href = href;
      document.head.appendChild(l);
    });
    var m = document.createElement('script');
    m.type = 'module'; m.crossOrigin = ''; m.src = ${JSON.stringify(moduleSrc)};
    document.head.appendChild(m);
  })();
  </script>`;
  return html
    .replace(/<script type="module" crossorigin src="[^"]+"><\/script>\n?/, '')
    .replace(/<link rel="modulepreload" crossorigin href="[^"]+">\n?/g, '')
    .replace(/<link rel="stylesheet" crossorigin href="/g, '<link rel="stylesheet" href="')
    .replace('</head>', `${loader}\n</head>`);
}
```

Reemplazar `games/3d-pro/scripts/postbuild.js` completo por:

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { patchHtml } from './patch-html.js';

const htmlPath = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/index.html');
writeFileSync(htmlPath, patchHtml(readFileSync(htmlPath, 'utf8')), 'utf8');
console.log('✓ postbuild: dist/index.html listo para file:/// (IIFE) y http:// (ESM)');
```

Ejecutar: `cd E:/Yeti/games/3d-pro && npm test`
Esperado: `ℹ pass 37`.

- [ ] **Paso 3: nginx**

Reemplazar `nginx.conf` completo por:

```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip Compression for fast delivery of scripts, styles and HTML
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        application/json
        application/javascript
        application/rss+xml
        application/atom+xml
        image/svg+xml;

    # Security Headers. nginx NO hereda add_header en un location que define los suyos: se repiten en cada uno.
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Backward compatibility redirects from legacy routes
    rewrite ^/snowEscape2D\.html$ /games/2d-retro/index.html permanent;
    rewrite ^/yetiAstra\.html$ /games/3d-standalone/index.html permanent;
    rewrite ^/Pro/.*$ /games/3d-pro/dist/index.html permanent;

    # Main Hub and routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Bundles de Vite con hash en el nombre: inmutables (cada build cambia el nombre)
    location ~* ^/games/3d-pro/dist/assets/[^/]+-[A-Za-z0-9_-]+\.(?:css|js)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        access_log off;
    }

    # Estáticos sin hash (arte, video, bundle IIFE): 1 día y revalidación
    location ~* \.(?:css|js|woff2?|svg|png|jpg|jpeg|gif|webp|avif|ico|mp3|wav|ogg|mp4|webm)$ {
        add_header Cache-Control "public, max-age=86400, must-revalidate";
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        access_log off;
    }

    # Ensure HTML entry points always fetch the newest versions
    location ~* \.html$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        expires 0;
    }

    # Standard error pages
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

En `tests/suite.test.js`, quitar `{ todo: 'Tarea 6' }, ` del test de nginx.

- [ ] **Paso 4: `jugar.bat`**

Reemplazar el archivo completo y guardarlo con **CRLF**. `.gitattributes` lo mantiene así en los checkouts.

```bat
@echo off
cd /d "%~dp0"
title Otter Escape: Yeti Chase - Centro de Lanzamiento
chcp 65001 >nul
cls

echo =======================================================================
echo        🦦  OTTER ESCAPE: YETI CHASE — SUITE ALPINA COMPLETA
echo =======================================================================
echo.
echo   [1] Portal de Juegos (Hub Principal - Acceso a las 3 ediciones)
echo   [2] Suite completa en servidor local (http://localhost:4173, requiere Node.js)
echo   [3] Otter Escape 2D Retro (Canvas SkiFree clásico)
echo   [4] Otter Escape 3D Standalone (Three.js ultra-ligero)
echo.
echo =======================================================================
set /p opt="Selecciona una opción (1-4) [Por defecto: 1]: "

if "%opt%"=="2" goto opt_server
if "%opt%"=="3" goto opt_2d
if "%opt%"=="4" goto opt_3d

:opt_hub
echo Abriendo Portal de Juegos...
start "" "index.html"
exit /b

:opt_server
if not exist "games\3d-pro\node_modules" call npm run setup
if not exist "games\3d-pro\dist\index.html" call npm run build
echo Sirviendo la suite completa en http://localhost:4173/ (Ctrl+C para salir)...
call npm run serve
exit /b

:opt_2d
echo Abriendo Otter Escape 2D...
start "" "games\2d-retro\index.html"
exit /b

:opt_3d
echo Abriendo Otter Escape 3D Standalone...
start "" "games\3d-standalone\index.html"
exit /b
```

Después de guardar, repetir la conversión a CRLF del Paso 3 de la Tarea 0 y comprobar que el conteo de CRLF es igual al de LF.

- [ ] **Paso 5: Declarar esbuild (opcional, con salvaguarda)**

```bash
cd E:/Yeti/games/3d-pro
npm install --save-dev --save-exact esbuild@0.25.12 --workspaces=false
cd E:/Yeti && git status --short
ls package-lock.json node_modules 2>&1
```

Esperado: solo cambian `games/3d-pro/package.json` y `games/3d-pro/package-lock.json`, y **no** existen `package-lock.json` ni `node_modules/` en la raíz. Si aparecen, revertir con `git checkout -- games/3d-pro/package.json games/3d-pro/package-lock.json`, borrar los de la raíz y saltar este paso. Es un riesgo aceptado: esbuild ya llega fijado a 0.25.12 por el lockfile, a través de Vite.

- [ ] **Paso 6: Verificar build, Docker y cabeceras**

```bash
cd E:/Yeti && npm test && npm run build
grep -c "<style>" games/3d-pro/dist/index.html
docker build -t otter-escape:review .
docker image ls otter-escape:review --format "{{.Size}}"
docker run -d --rm -p 8089:80 --name otter-review otter-escape:review
curl -sI http://localhost:8089/ | grep -iE "x-frame-options|x-content-type-options|cache-control"
curl -sI http://localhost:8089/assets/intro_lake.mp4 | grep -iE "cache-control|accept-ranges"
curl -sI "http://localhost:8089/games/3d-pro/dist/assets/$(ls games/3d-pro/dist/assets | grep '^three-')" | grep -i "cache-control"
docker stop otter-review
```

Esperado:
- Todo en verde: suite con `ℹ pass 6`, `ℹ todo 0` y `ℹ fail 0`.
- `<style>` = `0`.
- El tamaño de la imagen queda **anotado para la Tarea 7**; debería rondar 33–34 MB, con el video una sola vez.
- `/`: lleva `X-Frame-Options` y `X-Content-Type-Options`.
- El mp4: `max-age=86400, must-revalidate` y `Accept-Ranges: bytes`.
- `three-*.js`: `immutable`.

En el navegador, abrir `games/3d-pro/dist/index.html` en `file://`. Los estilos tienen que cargar y la consola **no** debe mostrar errores CORS.

- [ ] **Paso 7: Commit**

```bash
git add nginx.conf jugar.bat games/3d-pro tests/suite.test.js
git commit -m "fix(infra): caché inmutable solo con hash, cabeceras de seguridad en toda respuesta, cargador file:// sin duplicados y lanzador que sirve la suite" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Documentación fiel al código y créditos del arte (núcleo)

**Archivos:**

- Crear: `assets/CREDITS.md`
- Modificar: `README.md`, `index.html` (portal), `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/VALIDATION.md`, `games/3d-pro/README.md`
- Reemplazar: `games/3d-pro/VALIDATION.txt` (copia de `docs/VALIDATION.md`)

**Interfaces:**

- Consume: el tamaño de la imagen Docker (Tarea 6, Paso 6), la salida real de `npm test` y del build, y el tamaño real de `games/3d-standalone/index.html` (`wc -c`).

- [ ] **Paso 1: Medir**

```bash
cd E:/Yeti
npm test 2>&1 | grep -E "^(✔|ℹ (tests|pass|fail|todo))"
npm run build 2>&1 | grep -E "kB|built in"
wc -c games/3d-standalone/index.html
```

- [ ] **Paso 2: Créditos (D6)**

Crear `assets/CREDITS.md`:

```markdown
# Créditos y licencia de los medios

El código de este repositorio se distribuye bajo licencia MIT. **Los archivos de esta carpeta no están cubiertos por la licencia MIT**: son arte y video del autor del proyecto, con todos los derechos reservados salvo indicación expresa del autor.

| Archivo | Uso | Original (en `art/`, fuera de git) |
| :--- | :--- | :--- |
| `intro_lake.mp4` | Prólogo del portal | `Otter_pouring_coffee_by_lake_20261011143032.mp4` |
| `otter_3d_coffee.jpg`, `otter_3d_coffee_1600.jpg` | Tarjeta de 3D PRO, galería, avatares de PRO y Standalone, póster del prólogo | `Otter_character_design_20261011142610.jpg` |
| `otter_cartoon_wanderer.jpg`, `otter_cartoon_wanderer_1600.jpg` | Tarjeta de 3D Standalone y galería | `Otter_character_design_illustration_2K_20261011142607.jpg` |
| `otter_2d_pixel.jpg`, `otter_2d_pixel_1600.jpg` | Tarjeta de 2D, galería y avatar de 2D | Recorte de `Otter_wearing_sweater_by_lake_2K_20261011145358.jpg` |

Las imágenes se regeneran con `python scripts/build_assets.py` (requiere Pillow).
El video se regenera con ffmpeg: `ffmpeg -y -i art/Otter_pouring_coffee_by_lake_20261011143032.mp4 -vf scale=1280:-2 -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 96k assets/intro_lake.mp4`.
```

- [ ] **Paso 3: Afirmaciones desactualizadas (texto exacto → nuevo)**

En estas tablas, `XX` son los KB reales de `games/3d-standalone/index.html` medidos en el Paso 1, redondeados. Escribe el número, no "XX".

**README.md**

| Texto actual | Texto nuevo |
| :--- | :--- |
| `en un único archivo autosuficiente (~51 KB)` | `en un único HTML (~XX KB) que solo comparte su avatar con \`assets/\`` |
| `(Three.js CDN, ~51 KB)` (2 veces) | `(Three.js CDN, ~XX KB)` |
| `# Suite de 33 tests unitarios nativos verificados` | `# Tests unitarios nativos (node --test)` |
| `# Postbuild: inyección CSS inline y bundle IIFE universal` | `# Postbuild: cargador universal (ESM por http, IIFE en file://)` |
| `# Bundle de producción optimizado (ESM + IIFE fallback)` | `# Bundle de producción (ESM + IIFE); medios desde ../../../assets/` |
| `Nginx Alpine ~26.5 MB` y `(~26.5 MB)` | El tamaño medido en la Tarea 6 |
| `**✅ Suite de 33 tests nativos (Node.js)**` | `**✅ Tests nativos (Node.js) + guardias de suite**` |
| `# 2. Ejecutar la suite completa de 33 tests unitarios certificados` | `# 2. Ejecutar los tests de 3D PRO y las guardias de la suite` |
| El comando de instalación del bloque "# 1. Instalar dependencias del monorepo" | `npm run setup` |

Añadir debajo de ese bloque de comandos: `npm run serve  # suite completa en http://localhost:4173 (como Docker)`.

**Portal (`index.html`)**

| Texto actual | Texto nuevo |
| :--- | :--- |
| `0 (100% Autocontenido)` | `0 de código (arte compartido en assets/)` |
| `un único archivo ultraligero de ~51 KB` | `un único HTML ultraligero de ~XX KB` |
| `~51 KB (Standalone)` | `~XX KB (Standalone)` |
| `(~51 KB standalone)` | `(~XX KB standalone)` |
| `1 archivo (~51 KB CDN)` | `1 HTML (~XX KB, Three.js por CDN)` |
| `33/33 Tests Passing` | `Tests nativos ✔` |
| `33 tests nativos automatizados (<code>node --test</code>)` | `Tests nativos automatizados (<code>node --test</code>)` |

**`docs/DEPLOYMENT.md`**
- Cambiar `suite de 33 tests unitarios certificados` por `suite de tests unitarios`.
- Reemplazar la sección `## 💻 Opción 4: Ejecución Local en Windows (Sin Servidor Remoto)` completa, hasta el final del archivo, por:

````markdown
## 💻 Opción 4: Ejecución Local en Windows (Sin Servidor Remoto)

1. **Lanzador `jugar.bat`:** doble clic. Las opciones 1, 3 y 4 abren el portal, 2D o Standalone directamente como archivo (`file:///`). La opción 2 instala dependencias si faltan, compila 3D PRO si no hay `dist/` y sirve la suite completa en `http://localhost:4173/`.
2. **Desde terminal:**
   ```bash
   npm run setup   # cd games/3d-pro && npm ci --workspaces=false (el lockfile vive ahí)
   npm run build
   npm run serve   # sirve la raíz del repo: portal, 3 ediciones y assets/, igual que Docker
   ```
3. **Sin servidor (`file:///`):** después de `npm run build`, `games/3d-pro/dist/index.html` carga el bundle IIFE (los módulos ES están bloqueados por CORS en `file:///`). El CSS se enlaza sin `crossorigin`, así que no hace falta copiarlo inline.

**Caché en producción (nginx):** solo los bundles de Vite con hash se sirven como `immutable`. El arte, el video y `app.iife.js` usan `max-age=86400, must-revalidate`, así que un reemplazo con el mismo nombre llega en un día como máximo.
````

**`docs/ARCHITECTURE.md`**
- Reemplazar la sección `## 📦 6. Pipeline de Empaquetado & Compatibilidad Universal (\`file:///\` y \`http://\`)` completa, hasta `## 📁 7.`, por:

```markdown
## 📦 6. Pipeline de Empaquetado & Compatibilidad Universal (`file:///` y `http://`)

`npm run build` en `games/3d-pro` ejecuta tres pasos:

1. **Vite** genera el bundle ESM con hash (`index-[hash].js`, `three-[hash].js`, `index-[hash].css`).
2. **esbuild** genera `assets/app.iife.js`, un bundle clásico (sin `type="module"`) para `file:///`, donde Chrome bloquea los módulos ES por CORS (origen `null`).
3. **`scripts/postbuild.js`** aplica `patchHtml()` (`scripts/patch-html.js`) a `dist/index.html`:
   - enlaza el CSS sin `crossorigin`, que funciona en `file:///` y en `http://` sin copia inline;
   - quita el `<script type="module">` y el `modulepreload` estáticos e inserta un cargador: en `file:` carga `app.iife.js` y en `http(s):` añade el `modulepreload` y el módulo ESM.

**Medios compartidos.** 3D PRO no empaqueta imágenes ni video. Los toma de la carpeta `assets/` de la raíz con la ruta `../../../assets/` desde `games/3d-pro/dist/`, igual en `file:///`, en `npm run serve` y en Docker. En desarrollo (`npm run dev`), Vite sirve esa carpeta como `publicDir`; en el build `publicDir` está desactivado para no duplicar el video.
```

- En el árbol de `## 📁 7.`, cambiar `# Suite de 33 tests unitarios (Node.js nativo)` por `# Tests unitarios (Node.js nativo)`. Añadir la línea `│   ├── build.test.js            # Tests del cargador universal (postbuild)` y, en la raíz del árbol general, `tests/suite.test.js` (guardias de suite).

**`games/3d-pro/README.md`**
- En el badge, cambiar `Tests-33%2F33%20Passing` por `Tests-N%2FN%20Passing`, con N igual al total de PRO del Paso 1 (38 con las tareas núcleo y la Task 8).
- Cambiar `# 3. Ejecutar suite completa de 33 pruebas automatizadas` por `# 3. Ejecutar las pruebas automatizadas`.
- Cambiar `**33/33 especificaciones críticas**` por `**N/N especificaciones críticas**` y `en cinco suites` por `en seis suites`.
- Añadir la subsección `### 6. Build universal ([\`tests/build.test.js\`](tests/build.test.js) — 3 tests)` con 3 viñetas: CSS único sin `crossorigin`; ESM y modulepreload solo por http con IIFE en `file://`; error claro si cambia el formato de Vite.
- En la subsección de `tests/ui.test.js`, sumar 1 al conteo y añadir la viñeta `✅ **Avatar compartido:** el menú toma el avatar de \`assets/\` de la suite y no empaqueta el prólogo.`.
- En la subsección de `tests/entities.test.js`, sumar 1 al conteo y añadir la viñeta `✅ **Suéter oficial:** torso, cuello alto y mangas con el material mostaza \`#e3a72f\` y punto \`#d9661f\`.`.
- Cambiar `MIT License. Todos los recursos visuales, matemáticos y acústicos son 100% sintéticos y libres de dependencias de terceros.` por `Código bajo licencia MIT. Modelos, terreno y audio son procedurales; el arte y el video de \`assets/\` tienen su propia licencia (ver [\`assets/CREDITS.md\`](../../assets/CREDITS.md)).`.

**`docs/VALIDATION.md` → `games/3d-pro/VALIDATION.txt`**
- Fecha de hoy.
- Estado con los conteos reales de PRO y de la suite (Paso 1).
- Lista de tests copiada literalmente de la salida.
- Tamaños del build sin la línea de CSS inline.
- La línea `Sin dependencias de red externas ni descargas de modelos remotos (todo procedural).` pasa a `Modelos 3D, terreno y audio procedurales; arte y prólogo en assets/ (ver assets/CREDITS.md).`
- La imagen Docker, con el tamaño medido.

Después ejecutar `cp docs/VALIDATION.md games/3d-pro/VALIDATION.txt`.

- [ ] **Paso 4: Comprobar que no quedan afirmaciones viejas**

```bash
cd E:/Yeti
grep -rn -E "\b33 (tests|pruebas)|33/33|~51 KB|26\.5 ?MB|100% Autocontenido|archivo autosuficiente|todo procedural|CSS inline" README.md index.html docs/*.md games/3d-pro/README.md games/3d-pro/VALIDATION.txt
```

Esperado: sin salida. Los certificados VALIDATION pueden mostrar el número nuevo; el patrón solo busca los valores viejos.

- [ ] **Paso 5: Commit**

```bash
git add assets/CREDITS.md README.md index.html docs games/3d-pro/README.md games/3d-pro/VALIDATION.txt
git commit -m "docs: tamaños, pipeline, instalación y créditos del arte fieles al código" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Suéter mostaza en el personaje del juego (opcional, D4)

Alinea el modelo del juego con el arte oficial (suéter mostaza con punto naranja). Mantiene casco, gafas, bufanda y esquís. **Aceptación visual del usuario** en las tres ediciones.

**Archivos:**

- Modificar: `games/3d-pro/src/entities/ProceduralModels.js`, `games/3d-standalone/index.html` (`mat` y `makeSkier`), `games/2d-retro/index.html` (`dibujarNutria`)
- Test: `games/3d-pro/tests/entities.test.js`

**Interfaces:**

- Produce: `factory.materials.sueter` (`#e3a72f`) y `factory.materials.punto` (`#d9661f`).

- [ ] **Paso 1: Test que falla**

Añadir al final de `games/3d-pro/tests/entities.test.js`:

```js
test('Nutria: suéter mostaza con punto naranja, como el arte oficial', () => {
  const factory = createModelFactory();
  const skier = factory.makeSkier();
  assert.equal(factory.materials.sueter.color.getHexString(), 'e3a72f');
  assert.equal(factory.materials.punto.color.getHexString(), 'd9661f');
  let sweater = 0;
  skier.root.traverse(o => { if (o.material === factory.materials.sueter) sweater++; });
  assert.ok(sweater >= 4, 'torso, cuello alto y dos mangas');
  factory.dispose();
});
```

Ejecutar: `cd E:/Yeti/games/3d-pro && npm test`
Esperado: FAIL con `Cannot read properties of undefined (reading 'color')`.

- [ ] **Paso 2: 3D PRO**

En `ProceduralModels.js`, línea 3, dentro de `mat` y después de `lente:new THREE.MeshStandardMaterial({color:'#bdefff',roughness:.12})`, añadir:

```js
,sueter:new THREE.MeshStandardMaterial({color:'#e3a72f',roughness:.9}),punto:new THREE.MeshStandardMaterial({color:'#d9661f',roughness:.85})
```

En `makeSkier()`:
- Reemplazar `part(body,sharedGeo.sphere,mat.pelo,0,1.05,0,.32,.45,.28);` por `part(body,sharedGeo.sphere,mat.sueter,0,1.05,0,.32,.45,.28);part(body,sharedGeo.cylinder,mat.sueter,0,1.4,-.03,.22,.1,.2);part(body,sharedGeo.cylinder,mat.punto,0,.86,0,.33,.06,.29);`. Son el torso, el cuello alto y el elástico naranja de la cintura.
- Reemplazar `part(body,sharedGeo.sphere,mat.hocico,0,1.06,-.15,.22,.32,.12);` por `part(body,sharedGeo.sphere,mat.punto,0,1.06,-.15,.22,.06,.12);`, una franja de punto en el pecho.
- Reemplazar `limb(body,mat.pelo,s*.35,1.42,-.05,.12,.5,.12)` por `limb(body,mat.sueter,s*.35,1.42,-.05,.12,.5,.12)` (las mangas).

Ejecutar: `cd E:/Yeti/games/3d-pro && npm test`
Esperado: PASS, con un test más.

- [ ] **Paso 3: Standalone**

Aplicar en `games/3d-standalone/index.html` exactamente los mismos 4 reemplazos del Paso 2: los materiales detrás de `lente:…`, el torso, la franja del pecho y las mangas. Las cadenas son idénticas porque `makeSkier` está copiado de PRO. Comprobar con `grep -o "mat.sueter" games/3d-standalone/index.html | wc -l` que da `3`. El archivo está minificado en una línea, y `grep -c` contaría líneas, no apariciones.

- [ ] **Paso 4: 2D**

En `dibujarNutria`, reemplazar:

```js
      ovalo(0, 0, 14, 21, "#875735");
      ovalo(0, 6, 9, 12, "#c79866"); // Vientre claro
```

por:

```js
      ovalo(0, 0, 14, 21, "#e3a72f"); // Suéter mostaza
      // Punto en zigzag naranja del suéter
      ctx.strokeStyle = "#d9661f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, 2); ctx.lineTo(-5, 7); ctx.lineTo(0, 2); ctx.lineTo(5, 7); ctx.lineTo(10, 2);
      ctx.stroke();
```

- [ ] **Paso 5: Revisión visual y commit**

Hacer capturas de las tres ediciones en juego y en el menú de PRO, y enseñárselas al usuario. Ajustar colores o tamaños solo si el usuario lo pide.

```bash
git add games/3d-pro/src/entities/ProceduralModels.js games/3d-pro/tests/entities.test.js games/3d-standalone/index.html games/2d-retro/index.html
git commit -m "feat(arte): la nutria del juego viste el suéter mostaza del arte oficial en las tres ediciones" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Video optimizado (absorbida por la Task 0, Paso 4; no se despacha aparte)

**Archivos:**

- Regenerar: `assets/intro_lake.mp4` desde `art/Otter_pouring_coffee_by_lake_20261011143032.mp4`

- [ ] **Paso 1: Instalar ffmpeg** (requiere el OK del usuario; unos 100 MB)

```powershell
winget install --id Gyan.FFmpeg -e
```

- [ ] **Paso 2: 720p con *faststart***

```bash
cd E:/Yeti
ffmpeg -y -i art/Otter_pouring_coffee_by_lake_20261011143032.mp4 -vf scale=1280:-2 -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 96k assets/intro_lake.mp4
python -c "import os;print(os.path.getsize('assets/intro_lake.mp4')//1024,'KB')"
```

Esperado: menos de 3 MB.

Comprobar que la caja `moov` va antes que `mdat`. Se puede reutilizar el analizador de cajas de la verificación; el orden esperado es `['ftyp', 'moov', …, 'mdat']`.

- [ ] **Paso 3:** volver al Paso 2 de la Tarea 0 y continuar.

---

### Task 10: Puerta de aceptación total y fusión (núcleo)

- [ ] **Paso 1: Automático**

```bash
cd E:/Yeti
npm test            # PRO y suite en verde, sin todo pendientes
npm run build
ls games/3d-pro/dist/assets   # solo app.iife.js, index-*.css, index-*.js, three-*.js
git status --short  # limpio
```

- [ ] **Paso 2: Clon limpio (simulación del CI)**

```bash
S="$TEMP/otter-ci"; rm -rf "$S"
git clone -q --branch feat/3d-pro-coherencia E:/Yeti "$S"
cd "$S" && npm run setup && npm test && npm run build && docker compose build
```

Esperado: todo con salida 0. Este es el escenario que hoy falla con `EUSAGE`.

- [ ] **Paso 3: Matriz en el navegador** (Playwright o a mano; consola sin errores en todas las filas)

| Entrada | Modo | Comprobar |
| :--- | :--- | :--- |
| Portal | `file://` (`jugar.bat` opción 1) | Modal con foco en "Entrar"; Tab encerrado; Escape cierra y devuelve el foco; galería con teclado; lightbox a 1600 px |
| Portal | `npm run serve` | Lo anterior, más: `#prologo` abre el modal; sin petición al mp4 si el autoplay está desactivado; sin autoplay con *reduced motion* |
| 2D | `file://` y `serve` | Avatar nuevo sin mancha; la alerta roja late al acercarse el Yeti y se apaga en game over y en el menú |
| Standalone | `file://` y `serve` | Avatar visible; alerta igual que en 2D |
| 3D PRO | `npm run dev`, `serve` y `file://` (dist) | Avatar visible en los tres modos. El enlace del prólogo abre el portal con el modal (`serve` y `file://`). "Invocar Yeti" (F2) enciende la alerta. Sin error CORS en `file://` |
| Docker | `docker compose up -d` (puerto 8088) | Cabeceras de seguridad y caché como en la Tarea 6; lo anterior funciona |

- [ ] **Paso 4: Fusionar.** Usar `superpowers:finishing-a-development-branch` para integrar `feat/3d-pro-coherencia` en `master`, con la confirmación del usuario. A partir de ahí corre el CI real.

---

## Fuera de alcance (anotado para después)

- Récords del portal: hoy solo muestra los de 2D. Unificarlos implica leer las claves de las tres ediciones (2D: `snow_escape_hi_*`; PRO: prefijo `snow_escape_` de `StorageManager`; Standalone: sus propias claves).
- Renombrar `window.SnowEscape`, `SnowEscapeGame` y las claves `snow_escape_*`. Se mantienen para no perder récords ni romper diagnósticos.
- `image.png_2K` (mockup "HUILLIN") queda en `art/`. Es otra marca y no se usa en la suite.
- Cambiar la cámara o la escala para que la cola y la bufanda se distingan mejor en el juego, donde la nutria mide unos 20 px.
