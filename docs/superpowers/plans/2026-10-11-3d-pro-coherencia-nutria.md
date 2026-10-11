# Coherencia 3D PRO (Nutria + Alerta del Yeti) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** Cerrar en `games/3d-pro` las diferencias entre lo que afirma el informe de la "Nutria Esquiadora" y el código real. Lo primero es la alerta visual de proximidad, que hoy no se ve.

**Arquitectura:** Hoy la alerta es un `box-shadow: inset` sobre `#viewport`, y el canvas WebGL opaco la tapa. Pasa a ser una capa DOM propia, `#yetiAlert`, situada encima del canvas y debajo del HUD. Su intensidad la calcula una función pura, `yetiAlertLevel()`, que se puede testear en Node. El umbral de 65 m se comparte con el latido de audio mediante `CONFIG.alertRange`. El resto son ajustes pequeños en el menú, el HUD, el modelo de la nutria y la documentación, cada uno con su test en `node --test`.

**Stack:** Three.js 0.170.0, Vite 6, ES modules, `node:test` (CI con Node 20.x y 22.x), CSS plano.

**Spec:** informe pegado en el chat el 2026-10-11 ("Nutria Esquiadora" y mejoras de coherencia de las tres ediciones). Los requisitos que aplican a 3d-pro están citados en *Restricciones globales*; el resultado de la verificación, en *Contexto*.

## Restricciones globales

- Alcance: solo `games/3d-pro/` y la documentación que la describe (`README.md` raíz, portal `index.html`, `docs/*`). No tocar `games/2d-retro/` ni `games/3d-standalone/`.
- Sin dependencias nuevas: `three` 0.170.0 y `vite` ^6.3.5. Los tests corren con `node --test` en Node 20.x y 22.x.
- Físicas intactas: radio de colisión del jugador `0.39`, CCD, `normalSpeed 20`, `turboSpeed 35` y `turnAuthorityTurbo 0.76` no cambian. Los 22 tests actuales deben seguir pasando.
- Umbral de la alerta de proximidad: **65 m**, el mismo que el latido de audio (`CONFIG.alertRange`).
- El pulso de la alerta va a **≤ 1 Hz** (WCAG 2.3.1 pide menos de 3 destellos por segundo), sin animación con `prefers-reduced-motion: reduce` y con `pointer-events: none`.
- Colores de la nutria, tomados del informe: casco `#f5b936`, montura `#243346`, lente `#bdefff`, bufanda `#ff684a`, esquís `#16b8c4`.
- Textos de la UI en español. Los nombres de los tests también, como los existentes.
- No editar `dist/` a mano: se regenera con `npm run build`.

## Review Focus

1. **Volver al menú o pausar justo después de una captura.** `yeti.status` se queda en `'caught'` y la alerta debe quedar en 0 fuera de `playing`/`caught`. Lo cubren el test "apagada fuera de partida" y el test de cableado del HUD (Tarea 1).
2. **Tocar los botones táctiles con la alerta encendida.** La capa no puede robar los toques. Lo cubren el test CSS de `pointer-events:none` y el chequeo `elementFromPoint` en el navegador (Tarea 1).
3. **Fotosensibilidad y movimiento reducido.** El pulso tiene que ser lento y desactivarse con `prefers-reduced-motion`. Lo cubren el test CSS del pulso y el chequeo con emulación de media (Tarea 1).
4. **`gap` no numérico (NaN) si el Yeti no tiene `d`.** La alerta debe quedar en 0. Lo cubre el test "robusta ante gap inválido" (Tarea 1).
5. **Paridad entre audio y vista.** La alerta visual tiene que cubrir el mismo rango que el latido, porque "jugar sin sonido no es desventaja". Lo cubren el test `C.alertRange === 65` y el `grep` que confirma que `AudioManager.js` ya no tiene el literal `65` (Tarea 1).

## Contexto: resultado de la verificación (2026-10-11)

| Afirmación del informe | Estado real en 3d-pro | Evidencia |
| :--- | :--- | :--- |
| Alerta roja perimetral pulsante desde 65 m | ❌ **Invisible.** El `box-shadow: inset` sobre `#viewport` se pinta debajo de sus hijos, y el canvas WebGL es opaco y ocupa el 100 %. Además el umbral es 60 m y no hay pulso. | `src/ui/HUD.js:66-75`, `src/core/Engine.js:8,14`, `src/styles.css` (`#viewport`, `canvas{width:100%;height:100%}`). La captura del agente anterior de Standalone, que usa el mismo código, con el Yeti a 0 m (alpha 0.65) no muestra rojo. |
| HUD con fases "aparece en / está a / burlado" | ✅ Las tres fases existen. ⚠️ Con el Yeti burlado se ve "— m". | `src/ui/HUD.js:63-65`, `index.html:56` |
| Accesibilidad del menú | ❌ `aria-checked` nunca se actualiza al cambiar de modo o de distancia. | `src/ui/MenuManager.js:27-40` |
| Materiales y colores de la nutria | ✅ casco, montura, bufanda y esquís coinciden. ❌ La lente usa `teal #3dc8c1`, no `#bdefff`. | `src/entities/ProceduralModels.js:3,18` |
| La bufanda aletea más rápido con turbo | ⚠️ Solo cambia la amplitud (×1.8); la frecuencia sigue fija en 12. | `src/entities/Player.js:225` |
| Cola `sin(t·7)·0.16 − ángulo·0.45` | ⚠️ El código es `sin(clock·8)·0.12 + turn·0.45`. La semántica es la misma que en 2D (la cola contra-rota respecto al cuerpo): en 2D el cuerpo rota `+angulo`; en 3D el yaw es `−atan2(vx, v)`. **No se cambia.** | `src/entities/Player.js:222` |
| Físicas desacopladas del modelo | ✅ `Player.step()` no toca el modelo. | `src/entities/Player.js:80-193` |
| 22 tests (13 + 3 + 6) | ✅ 22/22 en verde. | `npm test` |
| Se corrigieron todas las menciones a "19 tests" | ❌ Quedan `games/3d-pro/README.md:68` y `games/3d-pro/VALIDATION.txt:9`. VALIDATION.txt está desfasado entero: le faltan los tests de coherencia y los tamaños de bundle son viejos. | `grep` |
| Controles documentados | ❌ CONTROLS.md y el README de PRO describen mal el mando: deadzone 0.15, R3 para diagnóstico, Back para reinicio. El código usa umbrales 0.28/0.35, Back (btn 8) para diagnóstico e Y (btn 3) para reinicio. El README de PRO dice que `Espacio` inicia desde el menú, pero `Espacio` es turbo. | `src/core/InputManager.js:40-50,63-71` |
| Modo Moderno "sin penalización de giro" | ❌ El 76 % se aplica con turbo en **ambos** modos. | `src/entities/Player.js:128` |
| Calidad adaptativa: "baja DPR y sombras bajo 47 FPS" | ⚠️ Bajo 47 FPS sostenidos 5 s solo baja el DPR. Las sombras se desactivan bajo 38 FPS. `docs/ARCHITECTURE.md:125` repite la versión inexacta. | `src/core/Engine.js:155-174` |
| Extra (no está en el informe) | ❌ El banner de slalom anuncia `+100×combo`, pero en Clásico se suman `150×combo`. Los resultados muestran "Récord Personal (CLASSIC)" en inglés. | `src/main.js:281`, `src/entities/Player.js:161-167`, `src/ui/MenuManager.js:128` |
| Build y `dist/` | ✅ El build funciona y los hashes de `dist/` coinciden con `src/`. | `vite build` en el scratchpad |

