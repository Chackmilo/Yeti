# 🎮 Guía Universal de Controles & Dinámica Jugable — Snow Escape Suite

Esta guía detalla la configuración de entradas, normalización y mecánicas de control para las tres ediciones de la suite (**2D Retro Canvas**, **3D Standalone** y **3D PRO Modular**).

---

## ⌨️ Teclado

| Acción | Teclas Primarias | Teclas Alternativas | Comportamiento & Física |
| :--- | :---: | :---: | :--- |
| **Girar Izquierda / Derecha** | `←` / `→` | `A` / `D` | Giro lateral con estela de esquí y ángulo de descenso dinámico. |
| **Freno en Cuña (Snowplow)** | `↑` | `W` | Deceleración progresiva y fricción lateral controlada para pasos estrechos y ajuste de trazada en puertas de slalom. |
| **Posición de Descenso (Tuck)** | `↓` | `S` | Reduce la resistencia aerodinámica e incrementa la velocidad cuesta abajo en línea recta. |
| **⚡ Turbo Boost** | **`Espacio`** | `Shift` (izq./der.) / `F` | Aceleración extrema a 35 m/s. <br>• **En Clásico:** Ilimitado. En ambos modos, mientras el turbo está activo, la autoridad de giro baja al 76% (`turnAuthority = 0.76`).<br>• **En Moderno:** Consume estamina (6 s de uso, 8 s recarga). |
| **⏸️ Pausa / Reanudar** | **`Escape`** | — | Pausa exclusiva: congela la simulación y despliega el menú sin interferir con el turbo. |
| **🤖 Alternar Piloto IA** | `T` | `Tab` | *(Edición PRO)* Conmuta entre `HUMANO (OFF)`, `AUTOPILOT` y `CO_PILOT`. |
| **Reiniciar Pista** | `R` | — | Reinicia la bajada con una nueva semilla procedural. |
| **Iniciar desde Menú** | `Enter` | — | Arranca el descenso desde el menú principal. |
| **Herramientas de Diagnóstico** | `F2` | `` ` `` (backtick) | Alterna gizmos 3D (rayos sensoriales, retícula de intercepción y llamadas de dibujo). Oculto de la interfaz pública para mayor inmersión. |

---

## 🎮 Mandos de Consola (Gamepad API — Edición PRO)

Soporte nativo con detección automática en caliente (Xbox Series/One, PlayStation DualSense/DualShock y mandos estándar USB/Bluetooth):

| Control del Mando | Acción | Detalle Técnico |
| :--- | :--- | :--- |
| **Stick Izquierdo / Cruceta (D-Pad)** | Dirección y Giro | Eje convertido a digital: ±0.28 en horizontal (giro) y ±0.35 en vertical (arriba = freno, abajo = descenso). |
| **Gatillo Izquierdo (LT / L2) o Botón B** | Freno en Cuña | Modulación analógica de desaceleración y spray de nieve. |
| **Gatillo Derecho (RT / R2) o Botón A** | Turbo Boost | Impulso de velocidad máxima inmediata. |
| **Botón X / Cuadrado** | **Alternar Piloto IA** | Ciclo dinámico: `OFF` $\to$ `AUTOPILOT` $\to$ `CO_PILOT`. |
| **Start / Options** | Pausa / Continuar | Alterna overlay modal de pausa. |
| **Botón Y / Triángulo** | Reinicio Rápido | Regenera la montaña sin recargar la página. |
| **Back / Select / Share** | Diagnóstico 3D | Alterna telemetría XAI y gizmos (equivale a `F2`). |

---

## 📱 Dispositivos Móviles y Pantallas Táctiles

Los controles táctiles implementan una arquitectura ergonomica con **Pointer Events** de baja latencia, captura de puntero individual (*Pointer Capture*) y soporte completo para **pulsación multitáctil concurrente**:

* `◀ IZQ` y `▶ DER`: Conducción y trazada lateral gestionada con el pulgar izquierdo.
* `∧ FRENO`: Freno en cuña snowplow accionado con el pulgar derecho para negociar curvas estrechas y esquivar pinos.
* `⚡ TURBO`: Impulso de velocidad accionado con el pulgar derecho.
* **Giro y Turbo Simultáneos:** Gracias al seguimiento independiente de `pointerId`, puedes mantener pulsado `◀ IZQ` o `▶ DER` con la mano izquierda mientras mantienes presionado `⚡ TURBO` con la mano derecha. No hay bloqueo de entrada ni cancelación entre ambos dedos.

---

## 🕹️ Modos de Juego: Clásico vs. Moderno

La suite ofrece dos filosofías de juego bien diferenciadas para ajustarse al estilo de cada esquiador:

| Característica | 👾 Modo Clásico | ⚡ Modo Moderno |
| :--- | :--- | :--- |
| **Duración del Turbo** | **Ilimitado (Infinito)** | **Limitado por Estamina (6 s continuos)** |
| **Inercia y Maniobrabilidad** | Velocidad máxima de 35 m/s con **autoridad de giro reducida al 76%** (`turnAuthority = 0.76`). Exige soltar turbo o frenar para no derrapar hacia los pinos. | **Giro completo sin turbo**; con turbo activo también baja al 76%, pero el turbo es un recurso escaso y táctico. |
| **Recarga de Energía** | No aplica (el turbo siempre está disponible). | Recarga pasiva completa en **8 segundos**, o instantánea mediante slalom. |
| **Recompensa de Puerta Slalom** | **Impulso de velocidad inmediata (+3.0 m/s)** y bonificación exponencial de puntos (`150 * combo`). | Recarga instantánea del **+25% de la barra de energía** y puntos por combo (`100 * combo`). |
| **Indicador en HUD** | `Turbo ∞` con barra cian estática. | Medidor de estamina porcentual (`0% - 100%`) con aviso cromático ámbar/rojo al bajar del 23%. |
| **Recomendado para** | Nostálgicos de *SkiFree*, velocidad pura y reflejos de alta inercia. | Juego táctico, gestión de energía, acrobacias encadenadas y trazada precisa. |

---

## 🦦 Protagonista: La Nutria Esquiadora

En las tres ediciones, el esquiador tradicional se transforma en una carismática **Nutria Esquiadora**:
* **Casco y Gafas:** Casco dorado de competición (`#f5b936`), montura oscura (`#243346`) y gafas de ventisca aerodinámicas con lente de brillo cian alpino (`#bdefff`).
* **Bufanda al Viento:** Bufanda naranja/roja (`#ff684a`) cuyo extremo ondea rítmicamente con el viento y multiplica su aleteo al activar el turbo.
* **Esquís Dobles:** Dos esquís color turquesa (`#16b8c4`) con fijaciones reforzadas y puntas curvadas. Se orientan en cuña `V` al frenar.
* **Cola Dinámica Reactiva:** Una cola visible que no solo se mece al ritmo natural del descenso, sino que **se balancea activamente en sentido contrario y se inclina al tomar curvas pronunciadas**, aportando una sensación orgánica y viva.
* **Físicas Desacopladas:** La silueta visual, la bufanda y la cola son completamente cosméticas; las hitboxes de colisión (`CCD` / `AABB`), velocidad de planeo y dificultad permanecen rigurosamente calibradas.

