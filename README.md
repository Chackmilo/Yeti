# 🦦 Otter Escape: Yeti Chase — Suite Completa de Videojuegos Alpinos

[![CI Pipeline](https://img.shields.io/badge/CI-GitHub%20Actions-brightgreen?logo=github-actions)](.github/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/Tests-37%2F37%20Passing-brightgreen?logo=node.js)](games/3d-pro/tests)
[![Three.js](https://img.shields.io/badge/Three.js-r170-black?logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite)](https://vitejs.dev/)
[![Docker](https://img.shields.io/badge/Docker-26.5%20MB%20Alpine-blue?logo=docker)](Dockerfile)
[![Gamepad](https://img.shields.io/badge/Gamepad-Xbox%20%2F%20PlayStation-blue)](docs/CONTROLS.md)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Suite de videojuegos arcade de esquí infinito inspirada en la mística clásica de *SkiFree*, protagonizada por una intrépida **Nutria Esquiadora** equipada con casco dorado, bufanda ondeante al viento, esquís dobles y cola dinámica que se balancea en cada curva, perseguida por el legendario **Yeti de las cumbres**. La suite está modernizada con físicas avanzadas a 60 Hz (objetivo de diseño), audio espacial 3D HRTF y mecánicas acrobáticas. Diseñada con una arquitectura modular de software desacoplada, la suite integra ediciones independientes organizadas en un monorepo profesional y servidas a través de un **Portal Web Unificado**:

1. **🏔️ Portal Hub Alpinos ([`index.html`](index.html)):** Centro de bienvenida con selector de juegos, comparador de motores, nieve dinámica en Canvas y lectura de récords locales.
2. **👾 Otter Escape 2D Retro ([`games/2d-retro/index.html`](games/2d-retro/index.html)):** Arcade clásico 2D en Canvas con slalom, rampas de salto 360°, IA predictiva, radar visual de amenaza, colisiones AABB y modos Clásico/Moderno.
3. **🎿 Otter Escape 3D Standalone ([`games/3d-standalone/index.html`](games/3d-standalone/index.html)):** Experiencia 3D completa en un único archivo autosuficiente (~51 KB), Three.js por CDN, audio 3D HRTF, física *Swept Circle* y tarjeta de resultados.
4. **⚡ Otter Escape PRO & AI Engine ([`games/3d-pro`](games/3d-pro/)):** Suite modular de alto rendimiento con **Arquitectura de IA Avanzada (Behavior Trees + Piloto Automático Autónomo MPC + Motor DDA de Estado de Flujo + Telemetría XAI + Gizmos 3D)**, Vite 6, Three.js r170, Continuous Collision Detection (CCD) a 60 Hz, Gamepad API y suite de 37 tests automatizados.
5. **🪰 Drosophila Fly-Brain AI ([`experiments/fly-brain`](experiments/fly-brain/)):** Simulación neurobiológica de la mosca de la fruta (*FlyWire* SNN LIF) que compite en tiempo real como rival en pista (tecla **`B`**). Funciona con servidor WebSocket en Python o con motor local embebido en JavaScript a 60 FPS.

---

## 🏛️ Estructura del Repositorio

La suite sigue una estructura limpia inspirada en las mejores prácticas de ingeniería de software y monorepos modernos:

```
Yeti/
├── .github/
│   └── workflows/
│       └── ci.yml                   # Pipeline CI/CD: Matriz Node 20/22, tests unitarios y build Docker
├── docs/                            # Documentación técnica y especificaciones de arquitectura
│   ├── ARCHITECTURE.md              # Especificación técnica del motor (CCD, BT, MPC, DDA, HRTF)
│   ├── CONTROLS.md                  # Mapeo universal de controles (Teclado, Gamepad API, Touch)
│   ├── DEPLOYMENT.md                # Guía de producción en VPS, Docker, Nginx y Serverless
│   ├── VALIDATION.md                # Certificado de calidad y benchmarks de rendimiento
│   └── archive/                     # Archivos históricos y monolitos legados
├── games/                           # Ediciones jugables independientes
│   ├── 2d-retro/
│   │   └── index.html               # Edición 2D Retro Canvas autosuficiente (Nutria 2D)
│   ├── 3d-standalone/
│   │   └── index.html               # Edición 3D Standalone en un archivo (Three.js CDN, ~51 KB)
│   └── 3d-pro/                      # Edición 3D PRO Modular (Vite 6 + Three.js r170 + AI Suite)
│       ├── package.json             # Manifiesto del paquete modular y scripts de prueba
│       ├── vite.config.js           # Configuración de empaquetado y code-splitting
│       ├── index.html               # Shell HTML de la edición PRO
│       ├── tests/                   # Suite de 33 tests unitarios nativos verificados
│       │   ├── ai.test.js           # Pruebas de Behavior Trees, Lead Pursuit, MPC y DDA (13 tests)
│       │   ├── coherence.test.js    # Pruebas de coherencia de constantes, safeHalf 4.2 y corredor (3 tests)
│       │   ├── physics.test.js      # Pruebas de CCD, safe corridor (10 km), instanciación y Storage (6 tests)
│       │   ├── ui.test.js           # Pruebas de alerta de proximidad, HUD y menú accesible (8 tests)
│       │   └── entities.test.js     # Pruebas de nutria (lente, bufanda) y puntos de slalom (3 tests)
│       ├── src/                     # Código fuente desacoplado en 23 módulos ES
│       ├── scripts/                 # Postbuild: inyección CSS inline y bundle IIFE universal
│       └── dist/                    # Bundle de producción optimizado (ESM + IIFE fallback)
├── experiments/                     # Laboratorio de computación y neurobiología
│   └── fly-brain/                   # Simulación SNN Drosophila LIF + puente WebSocket Python
├── index.html                       # 🏔️ Portal Web Hub Unificado
├── jugar.bat                        # 🎮 Lanzador interactivo 1-clic para Windows (Hub / Local Vite / Standalone)
├── package.json                     # Orquestador Monorepo (workspaces y scripts universales)
├── Dockerfile                       # Multi-stage build (Node 22 test+build -> Nginx Alpine ~26.5 MB)
├── docker-compose.yml               # Orquestación de producción en puerto configurable (8088:80)
├── nginx.conf                       # Servidor Nginx de alto rendimiento (Gzip + Cache inmutable)
├── .dockerignore                    # Exclusión recursiva de contexto Docker (< 1 MB)
├── .gitignore                       # Filtros Git estándar
└── .env.example                     # Plantilla de variables de entorno para despliegue
```

---

## 🏔️ Comparativa de Versiones

| Característica | 👾 2D Retro Canvas | 🎿 3D Alpino Standalone | ⚡ 3D PRO Modular (AI Engine) |
| :--- | :---: | :---: | :---: |
| **Ubicación** | [`games/2d-retro/`](games/2d-retro/index.html) | [`games/3d-standalone/`](games/3d-standalone/index.html) | [`games/3d-pro/`](games/3d-pro/) |
| **Protagonista** | Nutria con casco, bufanda y cola | Nutria 3D con cola oscilante | Nutria 3D articulada PBR |
| **Perseguidor** | Yeti clásico con radar | Yeti 3D acechador | Yeti BTs con Lead Pursuit |
| **Dimensión / Motor** | 2D HTML5 Canvas | 3D WebGL (Three.js CDN, ~51 KB) | 3D WebGL (Three.js r170 empaquetado) |
| **Inteligencia Artificial** | Interceptación predictiva 2D | Lead pursuit + Repulsión | **🧠 Behavior Trees + Piloto IA + DDA Flow** |
| **Piloto Automático (Autopilot)** | — | — | **🤖 MPC Trajectory Rollouts (`T` / `Tab`)** |
| **Ajuste Dinámico DDA** | Dificultad por distancia | Dificultad por distancia | **📈 Flow State (Alivio / Balance / Oleada)** |
| **Observabilidad / XAI** | Debug HUD (<kbd>F2</kbd>) | Hitboxes 3D (<kbd>F2</kbd>) | **🔍 Gizmos 3D (Rayos + Retícula + Travesía)** |
| **Puertas de Slalom** | ✅ Velocidad/Energía + Combo | ✅ Velocidad/Energía + Combo | ✅ Velocidad/Energía + Combo |
| **Rampas de Salto 360°** | ✅ Salto sobre obstáculos | ✅ Arco 2.8m + Tuck + Spin | ✅ Arco 2.8m + Tuck + Spin |
| **Soporte de Mandos** | Teclado + Táctil multitouch | Teclado + Táctil multitouch | **✅ Gamepad API (Xbox / PlayStation)** |
| **Audio Espacial** | Síntesis Web Audio estéreo | Síntesis 3D HRTF posicional | Síntesis 3D HRTF + PannerNode |
| **Física de Colisiones** | AABB continua | Swept Circle en cilindros | **Continuous Collision Detection (CCD)** |
| **Resumen de Partida** | Tarjeta de puntos y récord | Tarjeta Scorecard Grid | **Scorecard Grid completo + Badges** |
| **Pruebas Automatizadas** | Pruebas integradas | Validaciones runtime | **✅ Suite de 33 tests nativos (Node.js)** |

---

## 🚀 Inicio Rápido y Comandos Universales

### 🎮 Opción A: Lanzador 1-Clic para Windows
Si estás en Windows, simplemente haz doble clic en [`jugar.bat`](jugar.bat) o ejecútalo en terminal:
```cmd
jugar.bat
```
Te permitirá abrir el **Portal Hub**, iniciar el servidor local de alta velocidad para **Snow Escape PRO**, o abrir las versiones clásicas sin configuración previa.

### 💻 Opción B: Comandos de Terminal (npm workspaces)
Al utilizar **npm workspaces**, puedes ejecutar todos los comandos directamente desde la **raíz del proyecto**:

```bash
# 1. Instalar dependencias del monorepo
npm install

# 2. Ejecutar la suite completa de 33 tests unitarios certificados
npm test

# 3. Iniciar entorno de desarrollo interactivo de la edición PRO (Vite HMR)
npm run dev

# 4. Compilar bundle de producción optimizado (Soporte universal file:/// y HTTP)
npm run build

# 5. Previsualizar la build de producción en servidor local de alto rendimiento
npm run preview
```

---

## 🐳 Despliegue en Servidores / VPS con Docker

El proyecto incluye soporte nativo para contenedores de producción ultraligeros (~26.5 MB) con **Nginx Alpine**:

```bash
# Construir imagen y levantar servicio en segundo plano
docker compose up -d --build

# El juego estará disponible en:
# http://TU_IP_O_DOMINIO:8088/ (o el puerto configurado en .env)
```

Para más detalles sobre despliegue con Nginx nativo o plataformas como Cloudflare Pages, consulta [**`docs/DEPLOYMENT.md`**](docs/DEPLOYMENT.md).

---

## 🎮 Controles Principales

| Acción | Teclado | Mando (Gamepad) | Táctil (Móvil) |
| :--- | :--- | :--- | :--- |
| **Giro / Dirección** | `←` / `→` o `A` / `D` | Stick Izquierdo / D-Pad | `◀ IZQ` / `▶ DER` (pulgar izq.) |
| **Acelerar / Tuck** | `↓` o `S` | Gatillo `RT` / `R2` | Automático en descenso |
| **Frenar / Carve** | `↑` o `W` | Gatillo `LT` / `L2` | `∧ FRENO` (pulgar der.) |
| **⚡ Turbo Boost** | **`Espacio`** o `Shift` / `F` | Botón `A` (Xbox) / `✕` (PS) | `⚡ TURBO` (simultáneo con giro) |
| **⏸️ Pausa / Reanudar** | **`Escape`** | Botón Start | Botón HUD pausa |
| **🤖 Piloto Automático IA (3D PRO)** | Tecla `T` o `Tab` | Botón `X` (Xbox) / `□` (PS) | Botón HUD IA |
| **🪰 Rival Mosca (Drosophila SNN)** | Tecla **`B`** | — | Botón Menú / Debug |
| **Diagnóstico 3D & Telemetría XAI** | `F2` o `` ` `` | Stick Derecho (`R3`) | Botón HUD Debug |

Para consultar la configuración exhaustiva de controles, dinámicas de inercia y diferencias entre Modo Clásico y Modo Moderno, consulta [**`docs/CONTROLS.md`**](docs/CONTROLS.md).

---

## 🪰 Experimento Neurobiológico Drosophila SNN (Rama: `experiment/fly-brain-ai`)

Esta rama incorpora una simulación neurobiológica de la red neuronal de la mosca de la fruta (*Drosophila melanogaster*) que actúa como esquiador rival autónomo con dinámica **Leaky Integrate-and-Fire (LIF)**.

* **Doble Motor:** Opera de forma local a 60 Hz en JavaScript o conectado mediante WebSocket a un servidor puente en Python (`ws://127.0.0.1:8765`).
* **Activación Inmediata:** Presiona **`B`** en la edición 3D PRO para invocar al competidor en cualquier momento.
* **Telemetría en Vivo:** Presiona **`F2`** para ver el conteo de picos neuronales sensoriales, motores y de escape (*Giant Fiber*).
* **Guía Completa de Uso e Integración:** Consulta [**`experiments/fly-brain/README.md`**](experiments/fly-brain/README.md) para detalles matemáticos, esquemas JSON y ejemplos de código.

---

## 📚 Documentación Técnica Detallada

* 🧠 [**Arquitectura de IA y Físicas CCD**](docs/ARCHITECTURE.md)
* 🪰 [**Experimento Drosophila Fly-Brain AI**](experiments/fly-brain/README.md)
* 🎮 [**Especificación de Controles y Gamepad API**](docs/CONTROLS.md)
* 🚀 [**Guía de Despliegue en Producción**](docs/DEPLOYMENT.md)
* 📋 [**Certificado Técnico y Benchmark de Calidad**](docs/VALIDATION.md)


