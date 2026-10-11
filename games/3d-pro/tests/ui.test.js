// tests/ui.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CONFIG as C } from '../src/config.js';
import { HUD, yetiAlertLevel } from '../src/ui/HUD.js';
import { MenuManager, selectRadio, SUITE_ASSETS } from '../src/ui/MenuManager.js';

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

test('Menú: avatar desde assets/ de la suite y sin prólogo empaquetado en 3D PRO', () => {
  const elements = fakeDom();
  globalThis.document.querySelectorAll = () => [];
  new MenuManager({ record: () => 0 }, {});
  assert.equal(SUITE_ASSETS, '../../../assets/');
  assert.equal(elements.get('menuAvatar').src, '../../../assets/otter_3d_coffee.jpg');
  assert.equal(elements.has('prologueModal'), false);
  assert.match(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), /id="menuAvatar"/);
});
