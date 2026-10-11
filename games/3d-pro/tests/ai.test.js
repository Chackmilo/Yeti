/**
 * @file ai.test.js
 * @description Senior AI Systems Test Suite: Behavior Trees, Predictive Interception,
 * Sensory Whisker Radar, Skier Autopilot MPC heuristics, and DDA Flow Engine.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { Selector, Sequence, Condition, Action, Inverter, NodeStatus } from '../src/ai/BehaviorTree.js';
import { YetiAI } from '../src/ai/YetiAI.js';
import { SkierAgentAI, SkierAIMode } from '../src/ai/SkierAgentAI.js';
import { DDAEngine, FlowState } from '../src/ai/DDAEngine.js';
import { AITelemetry } from '../src/ai/AITelemetry.js';
import { WorldGenerator } from '../src/world/WorldGenerator.js';
import { ACTION } from '../src/core/InputManager.js';
import { CONFIG as C } from '../src/config.js';

// -----------------------------------------------------------------------------
// 1. BEHAVIOR TREE FRAMEWORK TESTS
// -----------------------------------------------------------------------------

test('BT Selector: ejecuta hasta encontrar éxito o running', () => {
  let action1Count = 0;
  let action2Count = 0;

  const tree = new Selector('Test_Selector', [
    new Action('Act1', () => { action1Count++; return NodeStatus.FAILURE; }),
    new Action('Act2', () => { action2Count++; return NodeStatus.SUCCESS; }),
    new Action('Act3', () => { assert.fail('Act3 should not run'); })
  ]);

  const status = tree.tick({});
  assert.equal(status, NodeStatus.SUCCESS);
  assert.equal(action1Count, 1);
  assert.equal(action2Count, 1);
});

test('BT Sequence: ejecuta hasta encontrar fallo o running', () => {
  let action1Count = 0;
  let action2Count = 0;

  const tree = new Sequence('Test_Sequence', [
    new Action('Act1', () => { action1Count++; return NodeStatus.SUCCESS; }),
    new Action('Act2', () => { action2Count++; return NodeStatus.FAILURE; }),
    new Action('Act3', () => { assert.fail('Act3 should not run'); })
  ]);

  const status = tree.tick({});
  assert.equal(status, NodeStatus.FAILURE);
  assert.equal(action1Count, 1);
  assert.equal(action2Count, 1);
});

test('BT Inverter: invierte SUCCESS a FAILURE y viceversa', () => {
  const inv1 = new Inverter('Inv1', new Condition('Cond1', () => true));
  assert.equal(inv1.tick({}), NodeStatus.FAILURE);

  const inv2 = new Inverter('Inv2', new Condition('Cond2', () => false));
  assert.equal(inv2.tick({}), NodeStatus.SUCCESS);
});

// -----------------------------------------------------------------------------
// 2. YETI AI PREDICTIVE INTERCEPTION & WHISKER PERCEPTION
// -----------------------------------------------------------------------------

test('YetiAI: cálculo de interceptación predictiva con ventaja de velocidad', () => {
  const ai = new YetiAI();
  const player = { x: 5, d: 20, vx: 4, speed: 20, slalomCombo: 0 };

  ai.calculateLeadTarget(0, 0, player, 1.0);

  // Target X must lead the player in the direction of vx (x=5 + vx * t > 5)
  assert.ok(ai.leadTarget.x > 5, `Expected lead target X (${ai.leadTarget.x}) to lead player X (5)`);
  assert.ok(ai.leadTarget.d > 20, `Expected lead target D (${ai.leadTarget.d}) to lead player D (20)`);
  assert.ok(Math.abs(ai.leadTarget.x) <= C.halfWidth, 'Lead target X must remain within mountain boundary');
});

test('YetiAI: anticipación de slalom corta el contra-giro hacia el centro', () => {
  const ai = new YetiAI();
  const player = { x: 8, d: 50, vx: 5, speed: 20, slalomCombo: 3 };

  // First tick: positive vx
  ai.calculateLeadTarget(0, 30, player, 1.0);
  // Second tick: sudden reversal to negative vx (slalom weave)
  player.vx = -5;
  ai.calculateLeadTarget(0, 30, player, 1.0);

  assert.equal(ai.playerIsSlaloming, true);
});

test('YetiAI: radar de bigotes sensoriales detecta obstáculo y genera fuerza de repulsión', () => {
  const ai = new YetiAI();
  const world = new WorldGenerator();
  world.reset(42);

  // Place a deliberate tree right in front of Yeti (d=10, x=0)
  for (const b of world.blocks) {
    for (const item of b.items) item.active = false;
  }
  world.blocks[0].start = -20;
  world.blocks[0].end = 50;
  const tree = world.blocks[0].items[0];
  world.assign(tree, 'tree', 0, 10, 1.0);

  // Scan from x=0, d=0 facing forward
  ai.scanPerceptionWhiskers(0, 0, C.yetiSpeed, world);

  // Center whisker (index 2) must detect the tree
  assert.equal(ai.whiskerHits[2], true, 'Center whisker must hit obstacle');
  // Avoidance force must have a non-zero magnitude
  assert.ok(Math.hypot(ai.avoidanceForce.x, ai.avoidanceForce.d) > 0, 'Avoidance vector must be generated');
});

// -----------------------------------------------------------------------------
// 3. SKIER AGENT AI (AUTOPILOT / CO-PILOT MPC)
// -----------------------------------------------------------------------------

test('SkierAgentAI: cicla modos entre OFF, AUTOPILOT y CO_PILOT', () => {
  const agent = new SkierAgentAI();
  assert.equal(agent.mode, SkierAIMode.OFF);

  assert.equal(agent.toggleMode(), SkierAIMode.AUTOPILOT);
  assert.equal(agent.toggleMode(), SkierAIMode.CO_PILOT);
  assert.equal(agent.toggleMode(), SkierAIMode.OFF);
});

test('SkierAgentAI Autopilot: esquiva obstáculo inminente sin intervención humana', () => {
  const agent = new SkierAgentAI({ mode: SkierAIMode.AUTOPILOT });
  const player = { x: 0, d: 100, speed: 20, turn: 0, slalomCombo: 0, energy: 1 };
  const world = new WorldGenerator();
  world.reset(1);

  // Clean all items and place a block directly ahead at d=112, x=0
  for (const b of world.blocks) {
    for (const item of b.items) item.active = false;
  }
  world.blocks[0].start = 80;
  world.blocks[0].end = 150;
  const tree = world.blocks[0].items[0];
  world.assign(tree, 'tree', 0, 112, 1.2);

  const humanInput = { held: () => false };
  agent.update(1 / 60, player, null, world, humanInput, null);

  // Autopilot must steer Left or Right to avoid the obstacle
  assert.ok(
    agent.isHeld(ACTION.LEFT, false) || agent.isHeld(ACTION.RIGHT, false),
    'Autopilot must command an evasive steer when obstacle is ahead'
  );
  assert.notEqual(agent.plannedSteer, 0, 'Planned steer must be non-zero');
});

test('SkierAgentAI Co-Pilot: interviene con freno/giro en colisión crítica', () => {
  const agent = new SkierAgentAI({ mode: SkierAIMode.CO_PILOT });
  const player = { x: 0, d: 50, speed: 20, turn: 0, slalomCombo: 0, energy: 1 };
  const world = new WorldGenerator();
  world.reset(2);

  // Tree right on the skier trajectory at 55m
  for (const b of world.blocks) {
    for (const item of b.items) item.active = false;
  }
  world.blocks[0].start = 40;
  world.blocks[0].end = 100;
  const tree = world.blocks[0].items[0];
  world.assign(tree, 'tree', 0, 55, 1.0);

  const humanInput = { held: () => false }; // Human does nothing
  agent.update(1 / 60, player, null, world, humanInput, null);

  // Co-Pilot must assist by activating emergency brake
  assert.equal(agent.imminentHazard, true);
  assert.equal(agent.isHeld(ACTION.BRAKE, false), true);
});

// -----------------------------------------------------------------------------
// 4. DYNAMIC DIFFICULTY ADJUSTMENT (DDA) FLOW ENGINE
// -----------------------------------------------------------------------------

test('DDAEngine: estado inicial en BALANCE con modulación unitaria', () => {
  const dda = new DDAEngine();
  assert.equal(dda.state, FlowState.BALANCE);
  assert.equal(dda.yetiSpeedMod, 1.0);
  assert.equal(dda.yetiForesightMod, 1.0);
});

test('DDAEngine: conmuta a RELIEF cuando el jugador se accidenta repetidamente', () => {
  const dda = new DDAEngine();
  const player = { speed: 8, slalomCombo: 0, d: 100 };
  const yeti = { status: 'chase', d: 88 }; // Yeti very close (gap 12m)
  const telemetry = new AITelemetry();

  // Simulate multiple crashes and high Yeti pressure
  for (let i = 0; i < 5; i++) {
    dda.recordEvent('crash');
  }

  for (let step = 0; step < 60; step++) {
    dda.step(0.1, player, yeti, telemetry);
  }

  assert.equal(dda.state, FlowState.RELIEF);
  assert.ok(dda.yetiSpeedMod < 1.0, `Expected Yeti speed mod (${dda.yetiSpeedMod}) to be < 1.0 in RELIEF`);
  assert.ok(dda.energyRegenMod > 1.0, `Expected energy regen mod (${dda.energyRegenMod}) to be > 1.0 in RELIEF`);
});

test('DDAEngine: conmuta a SURGE cuando el jugador domina con saltos y combos', () => {
  const dda = new DDAEngine();
  const player = { speed: 32, slalomCombo: 8, d: 500 };
  const yeti = { status: 'chase', d: 430 }; // Yeti far behind (gap 70m)
  const telemetry = new AITelemetry();

  // Record flawless combos and jumps
  for (let i = 0; i < 6; i++) {
    dda.recordEvent('gate_clear');
    dda.recordEvent('jump');
    dda.recordEvent('landing');
  }

  for (let step = 0; step < 60; step++) {
    dda.step(0.1, player, yeti, telemetry);
  }

  assert.equal(dda.state, FlowState.SURGE);
  assert.ok(dda.yetiSpeedMod > 1.0, `Expected Yeti speed mod (${dda.yetiSpeedMod}) to be > 1.0 in SURGE`);
  assert.ok(dda.yetiForesightMod > 1.0, `Expected Yeti foresight mod (${dda.yetiForesightMod}) to be > 1.0 in SURGE`);
});

// -----------------------------------------------------------------------------
// 5. AI TELEMETRY & XAI EXPLAINABILITY
// -----------------------------------------------------------------------------

test('AITelemetry: genera resumen formateado XAI legible sin excepciones', () => {
  const telemetry = new AITelemetry();
  telemetry.recordBTNode('Pounce_Sequence', NodeStatus.SUCCESS);
  telemetry.recordYetiDecision({
    behavior: 'PREDICTIVE_CHASE',
    target: { x: 4.2, d: 150.0 },
    avoidance: { x: -1.5, d: 0.2 },
    whiskers: [false, true, false, false, false],
    pounceCooldown: 2.5,
    pounceActive: false
  });
  telemetry.recordSkierAgent({
    mode: 'AUTOPILOT',
    plannedAngle: 0.35,
    utilityScore: 820,
    imminentHazard: false,
    target: null
  });
  telemetry.recordDDA({
    flowIndex: 0.15,
    playerSkill: 0.82,
    stateName: 'BALANCE',
    speedMod: 1.0
  });

  const summary = telemetry.getFormattedSummary();
  assert.ok(summary.includes('[AI YETI]'));
  assert.ok(summary.includes('[AI SKIER]'));
  assert.ok(summary.includes('[DDA FLOW]'));
  assert.ok(summary.includes('AUTOPILOT'));
});
