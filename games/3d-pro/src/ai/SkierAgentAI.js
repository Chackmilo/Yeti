/**
 * @file SkierAgentAI.js
 * @description Autonomous Skier Agent (AI Autopilot & Co-Pilot).
 */

import { CONFIG as C, clamp } from '../config.js';
import { ACTION } from '../core/InputManager.js';

export const SkierAIMode = Object.freeze({
  OFF: 'OFF',
  AUTOPILOT: 'AUTOPILOT',
  CO_PILOT: 'CO_PILOT'
});

const CANDIDATES = [-1.0, -0.65, -0.3, 0.0, 0.3, 0.65, 1.0];
const HORIZONS = [0.25, 0.55, 0.95];

export class SkierAgentAI {
  constructor(options = {}) {
    this.mode = options.mode || SkierAIMode.OFF;
    this.virtualInput = new Uint8Array(5);
    this.plannedSteer = 0;
    this.bestScore = 0;
    this.imminentHazard = false;
    this.nearMissCooloff = 0;
    this.targetObject = null;
    this.obstaclesAhead = []; // Pre-allocated buffer
  }

  setMode(mode) {
    this.mode = mode;
    this.virtualInput.fill(0);
    this.plannedSteer = 0;
  }

  toggleMode() {
    if (this.mode === SkierAIMode.OFF) {
      this.mode = SkierAIMode.AUTOPILOT;
    } else if (this.mode === SkierAIMode.AUTOPILOT) {
      this.mode = SkierAIMode.CO_PILOT;
    } else {
      this.mode = SkierAIMode.OFF;
    }
    this.virtualInput.fill(0);
    return this.mode;
  }

  update(dt, player, yeti, world, humanInput, dda) {
    this.virtualInput.fill(0);
    this.nearMissCooloff = Math.max(0, this.nearMissCooloff - dt);

    if (this.mode === SkierAIMode.OFF) {
      this.imminentHazard = false;
      return;
    }

    const lookaheadD = 38;
    const obstaclesAhead = this.obstaclesAhead;
    obstaclesAhead.length = 0;
    let nextGate = null;
    let nextRamp = null;

    if (world && world.blocks) {
      const minD = player.d - 2;
      const maxD = player.d + lookaheadD;

      for (let b = 0; b < world.blocks.length; b++) {
        const block = world.blocks[b];
        if (block.end < minD || block.start > maxD) continue;

        for (let i = 0; i < block.items.length; i++) {
          const item = block.items[i];
          if (item.active && item.d >= minD && item.d <= maxD) {
            obstaclesAhead.push(item);
          }
        }

        if (block.flags) {
          for (let i = 0; i < block.flags.length; i++) {
            const f = block.flags[i];
            if (f.active && !f.cleared && f.d >= player.d && f.d <= maxD) {
              if (!nextGate || f.d < nextGate.d) nextGate = f;
            }
          }
        }

        if (block.ramps) {
          for (let i = 0; i < block.ramps.length; i++) {
            const r = block.ramps[i];
            if (r.active && !r.cleared && r.d >= player.d && r.d <= maxD) {
              if (!nextRamp || r.d < nextRamp.d) nextRamp = r;
            }
          }
        }
      }
    }

    this.targetObject = nextGate || nextRamp;

    let yetiThreat = false;
    let yetiGap = 999;
    if (yeti && (yeti.status === 'chase' || yeti.status === 'warning')) {
      yetiGap = Math.max(0, player.d - yeti.d);
      if (yetiGap < 32) yetiThreat = true;
    }

    let bestSteer = 0;
    let highestScore = -Infinity;
    let hazardDetected = false;

    for (let c = 0; c < CANDIDATES.length; c++) {
      const steer = CANDIDATES[c];
      let score = 0;

      for (let h = 0; h < HORIZONS.length; h++) {
        const horizon = HORIZONS[h];
        const simSpeed = yetiThreat ? C.turboSpeed : C.normalSpeed;
        const simVx = steer * (8 + simSpeed * 0.18);
        const simX = player.x + simVx * horizon;
        const simD = player.d + simSpeed * horizon;

        if (Math.abs(simX) > C.halfWidth - 1.8) {
          score -= 900;
        }

        for (let o = 0; o < obstaclesAhead.length; o++) {
          const obs = obstaclesAhead[o];
          const dx = simX - obs.x;
          const dd = simD - obs.d;
          const distSq = dx * dx + dd * dd;
          const clearance = obs.r + 0.95;

          if (distSq < clearance * clearance) {
            score -= 1500;
            hazardDetected = true;
          } else if (distSq < (clearance + 1.2) * (clearance + 1.2)) {
            score -= 120;
          }
        }

        if (nextGate && Math.abs(simD - nextGate.d) < 4) {
          const gateDist = Math.abs(simX - nextGate.x);
          if (gateDist < C.safeHalf - 0.5) {
            score += 450 * (1 + player.slalomCombo * 0.3);
          } else {
            score -= 150;
          }
        }

        if (nextRamp && Math.abs(simD - nextRamp.d) < 3.5) {
          const rampDist = Math.abs(simX - nextRamp.x);
          if (rampDist < 1.4) {
            score += 350;
          }
        }

        if (yetiThreat && yetiGap < 20) {
          const yetiDx = simX - yeti.x;
          score += clamp(Math.abs(yetiDx) * 20, 0, 300);
        }
      }

      score -= Math.abs(steer - player.turn) * 25;

      if (score > highestScore) {
        highestScore = score;
        bestSteer = steer;
      }
    }

    this.plannedSteer = bestSteer;
    this.bestScore = highestScore;
    this.imminentHazard = hazardDetected;

    if (this.mode === SkierAIMode.AUTOPILOT) {
      if (bestSteer < -0.2) this.virtualInput[ACTION.LEFT] = 1;
      if (bestSteer > 0.2) this.virtualInput[ACTION.RIGHT] = 1;

      if (yetiThreat && yetiGap < 28 && player.energy > 0.05) {
        this.virtualInput[ACTION.TURBO] = 1;
      } else if (player.energy > 0.75 && !hazardDetected) {
        this.virtualInput[ACTION.TURBO] = 1;
      }

      if (hazardDetected && highestScore < -800) {
        this.virtualInput[ACTION.BRAKE] = 1;
      }
    } else if (this.mode === SkierAIMode.CO_PILOT) {
      if (hazardDetected) {
        if (bestSteer < -0.2) this.virtualInput[ACTION.LEFT] = 1;
        if (bestSteer > 0.2) this.virtualInput[ACTION.RIGHT] = 1;
        if (highestScore < 0 || Math.abs(bestSteer) > 0.4) {
          this.virtualInput[ACTION.BRAKE] = 1;
        }
      }
    }

    if (dda && this.nearMissCooloff <= 0) {
      for (let o = 0; o < obstaclesAhead.length; o++) {
        const obs = obstaclesAhead[o];
        const dist = Math.hypot(player.x - obs.x, player.d - obs.d);
        if (dist > obs.r + 0.4 && dist < obs.r + 1.1) {
          dda.recordEvent('near_miss');
          this.nearMissCooloff = 0.8;
          break;
        }
      }
    }
  }

  isHeld(action, humanHeld) {
    if (this.mode === SkierAIMode.AUTOPILOT) {
      return this.virtualInput[action] > 0;
    }
    if (this.mode === SkierAIMode.CO_PILOT) {
      return humanHeld || this.virtualInput[action] > 0;
    }
    return humanHeld;
  }
}