## Decisiones por defecto (confirmar antes de ejecutar)

- **D1. Turbo en Moderno:** la documentación se ajusta al código: con turbo activo, el giro baja al 76 % en ambos modos. No hay cambio de jugabilidad. *Alternativa:* que el código siga a la documentación (`Player.js:128` pasa a `this.turbo && this.mode === 'classic'`, con su test). Requiere decisión explícita.
- **D2. Cola de la nutria:** no se cambia, porque es semánticamente equivalente al 2D.
- **D3. VALIDATION.txt** pasa a ser una copia exacta de `docs/VALIDATION.md`, regenerada con datos reales.
- **D4. Alerta:** intensidad mínima de 0.35 al entrar en el radio para que se perciba. Incluye la fase `'caught'`. Sigue visible durante la protección tras una caída, aunque el latido se calle: la vista muestra más, nunca menos.
- **Tareas opcionales:** la 3 (paridad visual) está en el informe, pero apenas se percibe porque la nutria mide unos 20 px a la distancia de cámara. La 4 está fuera del informe. Las dos son independientes y se pueden omitir.

## Mapa de archivos

| Archivo | Responsabilidad | Tareas |
| :--- | :--- | :--- |
| `games/3d-pro/src/config.js` | Nueva constante `alertRange: 65` | 1 |
| `games/3d-pro/src/core/AudioManager.js` | El latido usa `C.alertRange` | 1 |
| `games/3d-pro/src/ui/HUD.js` | `yetiAlertLevel()` (pura y exportada), capa `#yetiAlert`, unidad oculta cuando el Yeti está burlado | 1, 2 |
| `games/3d-pro/index.html` | `<div id="yetiAlert">` e `<i id="yetiUnit">` | 1, 2 |
| `games/3d-pro/src/styles.css` | Estilos de la capa, pulso y `prefers-reduced-motion` | 1 |
| `games/3d-pro/src/ui/MenuManager.js` | `selectRadio()` (sincroniza `aria-checked`) y etiqueta CLÁSICO/MODERNO | 2, 4 |
| `games/3d-pro/src/entities/ProceduralModels.js` | Material `lente` `#bdefff` | 3 |
| `games/3d-pro/src/entities/Player.js` | `scarfPhase` continua y `lastGatePoints` | 3, 4 |
| `games/3d-pro/src/main.js` | El banner de slalom usa `lastGatePoints` | 4 |
| `games/3d-pro/tests/ui.test.js` (nuevo) | Alerta, HUD y menú con un DOM falso mínimo | 1, 2, 4 |
| `games/3d-pro/tests/entities.test.js` (nuevo) | Modelo de la nutria y puntos de slalom | 3, 4 |
| `README.md`, `index.html` (portal), `docs/*.md`, `games/3d-pro/README.md`, `games/3d-pro/VALIDATION.txt` | Conteos, controles y descripción de la alerta | 5 |

Los comandos `npm test` y `npm run build` se ejecutan desde `E:\Yeti` (workspaces) o desde `games/3d-pro`; el resultado es el mismo.

---

### Tarea 0: Línea base de Git (solo con el OK explícito del usuario)

`E:\Yeti` no es un repositorio Git. Sin línea base, los pasos de "commit" de las tareas siguientes no tienen efecto.

- [ ] **Paso 1: Comprobar la identidad de Git**

Ejecutar: `git config user.name; git config user.email`
Esperado: los dos tienen valor. Si alguno está vacío, **detente y pregunta al usuario** qué identidad usar.

- [ ] **Paso 2: Inicializar y crear el commit base**

```bash
cd E:/Yeti
git init
git add -A
git status --short
```

Revisar la salida: no deben aparecer `node_modules/`, `dist/` ni `.playwright-mcp/` (los ignora `.gitignore`).

```bash
git commit -m "chore: línea base del monorepo antes de la coherencia 3d-pro" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git checkout -b feat/3d-pro-coherencia
```

---

### Tarea 1: Alerta visual de proximidad visible (núcleo)

**Archivos:**

- Crear: `games/3d-pro/tests/ui.test.js`
- Modificar: `games/3d-pro/src/config.js:22`
- Modificar: `games/3d-pro/src/core/AudioManager.js:1,134-135`
- Modificar: `games/3d-pro/src/ui/HUD.js:1-24,66-75`
- Modificar: `games/3d-pro/index.html:12`
- Modificar: `games/3d-pro/src/styles.css` (añadir al final)

**Interfaces:**

- Consume: `CONFIG` de `src/config.js`; firma actual de `HUD.update(dt, player, yeti, engine, state, debug, seed, collisions, telemetry, skierAI, dda)`.
- Produce: `CONFIG.alertRange` (number, 65). `export function yetiAlertLevel(state: string, status: string, gap: number, range = CONFIG.alertRange): number` (0..1). Capa DOM `#yetiAlert` con la clase `on` mientras está activa. Helpers de test en `tests/ui.test.js`: `fakeElement()`, `fakeDom()`, `PLAYER`, `updateHud(hud, state, yeti)`. Las Tareas 2 y 4 los usan.

- [ ] **Paso 1: Escribir los tests que fallan**

Crear `games/3d-pro/tests/ui.test.js`:

