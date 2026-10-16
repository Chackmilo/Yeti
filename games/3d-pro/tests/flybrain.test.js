import test from 'node:test';
import assert from 'node:assert/strict';
import { FlyBrainCompetitorAI } from '../src/ai/FlyBrainCompetitorAI.js';
import { FlyCompetitor } from '../src/entities/FlyCompetitor.js';

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

test('FlyCompetitor: Floating Origin calcula posición Z finita, detecta colisiones CCD y puntúa puertas de slalom', () => {
  const scene = { add() {}, remove() {} };
  const rival = new FlyCompetitor(scene);
  rival.setActive(true);
  rival.reset(0);

  const mockAI = { jump: false, isHeld: () => false };
  const mockWorld = {
    blocks: [{
      start: -10,
      end: 50,
      flags: [{ active: true, rivalCleared: false, d: 0.1, x: 0 }]
    }]
  };
  let hitChecked = false;
  const mockCollisions = {
    hit() { hitChecked = true; return true; }
  };

  rival.step(1 / 60, mockAI, mockCollisions, mockWorld);
  assert.equal(hitChecked, true, 'Debe usar collisions.hit() para Swept CCD');
  assert.ok(rival.crash > 0, 'Debe activar caída al chocar con un obstáculo');
  assert.equal(rival.gatesCleared, 1, 'Debe cruzar y puntuar la puerta de slalom usando C.safeHalf');

  // Verificar Floating Origin en draw(player)
  rival.draw({ d: 25, x: 0 });
  assert.equal(Number.isFinite(rival.model.root.position.z), true, 'Posición Z nunca debe ser NaN');
  assert.equal(Number.isFinite(rival.model.root.position.y), true, 'Posición Y nunca debe ser NaN');

  rival.dispose();
});

test('FlyBrainCompetitorAI: detecta al Yeti cuando yeti.status es chase o warning', () => {
  const ai = new FlyBrainCompetitorAI();
  const mockRival = { x: 0, d: 100 };
  const realYetiState = { status: 'chase', x: 0, d: 90 }; // A 10m de distancia

  ai.update(1 / 60, mockRival, realYetiState, { blocks: [] });
  assert.ok(ai.lastPerception.yeti_proximity > 0.7, 'Debe percibir la cercanía del Yeti mediante yeti.status');
  ai.dispose();
});
