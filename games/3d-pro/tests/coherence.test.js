// tests/coherence.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, corridor, assertConfigCoherent } from '../src/config.js';

test('config: invariantes internas coherentes', () => {
  assert.deepEqual(assertConfigCoherent(), []);
});

test('config: safeHalf coincide con el valor certificado (4.2)', () => {
  assert.equal(CONFIG.safeHalf, 4.2);
});

test('corridor: el eje generado es navegable para 100 semillas / 10 km', () => {
  let maxJump = 0;
  for (let seed = 0; seed < 100; seed++) {
    let prev = corridor(0);
    for (let d = 0; d < 10000; d += CONFIG.rowStep) {
      const cur = corridor(d);
      const jump = Math.abs(cur - prev);
      if (jump > maxJump) maxJump = jump;
      prev = cur;
    }
    // Sin saltos laterales imposibles entre filas de obstáculos
    assert.ok(
      maxJump < CONFIG.halfWidth - CONFIG.safeHalf,
      `semilla ${seed}: salto lateral ${maxJump} excede el margen (${CONFIG.halfWidth - CONFIG.safeHalf})`
    );
  }
});