```js
// tests/ui.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CONFIG as C } from '../src/config.js';
import { HUD, yetiAlertLevel } from '../src/ui/HUD.js';

// DOM mínimo para instanciar HUD/MenuManager en Node (sin navegador)
function fakeElement() {
  const classes = new Set();
  return {
    textContent: '',
    innerHTML: '',
    className: '',
    hidden: false,
    style: {},
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = String(value); },
    classList: {
      add: c => classes.add(c),
      remove: c => classes.delete(c),
      contains: c => classes.has(c),
      toggle: (c, force = !classes.has(c)) => {
        if (force) classes.add(c); else classes.delete(c);
        return force;
      }
    }
  };
}

function fakeDom() {
  const elements = new Map();
  globalThis.document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, fakeElement());
      return elements.get(id);
    }
  };
  return elements;
}

const PLAYER = { d: 100, speed: 10, score: 0, mode: 'classic', energy: 1 };
const updateHud = (hud, state, yeti) => hud.update(0.2, PLAYER, yeti, {}, state, false, 1, {}, null, null, null);

test('Alerta Yeti: apagada fuera de partida o sin persecución activa', () => {
  assert.equal(yetiAlertLevel('menu', 'caught', 0), 0);
  assert.equal(yetiAlertLevel('pause', 'chase', 10), 0);
  assert.equal(yetiAlertLevel('over', 'caught', 0), 0);
  assert.equal(yetiAlertLevel('playing', 'sleep', 10), 0);
  assert.equal(yetiAlertLevel('playing', 'gone', 10), 0);
});

test('Alerta Yeti: umbral de 65 m compartido con el latido y robusta ante gap inválido', () => {
  assert.equal(C.alertRange, 65);
  assert.equal(yetiAlertLevel('playing', 'chase', 65), 0);
  assert.ok(yetiAlertLevel('playing', 'chase', 64.9) >= 0.35);
  assert.equal(yetiAlertLevel('playing', 'chase', Number.NaN), 0);
});

test('Alerta Yeti: crece al acercarse y satura en 1', () => {
  assert.ok(yetiAlertLevel('playing', 'warning', 23) > yetiAlertLevel('playing', 'chase', 50));
  assert.equal(yetiAlertLevel('caught', 'caught', 0), 1);
  assert.equal(yetiAlertLevel('playing', 'chase', -5), 1);
});

test('HUD: la alerta vive en la capa #yetiAlert y se apaga al volver al menú', () => {
  const elements = fakeDom();
  const hud = new HUD();
  const yeti = { status: 'chase', d: 90, next: 500 };
  updateHud(hud, 'playing', yeti);
  const alert = elements.get('yetiAlert');
  assert.ok(Number(alert.style.opacity) > 0.35);
  assert.equal(alert.classList.contains('on'), true);
  updateHud(hud, 'menu', yeti);
  assert.equal(alert.style.opacity, '0');
  assert.equal(alert.classList.contains('on'), false);
  assert.equal(elements.has('viewport'), false);
});

test('Alerta Yeti: pulso lento (< 3 destellos/s) y sin animación con reduced-motion', () => {
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const pulse = css.match(/animation:yetiPulse ([\d.]+)s/);
  assert.ok(pulse && Number(pulse[1]) >= 0.5, 'medio ciclo del pulso >= 0.5 s');
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{#yetiAlert\.on::before\{animation:none\}\}/);
  assert.match(css, /#yetiAlert\{[^}]*pointer-events:none/);
});
```

- [ ] **Paso 2: Ejecutar y comprobar que falla**

Ejecutar: `cd E:/Yeti/games/3d-pro && npm test`
Esperado: FAIL en `tests/ui.test.js` con `SyntaxError: The requested module '../src/ui/HUD.js' does not provide an export named 'yetiAlertLevel'`. Los 22 tests anteriores siguen en verde.

- [ ] **Paso 3: Añadir la constante compartida**

En `games/3d-pro/src/config.js`, justo después de `nextYetiDistance: 600,` (línea 22):

```js
  nextYetiDistance: 600,
  alertRange: 65,           // radio de alerta del Yeti: latido de audio + viñeta visual
```

- [ ] **Paso 4: Hacer que el latido use la constante (sin cambiar su comportamiento)**

En `games/3d-pro/src/core/AudioManager.js`, línea 1:

```js
import * as THREE from 'three';
import { CONFIG as C } from '../config.js';
```

Líneas 134-135, reemplazar:

```js
      if (gap < 65) {
        const tension = Math.max(0, Math.min(1, (65 - gap) / 58));
```

por:

```js
      if (gap < C.alertRange) {
        const tension = Math.max(0, Math.min(1, (C.alertRange - gap) / 58));
```

- [ ] **Paso 5: Función pura y cableado del HUD**

En `games/3d-pro/src/ui/HUD.js`, después del bloque JSDoc del archivo (línea 4) y antes de `export class HUD`:

```js
import { CONFIG as C } from '../config.js';

/**
 * Intensidad (0..1) de la alerta visual de proximidad del Yeti.
 * Solo en partida, con el Yeti activo y a menos de C.alertRange metros (mismo umbral que el latido).
 */
export function yetiAlertLevel(state, status, gap, range = C.alertRange) {
  const live = state === 'playing' || state === 'caught';
  const hunting = status === 'warning' || status === 'chase' || status === 'caught';
  if (!live || !hunting || !(gap < range)) return 0;
  return Math.min(1, 0.35 + 0.65 * (1 - Math.max(0, gap) / range));
}
```

En el constructor, después de `this.aiBtn = document.getElementById('aiBtn');`:

```js
    this.alert = document.getElementById('yetiAlert');
    this.alertLevel = -1;
```

En `update()`, reemplazar este bloque (líneas 66-75):

```js
    const gap = Math.max(0, player.d - yeti.d);
    const viewport = document.getElementById('viewport');
    if (viewport) {
      if (active && gap < 60) {
        const a = Math.min(0.65, 0.2 + (60 - gap) / 70);
        viewport.style.boxShadow = `inset 0 0 55px rgba(239, 68, 68, ${a.toFixed(2)})`;
      } else {
        viewport.style.boxShadow = 'none';
      }
    }
```

por:

```js
    const level = Math.round(yetiAlertLevel(state, yeti.status, player.d - yeti.d) * 100) / 100;
    if (this.alert && level !== this.alertLevel) {
      this.alertLevel = level;
      this.alert.style.opacity = String(level);
      this.alert.classList.toggle('on', level > 0);
    }
```

