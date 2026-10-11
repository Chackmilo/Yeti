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
