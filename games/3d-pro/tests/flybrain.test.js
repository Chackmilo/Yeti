import test from 'node:test';
import assert from 'node:assert/strict';
import { FlyBrainCompetitorAI } from '../src/ai/FlyBrainCompetitorAI.js';

test('FlyBrainCompetitorAI: inicialización en modo local SNN y valores por defecto', () => {
  const ai = new FlyBrainCompetitorAI();
  assert.equal(ai.connected, false);
  assert.equal(ai.telemetry.engine, 'LOCAL_LIF');
  assert.equal(ai.steer, 0);
  assert.equal(ai.jump, false);
  ai.dispose();
});

test('FlyBrainCompetitorAI: evasión contralateral ante amenaza a la izquierda (gira a la derecha)', () => {
  const ai = new FlyBrainCompetitorAI();
  const mockRival = { x: 0, d: 100 };
  const mockWorld = {
    blocks: [{
      start: 90,
      end: 150,
      items: [
        { active: true, x: -1.2, d: 108 } // Obstáculo cercano a la izquierda
      ],
      flags: []
    }]
  };

  ai.update(0.016, mockRival, null, mockWorld);
  assert.ok(ai.lastPerception.left_hazard > 0.5, 'Debe detectar peligro a la izquierda');
  assert.ok(ai.steer > 0.1, 'Debe inducir giro correctivo hacia la derecha');
  assert.ok(ai.telemetry.motorSpikesRight > 0, 'Debe emitir pulsos en neuronas motoras derechas (DNa02)');
  ai.dispose();
});

test('FlyBrainCompetitorAI: evasión contralateral ante amenaza a la derecha (gira a la izquierda)', () => {
  const ai = new FlyBrainCompetitorAI();
  const mockRival = { x: 0, d: 100 };
  const mockWorld = {
    blocks: [{
      start: 90,
      end: 150,
      items: [
        { active: true, x: 1.2, d: 108 } // Obstáculo cercano a la derecha
      ],
      flags: []
    }]
  };

  ai.update(0.016, mockRival, null, mockWorld);
  assert.ok(ai.lastPerception.right_hazard > 0.5, 'Debe detectar peligro a la derecha');
  assert.ok(ai.steer < -0.1, 'Debe inducir giro correctivo hacia la izquierda');
  assert.ok(ai.telemetry.motorSpikesLeft > 0, 'Debe emitir pulsos en neuronas motoras izquierdas (DNa01)');
  ai.dispose();
});

test('FlyBrainCompetitorAI: reflejo de escape y salto acrobático ante peligro frontal inminente', () => {
  const ai = new FlyBrainCompetitorAI();
  const mockRival = { x: 0, d: 100 };
  const mockWorld = {
    blocks: [{
      start: 90,
      end: 150,
      items: [
        { active: true, x: 0.1, d: 103 } // Obstáculo justo en frente (<3 m)
      ],
      flags: []
    }]
  };

  ai.update(0.016, mockRival, null, mockWorld);
  assert.ok(ai.lastPerception.center_hazard > 0.7, 'Peligro frontal inminente debe ser alto');
  assert.ok(ai.telemetry.giantFiberSpikes > 0, 'Debe disparar neuronas Giant Fiber (GF)');
  ai.dispose();
});