- [ ] **Paso 6: Capa en el HTML**

En `games/3d-pro/index.html`, línea 12, reemplazar:

```html
<div id="viewport"></div>
```

por:

```html
<div id="viewport"></div><div id="yetiAlert" aria-hidden="true"></div>
```

- [ ] **Paso 7: Estilos de la capa**

Añadir al final de `games/3d-pro/src/styles.css`:

```css
#yetiAlert{position:fixed;inset:0;z-index:2;pointer-events:none;opacity:0;transition:opacity .25s linear}
#yetiAlert::before{content:"";position:absolute;inset:0;box-shadow:inset 0 0 90px 14px rgba(239,68,68,.85)}
#yetiAlert.on::before{animation:yetiPulse .9s ease-in-out infinite alternate}
@keyframes yetiPulse{from{opacity:.55}to{opacity:1}}
@media (prefers-reduced-motion:reduce){#yetiAlert.on::before{animation:none}}
```

La capa queda en `z-index` 2: encima del canvas (`#viewport`, sin `z-index`) y debajo del HUD (3), el banner y los botones táctiles (4) y los overlays (10). El pulso dura 0.9 s con `alternate`, lo que da unos 0.56 ciclos por segundo.

- [ ] **Paso 8: Ejecutar y comprobar que pasa**

Ejecutar: `cd E:/Yeti/games/3d-pro && npm test`
Esperado: `ℹ tests 27`, `ℹ pass 27`, `ℹ fail 0`.

Ejecutar: `grep -n "65" src/core/AudioManager.js`
Esperado: sin salida (el umbral ya solo vive en `config.js`).

- [ ] **Paso 9: Verificación en el navegador**

Ejecutar en segundo plano: `cd E:/Yeti/games/3d-pro && npm run dev` (abre en `http://localhost:5173/`). Con la herramienta de navegador que haya (Playwright MCP, Claude in Chrome o `npx playwright`):

1. Abrir `http://localhost:5173/`, pulsar `Enter` para empezar y `F2` para abrir el diagnóstico. Hacer clic en el botón **"Invocar Yeti"**.
2. En menos de 1 s, ejecutar `getComputedStyle(document.getElementById('yetiAlert')).opacity` → esperado ≥ `0.7`. Hacer una captura: los bordes rojos deben verse sobre la nieve.
3. Ejecutar `document.elementFromPoint(innerWidth - 40, innerHeight - 40).closest('button')` → esperado: el botón táctil de turbo, no `null`. La capa no roba toques.
4. Pulsar `Escape` (pausa) y esperar 0.5 s. `getComputedStyle(document.getElementById('yetiAlert')).opacity` → `"0"`.
5. Si la herramienta permite emular media (Playwright: `page.emulateMedia({ reducedMotion: 'reduce' })`): reanudar con `Escape` y, con la alerta activa, ejecutar `getComputedStyle(document.getElementById('yetiAlert'), '::before').animationName` → `"none"`.
6. Dejarse atrapar, pulsar **"Volver al menú"** y comprobar que la opacidad de `#yetiAlert` es `"0"`.

- [ ] **Paso 10: Commit**

```bash
cd E:/Yeti
git add games/3d-pro/src/config.js games/3d-pro/src/core/AudioManager.js games/3d-pro/src/ui/HUD.js games/3d-pro/index.html games/3d-pro/src/styles.css games/3d-pro/tests/ui.test.js
git commit -m "fix(3d-pro): alerta de proximidad visible con pulso accesible y umbral compartido de 65 m" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 2: Menú y HUD accesibles (núcleo)

**Archivos:**

- Modificar: `games/3d-pro/src/ui/MenuManager.js:6,27-40`
- Modificar: `games/3d-pro/src/ui/HUD.js` (constructor y la línea después de `yetiDistance`)
- Modificar: `games/3d-pro/index.html:56`
- Test: `games/3d-pro/tests/ui.test.js`

**Interfaces:**

- Consume: los helpers `fakeElement()`, `fakeDom()` y `updateHud()` de `tests/ui.test.js` (Tarea 1).
- Produce: `export function selectRadio(buttons: Array<{classList, setAttribute}>, selected): void` en `MenuManager.js`, y el elemento `#yetiUnit` en el HUD.

- [ ] **Paso 1: Escribir los tests que fallan**

En `games/3d-pro/tests/ui.test.js`, añadir este import debajo de los existentes:

```js
import { selectRadio } from '../src/ui/MenuManager.js';
```

Y al final del archivo:

```js
test('Menú: selectRadio sincroniza la clase selected y aria-checked', () => {
  const buttons = [fakeElement(), fakeElement(), fakeElement()];
  selectRadio(buttons, buttons[1]);
  assert.deepEqual(buttons.map(b => b.attributes['aria-checked']), ['false', 'true', 'false']);
  assert.deepEqual(buttons.map(b => b.classList.contains('selected')), [false, true, false]);
  selectRadio(buttons, buttons[2]);
  assert.deepEqual(buttons.map(b => b.attributes['aria-checked']), ['false', 'false', 'true']);
});

test('HUD: con el Yeti burlado se oculta la unidad "m" y vuelve con la cuenta atrás', () => {
  const elements = fakeDom();
  const hud = new HUD();
  updateHud(hud, 'playing', { status: 'gone', d: 40, next: 700 });
  assert.equal(elements.get('yetiLabel').textContent, '¡YETI BURLADO!');
  assert.equal(elements.get('yetiUnit').hidden, true);
  updateHud(hud, 'playing', { status: 'sleep', d: 0, next: 700 });
  assert.equal(elements.get('yetiLabel').textContent, 'EL YETI APARECE EN');
  assert.equal(elements.get('yetiUnit').hidden, false);
});
```

- [ ] **Paso 2: Ejecutar y comprobar que falla**

Ejecutar: `cd E:/Yeti/games/3d-pro && npm test`
Esperado: FAIL en `tests/ui.test.js` con `does not provide an export named 'selectRadio'`.

- [ ] **Paso 3: `selectRadio` en MenuManager**

En `games/3d-pro/src/ui/MenuManager.js`, antes de `export class MenuManager` (línea 6):

```js
/** Marca un botón de un radiogroup como seleccionado (clase visual + aria-checked). */
export function selectRadio(buttons, selected) {
  for (const o of buttons) {
    o.classList.toggle('selected', o === selected);
    o.setAttribute('aria-checked', String(o === selected));
  }
}

```

Reemplazar los dos bucles de las líneas 27-40:

