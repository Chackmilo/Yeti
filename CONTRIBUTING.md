# 🛠️ Guía de Contribución a Otter Escape: Yeti Chase

¡Bienvenido al equipo de desarrollo de **Otter Escape: Yeti Chase**! Esta suite de videojuegos arcade y simulación alpina sigue estándares de ingeniería de software de alta calidad (grado producción / senior game dev).

Este documento establece las directrices de arquitectura, rendimiento, estilo de código y flujo de trabajo para mantener la integridad técnica de la suite.

---

## 🏔️ 1. Principios de Ingeniería del Motor

Cualquier contribución al motor de juego (especialmente en `games/3d-pro/`) debe satisfacer los siguientes principios inviolables:

### ⏱️ A. Simulación a Paso Fijo (Fixed Timestep 60 Hz)
* **Determinismo:** Toda la física, cálculo de trayectoria, aceleración y lógica de colisiones debe ejecutarse dentro del paso fijo (`fixedDT = 1/60 s`).
* **Desacoplamiento:** La tasa de fotogramas del monitor (FPS) jamás debe alterar la velocidad del esquí ni la distancia de frenado. Los fotogramas visuales interpolan el estado del paso fijo.
* **Resiliencia:** Nunca permitas bucles infinitos en el acumulador de tiempo (*Spiral of Death*). Se implementa un clamp de seguridad de 0.1 s.

### ⚡ B. Cero Asignaciones en el Bucle Principal (*Zero-Allocation Game Loop*)
* En videojuegos web de alto rendimiento, el recolector de basura (*Garbage Collector*) causa micro-congelamientos (*frame stutter*).
* **Prohibido instanciar objetos** (`new THREE.Vector3()`, `new Array()`, `{}`) dentro de métodos de bucle crítico (`update()`, `fixedStep()`, `onRender()`).
* Reutiliza vectores pre-asignados a nivel de módulo o instancia, y utiliza **Object Pools** para obstáculos, esquiadores rivales, marcas de nieve y partículas.

### 🎯 C. Continuous Collision Detection (Swept CCD)
* A velocidades de turbo (hasta 35 m/s o 126 km/h), el muestreo discreto produce efecto túnel (*tunneling*).
* Todas las colisiones contra obstáculos cilíndricos deben evaluarse mediante **Swept Circle CCD** sobre el segmento recorrido entre el fotograma anterior y el actual.
* Las hitboxes deben ser justas y restringidas a troncos y centros de masa, nunca a follaje visual.

### 🌐 D. Compatibilidad Universal (HTTP + `file:///`)
* La suite soporta despliegue web tradicional (HTTP/S) y apertura directa de archivos locales (`file:///`) sin dependencias de red externas.
* En `games/3d-pro/`, el cargador universal (`scripts/postbuild.js`) sirve módulos ESM por HTTP e inyecta el bundle IIFE autónomo cuando se abre localmente por archivo.
* **Nunca uses rutas absolutas** (`/assets/...`) en código o HTML; usa siempre rutas relativas (`../../assets/...`).

---

## 🚀 2. Flujo de Trabajo y Entorno Local

### Requisitos Previos
* **Node.js:** Versión 20.x o 22.x LTS.
* **NPM:** 10.x+.
* **Docker:** (Opcional) Docker Desktop o Docker Engine para validación de contenedores.

### Comandos de Desarrollo

```bash
# 1. Instalar dependencias limpias de la suite
npm run setup

# 2. Iniciar servidor de desarrollo interactivo con Hot Module Replacement (HMR)
npm run dev

# 3. Ejecutar la suite completa de pruebas unitarias automatizadas (46 tests)
npm test

# 4. Compilar el bundle optimizado para producción
npm run build

# 5. Previsualizar la distribución final
npm run preview

# 6. Levantar el portal completo con Nginx local
npm run serve
```

---

## 🧪 3. Política de Pruebas Unitarias

* Todo cambio o nueva característica en la física, IA o interfaz debe acompañarse de sus correspondientes pruebas en `games/3d-pro/tests/` o en `tests/suite.test.js`.
* Antes de enviar cualquier Pull Request, **el comando `npm test` debe arrojar 0 fallos**:
  - `games/3d-pro/tests/ai.test.js`: Behavior Trees, Piloto Automático MPC, Lead Pursuit, DDA.
  - `games/3d-pro/tests/flybrain.test.js`: Red neuronal Drosophila SNN LIF, Floating Origin, CCD.
  - `games/3d-pro/tests/physics.test.js`: Algoritmos Swept CCD, navegación de corredor, almacenamiento.
  - `games/3d-pro/tests/coherence.test.js`: Invariantes geométricas y balance de juego.
  - `games/3d-pro/tests/ui.test.js`: Accesibilidad, capas de alerta, HUD reactivo.
  - `tests/suite.test.js`: Guardias globales de rutas relativas, Nginx headers, alertas y deduplicación.

---

## 📝 4. Convenciones de Commits (Conventional Commits)

Utilizamos el estándar de **Conventional Commits** para mantener un historial limpio y generar changelogs automáticos:

| Tipo | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `feat` | Nueva característica o mecánica jugable | `feat(ai): add obstacle anticipation to Yeti behavior tree` |
| `fix` | Corrección de un defecto o bug | `fix(physics): correct swept cylinder bounding radius` |
| `perf` | Optimización de rendimiento o memoria | `perf(terrain): pool geometry buffer allocations` |
| `test` | Incorporación o refactorización de tests | `test(suite): enforce no loose media in repository root` |
| `docs` | Actualizaciones en documentación técnica | `docs(controls): update gamepad mapping table` |
| `refactor` | Refactorización de código sin alterar lógica | `refactor(ui): extract scorecard grid logic to helper` |
| `ci` | Modificaciones en pipelines o configuraciones CI | `ci(github): add matrix test for Node 22` |

---

## 🎨 5. Gestión de Activos y Medios

* **Imágenes optimizadas en runtime:** Se alojan exclusivamente en `assets/` (WebP, JPG optimizado, MP4 H.264).
* **Arte fuente en alta resolución (2K/4K):** Se almacenan en `art/` y están ignorados por Git para no inflar el tamaño del repositorio.
* **Capturas y material de documentación:** Se organizan en `docs/screenshots/` y se referencian en los documentos correspondientes.
* **Prohibido dejar archivos multimedia en la raíz:** Existe una guardia automatizada en `tests/suite.test.js` que fallará el build si se detectan imágenes o videos sueltos en el directorio raíz.

---

¡Gracias por ayudar a que **Otter Escape: Yeti Chase** sea una referencia de excelencia técnica y jugabilidad arcade!
