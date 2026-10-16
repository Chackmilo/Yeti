# 📜 Changelog — Historial de Versiones

Todos los cambios notables en la suite de videojuegos **Otter Escape: Yeti Chase** se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [4.5.0-ai] - 2026-10-15

### Añadido
* **Arquitectura de Inteligencia Artificial Avanzada:**
  - Framework de **Behavior Trees jerárquicos** (`BehaviorTree.js`) *zero-allocation* con nodos `Selector`, `Sequence`, `Condition`, `Action` e `Inverter`.
  - Agente esquiador autónomo con **Piloto Automático MPC** (`SkierAgentAI.js`) con proyección de trayectorias hacia el futuro y modo asistido **Co-Pilot**.
  - **Motor de DDA (Dynamic Difficulty Adjustment)** de Estado de Flujo (`DDAEngine.js`) que modula dinámicamente el corredor en estados `RELIEF`, `BALANCE` y `SURGE`.
  - **Telemetría XAI y Gizmos 3D** (`AITelemetry.js`, `AIDebugRenderer.js`) para observabilidad en tiempo real de rayos de bigotes, decisiones y conos de escape.
* **Competidor Neurobiológico Drosophila SNN:**
  - Simulación biológica de la mosca de la fruta (*FlyWire connectome*) con dinámica **Leaky Integrate-and-Fire (LIF)** que compite en pista como rival autónomo con evasión contralateral y reflejo de escape *Giant Fiber* (`experiments/fly-brain/`).
  - Doble motor de ejecución: local JavaScript a 60 Hz *zero-allocation* o puente WebSocket en Python.
* **Capa de Alerta Visual Universal (`#yetiAlert`):**
  - Implementación uniforme de alerta perimetral en las tres ediciones (2D Retro, 3D Standalone y 3D PRO) con respuesta a proximidad (< 65 m) y soporte para `prefers-reduced-motion`.
* **Soporte de Mandos de Consola (Gamepad API):**
  - Detección en caliente y mapeo ergonómico para mandos Xbox, PlayStation y genéricos USB/Bluetooth.
* **Infraestructura de Grado de Producción:**
  - Contenedor multi-stage con Dockerfile (Node 22 builder + Nginx Alpine runner de 26 MB).
  - Pipeline de CI en GitHub Actions con matriz Node 20 y Node 22.
  - Suite de 46 pruebas automatizadas nativas (42 en 3D PRO + 4 guardias globales de suite).
  - Cargador universal híbrido ESM / IIFE (`scripts/postbuild.js`) con soporte de doble protocolo (`http://` y `file:///`).

### Cambiado
* Reorganización de capturas de pantalla y medios de documentación a `docs/screenshots/`.
* Balance de modos de juego: diferenciación explícita entre **Modo Clásico** (turbo ilimitado con 76% de autoridad de giro) y **Modo Moderno** (barra de estamina táctica de 6 s con recarga por puertas de slalom).
* Refactorización y endurecimiento de cabeceras de seguridad en `nginx.conf` (`nosniff`, `SAMEORIGIN`, caché inmutable para bundles con hash).

---

## [4.0.0] - 2026-10-10

### Añadido
* Arquitectura modular completa en Three.js r170 y Vite 6 con code-splitting.
* Motor de físicas desacoplado a paso fijo (Fixed Timestep 60 Hz).
* Continuous Collision Detection (Swept Circle CCD) contra cilindros de obstáculos para evitar efecto túnel a 35 m/s.
* Audio espacial 3D HRTF mediante Web Audio API con atenuación y efecto Doppler.
* Generador de mundo procedural determinista con corredor seguro garantizado para más de 10 km de descenso.
* Portal Hub unificado (`index.html`) con selector de ediciones, comparativa de motores y cinemática de prólogo.

---

## [3.0.0] - 2026-10-05

### Añadido
* Edición **3D Standalone** (`games/3d-standalone/index.html`): experiencia tridimensional autónoma completa contenida en un único archivo HTML (~51 KB) con Three.js vía CDN.
* Audio posicional HRTF sintetizado algorítmicamente en tiempo real sin dependencias de archivos de sonido externos.

---

## [2.0.0] - 2026-09-28

### Añadido
* Edición **2D Retro Canvas** (`games/2d-retro/index.html`): remake arcade pixel-art inspirado en *SkiFree*.
* Puertas de slalom con multiplicador de combos.
* Rampas de salto acrobático 360° con inmunidad aérea sobre pinos y rocas.
* Interceptación predictiva 2D del Yeti.

---

## [1.0.0] - 2026-09-15

### Añadido
* Prototipo conceptual inicial del esquiador alpino perseguido por el Yeti.