```js
    for (const b of this.modeButtons) {
      b.onclick = () => {
        this.mode = b.dataset.mode;
        for (const o of this.modeButtons) o.classList.toggle('selected', o === b);
        this.sync();
      };
    }

    for (const b of this.distanceButtons) {
      b.onclick = () => {
        this.spawnAt = Number(b.dataset.distance);
        for (const o of this.distanceButtons) o.classList.toggle('selected', o === b);
      };
    }
```

por:

```js
    for (const b of this.modeButtons) {
      b.onclick = () => {
        this.mode = b.dataset.mode;
        selectRadio(this.modeButtons, b);
        this.sync();
      };
    }

    for (const b of this.distanceButtons) {
      b.onclick = () => {
        this.spawnAt = Number(b.dataset.distance);
        selectRadio(this.distanceButtons, b);
      };
    }
```

- [ ] **Paso 4: Unidad "m" ocultable**

En `games/3d-pro/index.html`, línea 56, reemplazar `<strong id="yetiDistance">500</strong><i>m</i>` por:

```html
<strong id="yetiDistance">500</strong><i id="yetiUnit">m</i>
```

En `games/3d-pro/src/ui/HUD.js`, en el constructor, después de `this.yetiDistance = document.getElementById('yetiDistance');`:

```js
    this.yetiUnit = document.getElementById('yetiUnit');
```

En `update()`, justo después de la línea que asigna `this.yetiDistance.textContent = ...`:

```js
    if (this.yetiUnit) this.yetiUnit.hidden = yeti.status === 'gone';
```

- [ ] **Paso 5: Ejecutar y comprobar que pasa**

Ejecutar: `cd E:/Yeti/games/3d-pro && npm test`
Esperado: `ℹ tests 29`, `ℹ pass 29`.

- [ ] **Paso 6: Verificación en el navegador**

Con `npm run dev` corriendo, abrir `http://localhost:5173/`, hacer clic en **MODERNO** y en **2.000 m** y ejecutar:

```js
[...document.querySelectorAll('#modes button, #distances button')].map(b => b.textContent.trim().slice(0, 8) + ':' + b.getAttribute('aria-checked'))
```

Esperado: `MODERNO:true` y `2.000 m:true`; los demás en `false`.

- [ ] **Paso 7: Commit**

```bash
cd E:/Yeti
git add games/3d-pro/src/ui/MenuManager.js games/3d-pro/src/ui/HUD.js games/3d-pro/index.html games/3d-pro/tests/ui.test.js
git commit -m "fix(3d-pro): aria-checked sincronizado en el menú y HUD sin unidad huérfana al burlar al Yeti" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 3: Paridad visual de la nutria — lente `#bdefff` y bufanda más rápida con turbo (opcional)

**Archivos:**

- Crear: `games/3d-pro/tests/entities.test.js`
- Modificar: `games/3d-pro/src/entities/ProceduralModels.js:3,18`
- Modificar: `games/3d-pro/src/entities/Player.js:34,117,225`

**Interfaces:**

- Consume: `createModelFactory()` (devuelve `{ materials, geometries, makeSkier, makeYeti, dispose }`), `new Player(factory, scene)` y `ACTION`.
- Produce: `factory.materials.lente` y `player.scarfPhase` (number, radianes acumulados). Helpers de test `SCENE`, `NO_HIT` y `run(player, held, steps)` en `tests/entities.test.js` (la Tarea 4 los reutiliza).

- [ ] **Paso 1: Escribir los tests que fallan**

Crear `games/3d-pro/tests/entities.test.js`:

```js
// tests/entities.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createModelFactory } from '../src/entities/ProceduralModels.js';
import { Player } from '../src/entities/Player.js';
import { ACTION } from '../src/core/InputManager.js';

const SCENE = { add() {} };
const NO_HIT = { hit: () => false };

function run(player, held, steps) {
  for (let i = 0; i < steps; i++) player.step(1 / 60, { held }, NO_HIT, null, null);
}

test('Nutria: gafas con lente de brillo #bdefff', () => {
  const factory = createModelFactory();
  const skier = factory.makeSkier();
  assert.equal(factory.materials.lente.color.getHexString(), 'bdefff');
  let lenses = 0;
  skier.root.traverse(o => { if (o.material === factory.materials.lente) lenses++; });
  assert.equal(lenses, 1);
  factory.dispose();
});

test('Nutria: la bufanda aletea más rápido con turbo y su fase es continua', () => {
  const calm = new Player(createModelFactory(), SCENE);
  const fast = new Player(createModelFactory(), SCENE);
  run(calm, () => false, 60);
  let prev = fast.scarfPhase;
  for (let i = 0; i < 60; i++) {
    run(fast, a => a === ACTION.TURBO, 1);
    assert.ok(fast.scarfPhase - prev <= 20 / 60 + 1e-9, 'sin saltos de fase');
    prev = fast.scarfPhase;
  }
  assert.ok(fast.scarfPhase > calm.scarfPhase * 1.5);
});
```

- [ ] **Paso 2: Ejecutar y comprobar que falla**

Ejecutar: `cd E:/Yeti/games/3d-pro && npm test`
Esperado: 2 FAIL en `tests/entities.test.js`. El de la lente falla con `TypeError: Cannot read properties of undefined (reading 'color')`. El de la bufanda falla con un `AssertionError`, porque `scarfPhase` es `undefined` y la comparación da `NaN`.

- [ ] **Paso 3: Material y lente**

En `games/3d-pro/src/entities/ProceduralModels.js`, línea 3, dentro del objeto `mat`, después de `gafas:new THREE.MeshStandardMaterial({color:'#243346',roughness:.4})`, añadir (con coma previa y mismo estilo compacto):

```js
,lente:new THREE.MeshStandardMaterial({color:'#bdefff',roughness:.12})
```

Línea 18, reemplazar:

```js
part(body,sharedGeo.box,mat.teal,0,1.62,-.27,.18,.045,.03);
```

por:

```js
part(body,sharedGeo.box,mat.lente,0,1.62,-.27,.18,.045,.03);
```

`dispose()` recorre todas las claves de `mat`, así que también libera `lente`.

- [ ] **Paso 4: Fase continua de la bufanda**

En `games/3d-pro/src/entities/Player.js`, dentro de `reset()`, después de `this.clock = 0;` (línea 34):

```js
    this.scarfPhase = 0;
```

