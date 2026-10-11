# Drosophila Fly-Brain AI Experiment for Snow Escape 3D PRO

Este experimento conecta la simulación neurobiológica del cerebro de la mosca de la fruta (*Drosophila melanogaster*) como un agente rival autónomo que compite contra ti y contra el Yeti en la montaña alpina.

## Arquitectura

1. **Cliente Web (Three.js / Vite):**
   - El juego (`games/3d-pro`) genera la percepción del mundo:
     - Rayos de flujo óptico a izquierda y derecha.
     - Detección de peligro inminente (árboles y rocas).
     - Proximidad del Yeti (reflejo de escape / amenaza).
     - Puertas de slalom (objetivo atractor).
   - `FlyBrainAgentAI.js`: Agente competidor con doble motor:
     - **Modo Servidor:** Se conecta vía WebSocket a este micro-servidor Python (`ws://127.0.0.1:8765`).
     - **Modo Local SNN:** Emulador biológico integrado en JavaScript a 60 FPS por si el servidor Python no está encendido.

2. **Servidor Puente (Python):**
   - `bridge_server.py`: Servidor WebSocket asíncrono a baja latencia.
   - `drosophila_lif_sim.py`: Simulación de redes neuronales de impulsos (Spiking Neural Network) con neuronas *Leaky Integrate-and-Fire* (LIF).
   - Mapeo de neuronas biológicas reales de FlyWire:
     - **LPTC (Lobula Plate Tangential Cells):** Detección de flujo óptico y movimiento lateral.
     - **LPLC2 / Collicular:** Detección de colisión inminente (*looming reflex*).
     - **Central Complex:** Anillo atractor de orientación de rumbo.
     - **DNa01 / DNa02 (Descending Neurons):** Neuronas motoras de control de giro.
     - **Giant Fiber (GF):** Disparo de escape de emergencia (salto/turbo).

## Cómo Ejecutar el Servidor Python

1. Crea y activa el entorno virtual:
   ```powershell
   cd experiments/fly-brain
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

2. Inicia el servidor puente:
   ```powershell
   python bridge_server.py
   ```

3. Abre el juego:
   - Al iniciar la partida en **Snow Escape 3D PRO**, presiona la tecla **`B`** (o activa "RIVAL MOSCA" en el menú) para ver al competidor descender la montaña guiado por impulsos neuronales biológicos.