---

## 🚩 Mecánicas Avanzadas de Carrera

### 1. Inercia del Turbo Ilimitado (Física Clásica)
En modo Clásico, el turbo es infinito, pero viajar a 35 m/s (126 km/h) reduce la autoridad de giro lateral al 76%. Mantener pulsado el turbo en bosques densos provocará un derrape exterior inevitable hacia los árboles; el jugador experto debe soltar el turbo o pulsar el freno en cuña para recuperar agarre y maniobrabilidad.

### 2. Puertas de Slalom (Diferenciadas por Modo)
* **Modo Clásico:** Cruzar una puerta otorga un **impulso de velocidad instantáneo (+3.0 m/s)** y bonificación de puntos multiplicada (`150 * combo`).
* **Modo Moderno:** Cruzar una puerta recarga inmediatamente el **+25% de la barra de turbo** y suma `100 * combo` puntos.

### 3. Rampas y Acrobacias Aéreas 360°
Al embestir una rampa alpina con impulso, la nutria salta en una parábola de 2.8 m de elevación, ejecutando un giro de 360° en el aire y volando por encima de árboles y rocas. La recompensa de **+250 PTS** se otorga **exclusivamente al completar un aterrizaje limpio sobre la nieve**, acompañada de partículas spray, vibración auditiva y aceleración extra.

### 4. Alerta Visual de Proximidad (Edición PRO)
Cuando el Yeti está a menos de **65 m**, los bordes de la pantalla laten en rojo con una intensidad proporcional a la cercanía. Es el mismo umbral que el latido sonoro, para que jugar sin audio no sea una desventaja. El pulso es lento (menos de 1 Hz), se desactiva con `prefers-reduced-motion` y la capa no bloquea los controles táctiles.