En `step()`, justo después de la línea `this.turbo = input.held(ACTION.TURBO) && ...;` (línea 117):

```js
    // Cosmetic only: continuous scarf flutter phase, faster under turbo
    this.scarfPhase += dt * (this.turbo ? 20 : 12);
```

En `draw()`, línea 225, reemplazar:

```js
      m.scarf.rotation.x = Math.sin(this.clock * 12) * 0.1 * (this.turbo ? 1.8 : 1.0);
```

por:

```js
      m.scarf.rotation.x = Math.sin(this.scarfPhase) * 0.1 * (this.turbo ? 1.8 : 1.0);
```

- [ ] **Paso 5: Ejecutar y comprobar que pasa**

Ejecutar: `cd E:/Yeti/games/3d-pro && npm test`
Esperado: `ℹ pass` = total anterior + 2 (31 si ya se hicieron las Tareas 1 y 2), `ℹ fail 0`.

- [ ] **Paso 6: Commit**

```bash
cd E:/Yeti
git add games/3d-pro/src/entities/ProceduralModels.js games/3d-pro/src/entities/Player.js games/3d-pro/tests/entities.test.js
git commit -m "feat(3d-pro): lente #bdefff y aleteo de bufanda más rápido con turbo sin saltos de fase" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 4: Puntos de slalom y etiqueta de récord coherentes (opcional, fuera del informe)

**Archivos:**

- Modificar: `games/3d-pro/src/entities/Player.js:47,161-167`
- Modificar: `games/3d-pro/src/main.js:281`
- Modificar: `games/3d-pro/src/ui/MenuManager.js:128`
- Test: `games/3d-pro/tests/entities.test.js` y `games/3d-pro/tests/ui.test.js`

**Interfaces:**

- Consume: `fakeDom()` de `tests/ui.test.js` (Tarea 1); `SCENE` y `NO_HIT` de `tests/entities.test.js` (Tarea 3, o el encabezado de abajo).
- Produce: `player.lastGatePoints` (number), los puntos sumados en la última puerta cruzada.

- [ ] **Paso 1: Escribir los tests que fallan**

Si `games/3d-pro/tests/entities.test.js` no existe (porque se omitió la Tarea 3), crearlo con este encabezado:

```js
// tests/entities.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createModelFactory } from '../src/entities/ProceduralModels.js';
import { Player } from '../src/entities/Player.js';

const SCENE = { add() {} };
const NO_HIT = { hit: () => false };
```

Añadir al final de `games/3d-pro/tests/entities.test.js`:

```js
test('Slalom: lastGatePoints refleja los puntos sumados en cada modo', () => {
  for (const [mode, points] of [['classic', 150], ['modern', 100]]) {
    const player = new Player(createModelFactory(), SCENE);
    player.reset(mode);
    const world = { blocks: [{ flags: [{ active: true, cleared: false, d: 0.1, x: 0 }], ramps: [] }] };
    player.step(1 / 60, { held: () => false }, NO_HIT, world, null);
    assert.equal(player.lastGatePoints, points);
    assert.equal(player.score, points);
  }
});
```

En `games/3d-pro/tests/ui.test.js`, añadir debajo de los imports existentes (si la Tarea 2 ya importó `selectRadio`, unificar en un solo import: `import { MenuManager, selectRadio } from '../src/ui/MenuManager.js';`):

```js
import { MenuManager } from '../src/ui/MenuManager.js';
```

Y al final del archivo:

```js
test('Resultados: el récord se etiqueta en español (CLÁSICO / MODERNO)', () => {
  const elements = fakeDom();
  globalThis.document.querySelectorAll = () => [];
  const menu = new MenuManager({ record: () => 0 }, {});
  menu.results(500, 600, false);
  assert.match(elements.get('results').innerHTML, /Récord Personal \(CLÁSICO\)/);
  menu.mode = 'modern';
  menu.results(500, 600, false);
  assert.match(elements.get('results').innerHTML, /Récord Personal \(MODERNO\)/);
});
```

- [ ] **Paso 2: Ejecutar y comprobar que falla**

Ejecutar: `cd E:/Yeti/games/3d-pro && npm test`
Esperado: 2 FAIL. Slalom: `undefined !== 150`. Resultados: el regex no encuentra `CLÁSICO`, porque hoy el texto dice `CLASSIC`.

- [ ] **Paso 3: Implementación**

En `games/3d-pro/src/entities/Player.js`, dentro de `reset()`, después de `this.gatesCleared = 0;` (línea 47):

```js
    this.lastGatePoints = 0;
```

Líneas 161-167, reemplazar:

```js
                if (this.mode === 'classic') {
                  this.score += 150 * this.slalomCombo;
                  this.speed = Math.min(C.turboSpeed + 3, this.speed + 3.0);
                } else {
                  this.score += 100 * this.slalomCombo;
                  this.energy = clamp(this.energy + 0.25, 0, 1);
                }
```

por:

```js
                if (this.mode === 'classic') {
                  this.lastGatePoints = 150 * this.slalomCombo;
                  this.speed = Math.min(C.turboSpeed + 3, this.speed + 3.0);
                } else {
                  this.lastGatePoints = 100 * this.slalomCombo;
                  this.energy = clamp(this.energy + 0.25, 0, 1);
                }
                this.score += this.lastGatePoints;
```

En `games/3d-pro/src/main.js`, línea 281, reemplazar:

```js
      this.hud.announce('¡PUERTA SLALOM! +' + (100 * this.player.slalomCombo) + ' PTS · COMBO x' + this.player.slalomCombo, 1.2);
```

por:

```js
      this.hud.announce('¡PUERTA SLALOM! +' + this.player.lastGatePoints + ' PTS · COMBO x' + this.player.slalomCombo, 1.2);
```

En `games/3d-pro/src/ui/MenuManager.js`, línea 128, reemplazar `Récord Personal (${this.mode.toUpperCase()})` por:

```js
Récord Personal (${this.mode === 'classic' ? 'CLÁSICO' : 'MODERNO'})
```

- [ ] **Paso 4: Ejecutar y comprobar que pasa**

Ejecutar: `cd E:/Yeti/games/3d-pro && npm test`
Esperado: `ℹ pass` = total anterior + 2 (33 con todas las tareas), `ℹ fail 0`.

- [ ] **Paso 5: Commit**

```bash
cd E:/Yeti
git add games/3d-pro/src/entities/Player.js games/3d-pro/src/main.js games/3d-pro/src/ui/MenuManager.js games/3d-pro/tests/entities.test.js games/3d-pro/tests/ui.test.js
git commit -m "fix(3d-pro): el banner de slalom anuncia los puntos reales y el récord se etiqueta en español" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 5: Documentación coherente, certificado y build (núcleo, siempre la última)

