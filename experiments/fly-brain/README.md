# 🪰 Drosophila Fly-Brain AI — Simulación Neurobiológica para Snow Escape 3D PRO

Experimento de Inteligencia Artificial Neurocomputacional que conecta la simulación biológica de la red neuronal del cerebro de la mosca de la fruta (*Drosophila melanogaster*) como un agente rival autónomo ("Fly-Bot") que compite en tiempo real contra el jugador y el Yeti en las pendientes alpinas de **Snow Escape 3D PRO**.

Basado en los modelos de conectoma biológico de **FlyWire** y las implementaciones de simulación de redes de impulsos (*Spiking Neural Networks* - SNN) con dinámica **Leaky Integrate-and-Fire (LIF)** de **Eon Systems (`fly-brain`)**.

---

## 🏛️ 1. Arquitectura del Sistema

El sistema implementa una **arquitectura de doble motor (*Dual-Engine*)**:

```mermaid
graph TD
    subgraph Cliente 3D (games/3d-pro)
        A[Entorno Alpino Three.js: Obstáculos, Yeti, Slalom] --> B[Sensor Raycasting: Flujo Óptico y Peligros]
        B --> C[FlyBrainCompetitorAI]
        C -->|Evaluación Dual| D{¿WebSocket Conectado?}
        D -->|Online| E[Modo Servidor: bridge_server.py / PyTorch]
        D -->|Offline / Fallback| F[Modo Local JS: Simulador LIF 60 Hz]
        E --> G[Salidas Motoras: Giro, Freno, Salto, Turbo]
        F --> G
        G --> H[FlyCompetitor: Entidad 3D en Pista]
        C --> I[Telemetría XAI en Vivo: Panel F2]
    end

    subgraph Servidor Neurocomputacional (experiments/fly-brain)
        J[bridge_server.py: WS 8765] <--> E
        J --> K[drosophila_lif_sim.py: SNN LIF Biológico]
    end
```

### Motor 1: Modo Servidor Python (PyTorch / WebSocket)
- Se ejecuta en un proceso independiente en Python (`experiments/fly-brain/bridge_server.py`).
- Mantiene la simulación matemática de la red de impulsos con integración numérica Runge-Kutta/Euler a 1000 Hz por paso de tiempo biológico.
- Comunicación bidireccional por WebSocket de latencia ultra-baja (< 2 ms en `ws://127.0.0.1:8765`).

### Motor 2: Modo Local SNN en JavaScript (Zero-Dependencies)
- Si el servidor Python no está encendido, el cliente web **no falla**: conmuta de forma automática e instantánea al emulador biológico LIF implementado nativamente en `games/3d-pro/src/ai/FlyBrainCompetitorAI.js`.
- Ejecuta matrices tipadas (`Float32Array`) con potenciales de membrana, umbrales y periodos refractarios a 60 FPS sin consumo extra de CPU.

---

## 🔬 2. Mapeo Neurobiológico del Conectoma Drosophila

El modelo simula grupos neuronales específicos descubiertos en el conectoma de la mosca (*FlyWire* / *Janelia*):

| Grupo Neuronal | Circuito Biológico Real | Función en el Juego | Dinámica SNN |
| :--- | :--- | :--- | :--- |
| **LPTC** *(Lobula Plate Tangential Cells)* | Sistema Visual Lateral | Detecta movimiento de obstáculos y flujo óptico a los lados. | Picos excitatorios contralaterales proporcionales a `left_hazard` y `right_hazard`. |
| **LPLC2 / Collicular** | Detección de *Looming* | Detecta peligro frontal inminente (troncos o Yeti a corta distancia). | Despolarización exponencial ante amenaza que se expande en el centro visual. |
| **Central Complex** | Anillo Atractor / Brújula | Orientación hacia las banderas de slalom y corrección de trazada. | Modula la excitación basal para mantener el descenso eficiente. |
| **DNa01 / DNa02** | Neuronas Motoras Descendentes | Control motor directo de giro (volante). | Disparan ráfagas a las extremidades; el balance `M_R - M_L` define el ángulo de giro (`steer`). |
| **Giant Fiber (GF)** | Reflejo de Escape Rápido | Reacción de supervivencia instantánea. | Al superar el umbral crítico, dispara un pulso motor masivo que acciona el **salto evasivo acrobático** o **turbo**. |

### Ecuación de Membrana Leaky Integrate-and-Fire (LIF)
Cada neurona se rige por:

$$\tau_m \frac{dV_i}{dt} = -(V_i - V_{rest}) + R_m I_i(t) + \sum_{j} w_{ji} \cdot S_j(t)$$

Cuando $V_i \ge V_{thresh}$, la neurona emite un pico ($S_i(t) = 1$), se reinicia a $V_{reset} = -75\text{ mV}$ y entra en un periodo refractario de $2\text{ ms}$.

---

## 🎮 3. Cómo Usar el Experimento

### Método A: Prueba Rápida Directa en el Navegador (Modo Local)
No requiere instalar Python ni configurar entornos virtuales.

1. Inicia el servidor del juego (si no está encendido):
   ```powershell
   cd e:\Yeti\games\3d-pro
   npm run dev
   ```
