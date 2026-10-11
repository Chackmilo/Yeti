# ⛷️ Snow Escape 3D PRO — Modular Alpine Engine & AI Suite

[![Three.js](https://img.shields.io/badge/Three.js-r170-black?logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite)](https://vitejs.dev/)
[![Node](https://img.shields.io/badge/Node.js-20%2B%20%7C%2024%2B-339933?logo=node.js)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/Tests-22%2F22%20Passing-brightgreen)](tests)
[![AI Engine](https://img.shields.io/badge/AI%20Engine-Behavior%20Trees%20%2B%20MPC%20%2B%20DDA-cyan)](src/ai)
[![Gamepad](https://img.shields.io/badge/Gamepad-Xbox%20%2F%20PlayStation-blue)](https://w3c.github.io/gamepad/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Versión modular y de grado de producción del videojuego alpino de esquí procedural infinito. Desarrollada con **Three.js r170**, empaquetada con **Vite 6** mediante code-splitting optimizado, simulación desacoplada a 60 Hz con **Continuous Collision Detection (CCD)**, audio espacial 3D HRTF posicional, mecánicas acrobáticas de slalom y rampas 360°, soporte completo para **mandos de consola** y una **Arquitectura de Inteligencia Artificial (Behavior Trees, Agente Esquiador Autónomo MPC, Motor DDA de Estado de Flujo y Gizmos XAI 3D)**.

---

## 🌟 Características Principales

### 1. Arquitectura de Inteligencia Artificial Avanzada (Senior AI Engine)
- **Framework de Behavior Trees ([`BehaviorTree.js`](src/ai/BehaviorTree.js)):** Motor jerárquico *zero-allocation* optimizado para 60 Hz con nodos `Selector`, `Sequence`, `Condition`, `Action` e `Inverter`.
- **Yeti Táctico y Radar Sensorial ([`YetiAI.js`](src/ai/YetiAI.js)):**
  - **Radar de 5 Bigotes (Whiskers):** Raycasts sensoriales dinámicos que escanean árboles y rocas, calculando campos de fuerza repulsiva para evitar colisiones torpes.
  - **Interceptación Predictiva (Lead Pursuit):** Resuelve vectorialmente el punto de encuentro futuro $\vec{p}_{lead} = \vec{p}_p + \vec{v}_p \cdot \tau$.
  - **Anticipación de Slalom:** Detecta giros alternados en zig-zag y recorta hacia el centro del corredor alpino.
  - **Ataque Acrobático en Salto (Pounce Leap):** A menos de 8.5 m, el Yeti se lanza en un salto parabólico de 1.85 m con aceleración $+42\%$, superando obstáculos terrestres.
- **Agente Esquiador Autónomo ([`SkierAgentAI.js`](src/ai/SkierAgentAI.js)):**
  - **Autopilot por Model Predictive Control (MPC):** Evalúa 7 trayectorias de giro concurrentes simuladas hacia el futuro, maximizando puntuación de puertas de slalom, saltos acrobáticos y distancia con respecto al Yeti y árboles.
  - **Modo Co-Piloto:** Permite control manual humano, pero si detecta colisión inminente en $< 0.35$ s, inyecta micro-giros evasivos o frenado automático.
  - **Alternancia Dinámica (`T` / `Tab` / Botón X mando):** Cambia en caliente entre `OFF`, `AUTOPILOT` y `CO_PILOT`.
- **Dynamic Difficulty Adjustment ([`DDAEngine.js`](src/ai/DDAEngine.js)):**
  - Implementa el **Canal de Flujo de Mihaly Csikszentmihalyi** con ventana deslizante de 10 segundos.
  - Clasifica la experiencia en `ALIVIO (RELIEF)`, `BALANCE (FLOW)` y `OLEADA (SURGE)`, modulando suavemente la velocidad y agresividad del monstruo.
- **Explainable AI y Gizmos 3D ([`AITelemetry.js`](src/ai/AITelemetry.js) & [`AIDebugRenderer.js`](src/ai/AIDebugRenderer.js)):**
  - Rayos de bigotes sensoriales (verde = libre, rojo = obstáculo), retícula cian de intercepción en la nieve y trayectoria planificada del autopiloto visibles en modo Debug (`F2`).

### 2. Mecánicas Jugables de Slalom y Rampas Acrobáticas
- **Puertas de Slalom ([`WorldGenerator.js`](src/world/WorldGenerator.js)):** Postes procedurales de color rojo y azul ubicados en el pasillo esquiable seguro.
  - Cruzar entre postes otorga `+100 PTS` multiplicados por la racha de combo acumulada (`x1`, `x2`, `x3`...).
  - En Modo Moderno, recarga instantáneamente un **+25% de la barra de energía de turbo**.
  - Sonido de campanilla armónica (*dual chime* 880 / 1320 Hz) y ráfaga de nieve azul/roja.
- **Rampas de Salto 360° ([`ObstaclePool.js`](src/world/ObstaclePool.js)):** Inclinación física en X (0.22 rad) con remate de hielo.
  - Vuelo parabólico de **hasta 2.8 metros** de altitud durante 0.85 segundos.
  - Giro acrobático 360° (`airSpin`) con encogimiento de esquís (*ski tuck*).
  - **Invulnerabilidad temporal:** El esquiador vuela por encima de árboles y rocas.
  - **Aterrizaje Perfecto:** `+250 PTS`, sonido sordo de impacto, spray de nieve y boost de velocidad (+6 m/s).

### 3. Soporte de Mandos y Optimización de Bundle
- **Gamepad API Integrado ([`InputManager.js`](src/core/InputManager.js)):** Soporte automático para mandos Xbox, PlayStation (DualShock / DualSense) y mandos genéricos USB/Bluetooth.
- **Code-Splitting en Vite ([`vite.config.js`](vite.config.js)):** Three.js separado en chunk independiente (`manualChunks: { three: ['three'] }`), optimizando la transferencia web.
- **Favicons Vectoriales Inline:** Sin peticiones 404 ni dependencias externas de red.

### 4. Audio 3D HRTF y Tensión Dinámica
- **Audio Posicional Convolutivo ([`AudioManager.js`](src/core/AudioManager.js)):** `PannerNode` configurado en modo `HRTF` sincronizado en tiempo real con las coordenadas 3D del Yeti y de la cámara.
- **Latido Cardíaco Sub-Bass:** Osciladores de 54 Hz y 76 Hz que generan un latido acelerado de 72 a 187 BPM cuando el Yeti acorta distancia a menos de 65 metros.
- **Pisadas Sincronizadas y Viento Dinámico:** Pasos pesados acoplados a la cinemática de carrera del Yeti y filtrado resonante reactivo al turbo.

---

## 🚀 Cómo Ejecutar

Requiere **Node.js 20.19+**, **22.12+** o **24+** y **npm**:

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo con recarga rápida (HMR)
npm run dev

# 3. Ejecutar suite completa de 19 pruebas automatizadas
npm test

# 4. Compilar bundle de producción optimizado
npm run build

# 5. Previsualizar build de producción
npm run preview
```

El directorio `dist/` contiene la compilación estática lista para producción (`base: './'`), separando el motor Three.js del código de juego.

---

## 🎮 Esquema de Controles

### Mandos de Consola (Xbox / PlayStation / Mandos Estándar)
| Control | Acción en el Juego |
| :--- | :--- |
| **Stick Izquierdo / Cruceta (D-Pad)** | Conducción analógica y dirección suave. |
| **Gatillo Izquierdo (LT / L2) / Botón B (Círculo)** | Freno en cuña con proyección lateral de nieve. |
| **Gatillo Derecho (RT / R2) / Botón A (Cruz)** | Aceleración Turbo alpino. |
| **Botón X / Cuadrado** | **Alternar Piloto Automático IA (`OFF` $\to$ `AUTOPILOT` $\to$ `CO_PILOT`).** |
| **Start / Options** | Pausa y reanudación instantánea. |
| **Back / Select / Share** | Reinicio rápido de la bajada. |

### Teclado
| Acción | Teclas Primarias | Teclas Alternativas |
| :--- | :---: | :---: |
| **Girar** | `←` / `→` | `A` / `D` |
| **Freno en Cuña** | `↑` | `W` |
| **Posición de Descenso (Tuck)** | `↓` | `S` |
| **Turbo Alpino** | `Espacio` | `Shift` (izq. o der.) / `F` |
| **🤖 Alternar Piloto IA (Auto / Co-Pilot)** | `T` | `Tab` |
| **Pausar / Reanudar** | `Escape` | — |
| **Reiniciar Bajada** | `R` | — |
| **Iniciar desde Menú** | `Enter` | `Espacio` |
| **Panel de Diagnóstico 3D y Telemetría XAI** | `F2` | `` ` `` (acento grave) |

### Dispositivos Móviles y Táctiles
- Cuatro botones táctiles adaptados con *Pointer Events* y multitouch simultáneo:
  - `◀ IZQ` y `▶ DER`: Conducción y giro.
  - `∧ FRENO`: Frenado con spray de nieve.
  - `ϟ TURBO`: Aceleración máxima a 35 m/s.

---

## 🏛️ Estructura de Módulos

```
snow-escape/
├── index.html                   # Contenedor HTML semántico y layouts de interfaz
├── package.json                 # Metadatos, scripts y dependencias (Three.js + Vite)
├── vite.config.js               # Configuración de empaquetado y code-splitting
├── tests/
│   ├── physics.test.js          # Pruebas unitarias de CCD, corredor seguro y memoria
│   └── ai.test.js               # Pruebas de Behavior Trees, Lead Pursuit, MPC y DDA
└── src/
    ├── config.js                # Constantes de juego, paletas de color y parámetros físicos
    ├── main.js                  # Orquestador del ciclo de vida y eventos de juego
    ├── styles.css               # Estilos CSS, diseño responsive, insignias IA y overlays
    ├── ai/
    │   ├── BehaviorTree.js      # Framework jerárquico zero-allocation de Behavior Trees
    │   ├── YetiAI.js            # Percepción de 5 bigotes, Lead Pursuit y Pounce Leap
    │   ├── SkierAgentAI.js      # Agente esquiador autónomo (Autopilot y Co-Piloto MPC)
    │   ├── DDAEngine.js         # Dynamic Difficulty Adjustment (Canal de Flujo Csikszentmihalyi)
    │   ├── AITelemetry.js       # Observabilidad, latencia y XAI en tiempo real
    │   └── AIDebugRenderer.js   # Gizmos 3D Three.js (rayos sensoriales y retícula cian)
    ├── core/
    │   ├── Engine.js            # Renderer Three.js, luces PBR, cámara con banking y resize
    │   ├── InputManager.js      # Manejo unificado de teclado, Gamepad API y multitouch
    │   ├── AudioManager.js      # Sintetizador Web Audio, PannerNode HRTF y latido de tensión
    │   └── StorageManager.js    # Persistencia de récords y fallback tolerante a fallos
    ├── entities/
    │   ├── Player.js            # Lógica del esquiador, saltos parabólicos, slalom y giros 360°
    │   ├── Yeti.js              # Entidad cinemática del Yeti con cerebro YetiAI integrado
    │   └── ProceduralModels.js  # Geometrías procedurales y materiales PBR compartidos
    ├── physics/
    │   └── CollisionSystem.js   # Broad phase por bloques y Swept CCD cilindro/AABB
    ├── world/
    │   ├── MountainTerrain.js   # Terreno procedural continuo y cordilleras distantes
    │   ├── WorldGenerator.js    # RNG con semilla, corredor seguro, puertas de slalom y rampas
    │   ├── ObstaclePool.js      # InstancedMesh para pinos, rocas, banderas y rampas inclinadas
    │   └── SnowTracks.js        # Buffers persistentes de huellas y partículas de nieve
    └── ui/
        ├── HUD.js               # Visualización a 10 Hz de velocidad, distancia, insignias IA y XAI
        └── MenuManager.js       # Control de pantallas de menú, pausa, modo IA y game over
```

| Módulo | Responsabilidad |
|---|---|
| [`src/main.js`](src/main.js) | Coordinación general de estados, bucle de simulación a 60 Hz y eventos de juego |
| [`src/ai/BehaviorTree.js`](src/ai/BehaviorTree.js) | Framework extensible de Behavior Trees con tracing y nodos compuestos |
| [`src/ai/YetiAI.js`](src/ai/YetiAI.js) | Cerebro táctico del Yeti: radar de bigotes, intercepción predictiva y pounce |
| [`src/ai/SkierAgentAI.js`](src/ai/SkierAgentAI.js) | Agente autónomo con rollouts heurísticos MPC, autopiloto y asistencia de copiloto |
| [`src/ai/DDAEngine.js`](src/ai/DDAEngine.js) | Motor DDA de ajuste dinámico de dificultad basado en el canal de flujo psicológico |
| [`src/ai/AITelemetry.js`](src/ai/AITelemetry.js) | Colector de métricas en tiempo real, latencias de decisión y resúmenes XAI |
| [`src/ai/AIDebugRenderer.js`](src/ai/AIDebugRenderer.js) | Renderizador Three.js de rayos sensoriales, retícula cian y curvas de predicción |
| [`src/config.js`](src/config.js) | Constantes, paletas PBR, parámetros físicos, corredor seguro canónico y validación |
| [`src/core/Engine.js`](src/core/Engine.js) | Inicializador WebGL, fixed timestep, sombras PBR, descarte visible y calidad adaptativa |
| [`src/core/InputManager.js`](src/core/InputManager.js) | Unificación de Teclado, Gamepad API y controles táctiles |
| [`src/core/AudioManager.js`](src/core/AudioManager.js) | Síntesis Web Audio con PannerNode HRTF, pasos, campanilla de slalom y gestión estricta de memoria |
| [`src/core/StorageManager.js`](src/core/StorageManager.js) | Persistencia aislada de récords por modo con fallback seguro en memoria |
| [`src/world/MountainTerrain.js`](src/world/MountainTerrain.js) | Parches de terreno procedural y siluetas montañosas lejanas |
| [`src/world/WorldGenerator.js`](src/world/WorldGenerator.js) | RNG reproducible, corredor seguro (safeHalf=4.2m), puertas de slalom y rampas |
| [`src/world/ObstaclePool.js`](src/world/ObstaclePool.js) | InstancedMesh para pinos, rocas, banderas y rampas inclinadas |
| [`src/world/SnowTracks.js`](src/world/SnowTracks.js) | Buffers estáticos para 720 marcas de esquí y 650 copos de nieve sin GC |
| [`src/entities/Player.js`](src/entities/Player.js) | Físicas del esquiador, saltos parabólicos, giros 360°, energía y frenado |
| [`src/entities/Yeti.js`](src/entities/Yeti.js) | Cinemática y animación del Yeti con delegación de decisiones en `YetiAI` |
| [`src/entities/ProceduralModels.js`](src/entities/ProceduralModels.js) | Geometrías de personajes y árboles generadas por código |
| [`src/physics/CollisionSystem.js`](src/physics/CollisionSystem.js) | Broad phase y Swept CCD cilindro/AABB para evitar tunneling |
| [`src/ui/HUD.js`](src/ui/HUD.js) | Marcador a 10 Hz de velocidad, distancia, puntos, insignias IA y telemetría XAI |
| [`src/ui/MenuManager.js`](src/ui/MenuManager.js) | Control de overlays de menú, pausa, selección de modo IA y récords |

---

## 🧪 Pruebas Unitarias Automatizadas (`npm test`)

La suite automatizada valida **22/22 especificaciones críticas** con el runner nativo de Node.js en tres suites:

### 1. Inteligencia Artificial ([`tests/ai.test.js`](tests/ai.test.js) — 13 tests)
- ✅ **Behavior Tree Selector:** Evaluación secuencial hasta éxito o estado running.
- ✅ **Behavior Tree Sequence:** Evaluación secuencial hasta fallo o estado running.
- ✅ **Behavior Tree Inverter:** Inversión de polaridad booleana de nodos decorados.
- ✅ **YetiAI Lead Pursuit:** Interceptación predictiva vectorial basada en velocidad relativa.
- ✅ **YetiAI Slalom Weave Counter:** Detección de oscilación y recorte hacia el centro.
- ✅ **YetiAI Whisker Radar:** Detección de obstáculos por rayos y generación de fuerza repulsiva.
- ✅ **SkierAgentAI Ciclo de Modos:** Transición entre `OFF`, `AUTOPILOT` y `CO_PILOT`.
- ✅ **SkierAgentAI Autopilot:** Evasión autónoma de obstáculos sin asistencia humana.
- ✅ **SkierAgentAI Co-Pilot:** Intervención con frenado o giro ante colisión inminente.
- ✅ **DDAEngine Inicial:** Estado en BALANCE con modulación unitaria neutral.
- ✅ **DDAEngine Alivio:** Transición a RELIEF y reducción de velocidad ante caídas sucesivas.
- ✅ **DDAEngine Oleada:** Transición a SURGE y aumento de reto ante rachas de combo y saltos.
- ✅ **AITelemetry Formatted Summary:** Generación de diagnósticos XAI en tiempo real libre de excepciones.

### 2. Coherencia e Invariantes ([`tests/coherence.test.js`](tests/coherence.test.js) — 3 tests)
- ✅ **Invariantes de configuración:** Verificación de consistencia entre `safeHalf`, `halfWidth`, `maxSteps` y `maxAccumulator`.
- ✅ **Especificación certificada:** Coincidencia estricta de `safeHalf === 4.2 m`.
- ✅ **Navegabilidad continua:** Validación del eje sinusoidal sin saltos laterales insuperables a lo largo de 10 km.

### 3. Físicas, Generación y Persistencia ([`tests/physics.test.js`](tests/physics.test.js) — 6 tests)
- ✅ **CCD contra cilindros:** Cruces rápidos a 35 m/s, tangencias y reposo.
- ✅ **CCD contra cajas AABB expandidas:** Detección de impacto para rocas.
- ✅ **Corredor seguro:** Verificación a lo largo de 10.000 metros en 100 semillas distintas sin bloqueos.
- ✅ **Determinismo y reutilización de memoria:** Reciclaje de matrices sin fugas ni recolector de basura agresivo.
- ✅ **Detección rápida en Broad Phase:** Segmentación espacial por bloques.
- ✅ **Aislamiento de StorageManager:** Funcionamiento tolerante a fallos sin dependencias de `localStorage`.

---

## 📄 Licencia

MIT License. Todos los recursos visuales, matemáticos y acústicos son 100% sintéticos y libres de dependencias de terceros.