**Archivos:**

- Modificar: `README.md:16,44,80,92`
- Modificar: `index.html:616,706` (portal; **no** tocar la línea 700, "22 módulos ES", que sigue siendo correcta: `src/` tiene 22 módulos JS)
- Modificar: `docs/DEPLOYMENT.md:9`, `docs/ARCHITECTURE.md:139-142`, `docs/VALIDATION.md`, `docs/CONTROLS.md:14,29-35,57` y una sección nueva al final
- Modificar: `games/3d-pro/README.md:6,52,68,92,104,122-124,186,216`
- Modificar: `docs/ARCHITECTURE.md:125` (umbrales reales de calidad adaptativa)
- Reemplazar: `games/3d-pro/VALIDATION.txt` (copia de `docs/VALIDATION.md`)

**Interfaces:**

- Consume: el número total de tests `N` y el conteo por archivo, sacados de la salida real de `npm test`.

Conteos esperados según las tareas ejecutadas: base 22. La Tarea 1 suma 5 (ui), la 2 suma 2 (ui), la 3 suma 2 (entities) y la 4 suma 2 (1 ui + 1 entities). Con todas, **N = 33**, con `ui.test.js` = 8 y `entities.test.js` = 3. Solo con el núcleo (1 y 2), **N = 29** y `ui.test.js` = 7.

- [ ] **Paso 1: Medir**

```bash
cd E:/Yeti
npm test 2>&1 | tail -12
npm run build 2>&1 | tail -8
```

Anotar `ℹ tests N`, la lista de nombres de test con sus tiempos y los tamaños del build (`index.html`, `index-*.css`, `index-*.js`, `three-*.js`, con y sin gzip). El build regenera `games/3d-pro/dist/`, que es lo que enlaza el portal.

- [ ] **Paso 2: Conteos de tests (texto exacto)**

Reemplazar `22` por `N` en estas cadenas exactas:

- `README.md:16`: `suite de 22 tests automatizados`
- `README.md:44`: `# Suite de 22 tests unitarios nativos verificados`
- `README.md:80`: `**✅ Suite de 22 tests nativos (Node.js)**`
- `README.md:92`: `# 2. Ejecutar la suite completa de 22 tests unitarios certificados`
- `index.html:616`: `22/22 Tests Passing` → `N/N Tests Passing`
- `index.html:706`: `22 tests nativos automatizados`
- `docs/DEPLOYMENT.md:9`: `suite de 22 tests unitarios certificados`
- `docs/ARCHITECTURE.md:139`: `# Suite de 22 tests unitarios (Node.js nativo)`
- `games/3d-pro/README.md:6`: `Tests-22%2F22%20Passing` → `Tests-N%2FN%20Passing`
- `games/3d-pro/README.md:68`: `# 3. Ejecutar suite completa de 19 pruebas automatizadas` → `N pruebas`
- `games/3d-pro/README.md:186`: `**22/22 especificaciones críticas**` → `**N/N especificaciones críticas**`, y `en tres suites` → `en cinco suites` (o `cuatro` si no existe `entities.test.js`)

- [ ] **Paso 3: Árboles de tests**

En `docs/ARCHITECTURE.md`, reemplazar las líneas 140-142 por (quitar la línea de `entities.test.js` si no existe y ajustar `├──`/`└──` y los conteos al Paso 1):

```text
│   ├── ai.test.js               # Tests de Behavior Trees, Lead Pursuit y DDA (13 tests)
│   ├── coherence.test.js        # Tests de coherencia de configuración, safeHalf 4.2 y corredor (3 tests)
│   ├── physics.test.js          # Tests de CCD, corredor seguro 10km, instanciación y Storage (6 tests)
│   ├── ui.test.js               # Tests de alerta de proximidad, HUD y menú accesible (8 tests)
│   └── entities.test.js         # Tests de la nutria (lente, bufanda) y puntos de slalom (3 tests)
```

En `games/3d-pro/README.md`, reemplazar las líneas 122-124:

```text
├── tests/
│   ├── physics.test.js          # Pruebas unitarias de CCD, corredor seguro y memoria
│   └── ai.test.js               # Pruebas de Behavior Trees, Lead Pursuit, MPC y DDA
```

por (con los mismos ajustes):

```text
├── tests/
│   ├── ai.test.js               # Pruebas de Behavior Trees, Lead Pursuit, MPC y DDA
│   ├── coherence.test.js        # Invariantes de configuración y navegabilidad del corredor
│   ├── physics.test.js          # Pruebas unitarias de CCD, corredor seguro y memoria
│   ├── ui.test.js               # Alerta de proximidad, HUD y menú accesible
│   └── entities.test.js         # Nutria (lente, bufanda) y puntos de slalom
```

Además, en `docs/ARCHITECTURE.md:125` reemplazar `reduce el *Device Pixel Ratio* y desactiva sombras directas dinámicas, evitando oscilaciones visuales erráticas.` por el comportamiento real de `Engine.measureFps()`:

```markdown
reduce el *Device Pixel Ratio* en 0.2 (mínimo 0.85); si además caen por debajo de 38 FPS, desactiva las sombras dinámicas y pasa a calidad ligera, evitando oscilaciones visuales erráticas.
```

- [ ] **Paso 4: Sección de tests del README de PRO**

En `games/3d-pro/README.md`, antes del `---` que cierra la sección de pruebas (línea 216), añadir (omitir las viñetas de las tareas no ejecutadas y ajustar los conteos):

```markdown
### 4. Interfaz y Accesibilidad ([`tests/ui.test.js`](tests/ui.test.js) — 8 tests)
- ✅ **Alerta apagada fuera de partida:** menú, pausa, fin de partida, Yeti dormido o burlado.
- ✅ **Umbral compartido de 65 m:** mismo radio que el latido de audio (`CONFIG.alertRange`); `gap` inválido no enciende la alerta.
- ✅ **Intensidad proporcional:** crece al acercarse y satura en 1.
- ✅ **Cableado del HUD:** la alerta vive en la capa `#yetiAlert` y no toca `#viewport`.
- ✅ **Seguridad visual:** pulso lento (< 3 destellos/s), sin animación con `prefers-reduced-motion` y sin bloquear toques.
- ✅ **Radiogroups accesibles:** `aria-checked` sincronizado con la selección.
- ✅ **Yeti burlado legible:** sin unidad "m" huérfana.
- ✅ **Resultados en español:** récord etiquetado `CLÁSICO` / `MODERNO`.