2. Abre [http://localhost:5173/](http://localhost:5173/) en tu navegador.
3. Puedes activar al rival de dos maneras:
   * **En el menú de inicio:** Haz clic en el botón `🪰 Rival Drosophila: ACTIVO`.
   * **Durante la partida:** Presiona la tecla **`B`** en cualquier momento para invocarlo o retirarlo.
4. Presiona **`F2`** para abrir el panel de diagnóstico XAI y ver los picos neuronales (`Spikes S/C/M/GF`) disparándose en vivo.

---

### Método B: Modo Completo con Servidor Puente Python
Para experimentar con modelos en Python o ajustar la dinámica neurocomputacional:

1. **Instalación y dependencias (solo la primera vez):**
   ```powershell
   cd e:\Yeti\experiments\fly-brain
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```
2. **Iniciar el servidor:**
   * Haz doble clic en [`start_bridge.bat`](file:///e:/Yeti/experiments/fly-brain/start_bridge.bat)
   * O ejecuta en la terminal:
     ```powershell
     python bridge_server.py
     ```
   El servidor responderá:
   ```
   [FlyBrain-Bridge] Servidor WebSocket activo en ws://127.0.0.1:8765
   ```
3. **Jugar:** Abre el juego en el navegador y activa el rival con **`B`**. El panel de diagnóstico (`F2`) mostrará automáticamente:
   ```
   [AI DROSOPHILA SNN] Motor: PYTHON_PYTORCH (WS ONLINE)
   ```

---

## 🔌 4. Cómo Integrar este Cerebro en Otros Juegos o Entidades

Si deseas usar esta IA en otro actor del juego o en un proyecto externo, sigue estos sencillos pasos:

### Paso 1: Instanciar la IA en JavaScript
Importa la clase desde [`FlyBrainCompetitorAI.js`](file:///e:/Yeti/games/3d-pro/src/ai/FlyBrainCompetitorAI.js):

```javascript
import { FlyBrainCompetitorAI } from './src/ai/FlyBrainCompetitorAI.js';

// Instancia el controlador inteligente
const flyBrain = new FlyBrainCompetitorAI({
  serverUrl: 'ws://127.0.0.1:8765', // URL del puente Python opcional
  enabled: true
});
```

### Paso 2: Alimentar la Percepción en cada Frame
En tu bucle de actualización (`update(dt)`), calcula los peligros del entorno y pásaselos al cerebro:

```javascript
// Vector de percepción normalizado (valores de 0.0 a 1.0)
const perception = {
  left_hazard: 0.8,     // Peligro a la izquierda (árbol/roca detectado)
  right_hazard: 0.0,    // Despejado a la derecha
  center_hazard: 0.2,   // Distancia al obstáculo frontal
  yeti_proximity: 0.5,  // Cercanía de la amenaza/depredador (0=lejos, 1=inmediato)
  goal_bias: 0.1        // Desvío angular hacia el objetivo deseado
};

// Actualiza el estado sináptico
flyBrain.stepLocalSNN(perception, dt);
```

### Paso 3: Aplicar las Acciones Motoras Resultantes
Lee las decisiones tomadas por las neuronas motoras y aplícalas al modelo 3D o cuerpo físico:

```javascript
// Dirección: -1.0 (giro brusco a la izquierda) a +1.0 (giro brusco a la derecha)
const steerInput = flyBrain.steer;

// Reflejos de escape disparados por la neurona Giant Fiber
if (flyBrain.jump) {
  miEntidad.ejecutarSaltoAcrobatico();
}

if (flyBrain.turbo) {
  miEntidad.activarTurboBoost();
}

// Telemetría para HUD o depuración
console.log(flyBrain.telemetry);
// { connected: false, sensorySpikes: 24, centralSpikes: 30, motorSpikesLeft: 0, motorSpikesRight: 12, giantFiberSpikes: 2, engine: 'LOCAL_LIF' }
```

---

## 📡 5. Especificación del Protocolo WebSocket

Para clientes que no usen JavaScript (C++, Godot, Unity, Rust):

### 1. Saludo Inicial (*Handshake*)
Al conectar, el servidor Python envía:
```json
{
  "type": "handshake",
  "status": "ready",
  "model": "Drosophila_melanogaster_LIF",
  "neurons": 56,
  "tickHz": 60
}
```

### 2. Mensaje de Percepción (Cliente $\to$ Servidor)
Enviar a 60 Hz:
```json
{
  "type": "perception",
  "data": {
    "left_hazard": 0.0,
    "right_hazard": 0.75,
    "center_hazard": 0.1,
    "yeti_proximity": 0.3,
    "goal_bias": -0.2
  }
}
```

### 3. Mensaje de Acción Motora (Servidor $\to$ Cliente)
Respuesta en tiempo real (< 2 ms):
```json
{
  "type": "action",
  "steer": -0.85,
  "jump": false,
  "turbo": true,
  "brake": false,
  "telemetry": {
    "sensorySpikes": 18,
    "centralSpikes": 26,
    "motorSpikesLeft": 12,
    "motorSpikesRight": 1,
    "giantFiberSpikes": 0,
    "membraneV": [-70.0, -70.0, -52.4, -68.1]
  }
}
```

---

## 🧪 6. Suites de Prueba y Verificación

Para certificar la estabilidad de todos los componentes neuronales:

```powershell
# 1. Pruebas neurobiológicas en Python (LIF, dinamica contralateral y reflejo GF):
cd e:\Yeti\experiments\fly-brain
python verify_sim.py

# 2. Pruebas de integración WebSocket end-to-end:
python test_websocket.py

# 3. Pruebas unitarias completas del juego y motor SNN en JavaScript:
cd e:\Yeti\games\3d-pro
npm test
```
*Resultado certificado:* **37/37 tests unitarios aprobados sin excepciones.**
