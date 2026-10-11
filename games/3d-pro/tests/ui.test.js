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