### 5. Entidades ([`tests/entities.test.js`](tests/entities.test.js) — 3 tests)
- ✅ **Lente de la nutria:** material `#bdefff` aplicado a las gafas.
- ✅ **Bufanda al viento:** aletea más rápido con turbo y sin saltos de fase.
- ✅ **Puntos de slalom:** `lastGatePoints` refleja `150 × combo` (Clásico) y `100 × combo` (Moderno).
```

- [ ] **Paso 5: Alerta y controles en el README de PRO**

Después de la línea 52 (el latido cardíaco), añadir:

```markdown
- **Alerta Visual de Proximidad (Accesibilidad):** capa `#yetiAlert` con viñeta roja que late a menos de 1 Hz desde 65 m (`CONFIG.alertRange`, el mismo umbral que el latido) e intensidad proporcional a la cercanía. Respeta `prefers-reduced-motion` y no bloquea los controles táctiles.
```

Línea 92, reemplazar:

```markdown
| **Back / Select / Share** | Reinicio rápido de la bajada. |
```

por:

```markdown
| **Botón Y / Triángulo** | Reinicio rápido de la bajada. |
| **Back / Select / Share** | Panel de diagnóstico 3D y telemetría XAI (equivale a `F2`). |
```

Línea 104, reemplazar ``| **Iniciar desde Menú** | `Enter` | `Espacio` |`` por:

```markdown
| **Iniciar desde Menú** | `Enter` | Botón A / Cruz del mando |
```

- [ ] **Paso 6: CONTROLS.md**

Línea 14, celda de comportamiento del turbo (según D1), reemplazar `<br>• **En Clásico:** Ilimitado con inercia a alta velocidad (`turnAuthority = 0.76`).` por:

```markdown
<br>• **En Clásico:** Ilimitado. En ambos modos, mientras el turbo está activo, la autoridad de giro baja al 76% (`turnAuthority = 0.76`).
```

Línea 29, reemplazar `Entrada analógica con zona muerta calibrada (`deadzone: 0.15`).` por:

```markdown
Eje convertido a digital: ±0.28 en horizontal (giro) y ±0.35 en vertical (arriba = freno, abajo = descenso).
```

Líneas 34-35, reemplazar:

```markdown
| **Back / Select / Share** | Reinicio Rápido | Regenera la montaña sin recargar la página. |
| **Stick Derecho (R3 Click)** | Diagnóstico 3D | Alterna telemetría XAI y gizmos. |
```

por:

```markdown
| **Botón Y / Triángulo** | Reinicio Rápido | Regenera la montaña sin recargar la página. |
| **Back / Select / Share** | Diagnóstico 3D | Alterna telemetría XAI y gizmos (equivale a `F2`). |
```

Línea 57, celda de Moderno, reemplazar `**Alta maniobrabilidad ágil**. El giro no sufre penalización severa, pero el turbo es un recurso escaso y táctico.` por:

```markdown
**Giro completo sin turbo**; con turbo activo también baja al 76%, pero el turbo es un recurso escaso y táctico.
```

Al final del archivo, añadir:

```markdown

### 4. Alerta Visual de Proximidad (Edición PRO)
Cuando el Yeti está a menos de **65 m**, los bordes de la pantalla laten en rojo con una intensidad proporcional a la cercanía. Es el mismo umbral que el latido sonoro, para que jugar sin audio no sea una desventaja. El pulso es lento (menos de 1 Hz), se desactiva con `prefers-reduced-motion` y la capa no bloquea los controles táctiles.
```

- [ ] **Paso 7: Certificado de validación**

En `docs/VALIDATION.md`:

- Línea 4: `Fecha de Certificación: <fecha de hoy, AAAA-MM-DD>`
- Línea 9: `Estado: N/N Tests PASSING (0 fallos, 0 omitidos, 0 cancelados)`
- Línea 10: la duración real del Paso 1
- Tras el bloque `[Físicas, …]`, añadir los bloques `[Interfaz y Accesibilidad - tests/ui.test.js]` y `[Entidades - tests/entities.test.js]` con los nombres y tiempos copiados literalmente de la salida del Paso 1
- Líneas 43-47: tamaños reales del build del Paso 1

Después:

```bash
cp docs/VALIDATION.md games/3d-pro/VALIDATION.txt
```

- [ ] **Paso 8: Comprobar que no quedan conteos viejos**

```bash
cd E:/Yeti
grep -rn -E "\b(19|22) (tests|pruebas)|(19|22)/(19|22)|22%2F22|tres suites" README.md index.html docs games/3d-pro/README.md games/3d-pro/VALIDATION.txt
```

Esperado: sin salida. Por eso el patrón no busca `22 módulos`.

- [ ] **Paso 9: Verificación final en el navegador (build de producción y portal)**

```bash
cd E:/Yeti
python -m http.server 8089
```

Abrir `http://localhost:8089/`, entrar a **3D PRO** (enlaza a `games/3d-pro/dist/index.html`) y repetir los puntos 1, 2 y 4 del Paso 9 de la Tarea 1: alerta visible tras "Invocar Yeti" y apagada en pausa. Comprobar también que el portal muestra `N/N Tests Passing`.

- [ ] **Paso 10: Commit**

```bash
cd E:/Yeti
git add README.md index.html docs games/3d-pro/README.md games/3d-pro/VALIDATION.txt
git commit -m "docs: conteos de tests, controles de mando y alerta de proximidad coherentes con el código" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Fuera de alcance (anotado para un plan aparte)

- **El mismo fallo de alerta invisible en las otras ediciones.** En 2D se aplica `inset` sobre el propio `<canvas>`, que pinta un fondo opaco con `fillRect` en cada frame; 2D sí conserva el banner de texto `#yeti-alert-banner`. En Standalone se aplica `inset` sobre `#viewport`, con umbral de 60 y sin pulso, igual que el PRO actual.
- **Tamaño de Standalone en la documentación.** Dice "~51 KB", pero son 53.357 bytes (unos 52,1 KiB).
- **Legibilidad de la nutria en juego.** A la distancia de cámara mide unos 20 px de alto; la cola y la bufanda apenas se distinguen. No se proponen cambios de cámara ni de escala.
