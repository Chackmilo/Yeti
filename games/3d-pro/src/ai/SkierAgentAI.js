/**
 * @file SkierAgentAI.js
 * @description Autonomous Skier Agent (AI Autopilot & Co-Pilot).
 * Employs Model Predictive Control (MPC) heuristic trajectory rollouts, forward sensor sweeps,
 * slalom gate targeting, ramp acrobatics, and Yeti evasion to ski autonomously at superhuman levels.
 */

import { CONFIG as C, clamp, lerp } from '../config.js';
import { ACTION } from '../core/InputManager.js';

export const SkierAIMode = Object.freeze({
  OFF: 'OFF',
  AUTOPILOT: 'AUTOPILOT',
  CO_PILOT: 'CO_PILOT'
});

export class SkierAgentAI {
  /**
   * @param {Object} options Configuration
   */
  constructor(options = {}) {
    this.mode = options.mode || SkierAIMode.OFF;
    this.virtualInput = new Uint8Array(5);
    this.plannedSteer = 0; // -1 (hard left) to +1 (hard right)
    this.bestScore = 0;
    this.imminentHazard = false;
    this.nearMissCooloff = 0;
    this.targetObject = null;
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

  /**
   * Evaluates the mountain slope ahead and computes optimal control actions.
   * @param {number} dt Delta time
   * @param {Object} player Skier player entity
   * @param {Object} yeti Monster entity
   * @param {Object} world WorldGenerator
   * @param {Object} humanInput Human InputManager
   * @param {Object} dda DDAEngine
   */
  update(dt, player, yeti, world, humanInput, dda) {
    this.virtualInput.fill(0);
    this.nearMissCooloff = Math.max(0, this.nearMissCooloff - dt);

    if (this.mode === SkierAIMode.OFF) {
      this.imminentHazard = false;
      return;
    }

    // 1. Gather Sensor Perception
    const lookaheadD = 38;
    const obstaclesAhead = [];
    const gatesAhead = [];
    const rampsAhead = [];

    if (world && world.blocks) {
      const minD = player.d - 2;
      const maxD = player.d + lookaheadD;

      for (let b = 0; b < world.blocks.length; b++) {
        const block = world.blocks[b];
        if (block.end < minD || block.start > maxD) continue;

        // Obstacles
        for (let i = 0; i < block.items.length; i++) {
          const item = block.items[i];
          if (item.active && item.d >= minD && item.d <= maxD) {
            obstaclesAhead.push(item);
          }
        }

        // Slalom Flags
        if (block.flags) {
          for (let i = 0; i < block.flags.length; i++) {
            const f = block.flags[i];
            if (f.active && !f.cleared && f.d >= player.d && f.d <= maxD) {
              gatesAhead.push(f);
            }
          }
        }

        // Ramps
        if (block.ramps) {
          for (let i = 0; i < block.ramps.length; i++) {
            const r = block.ramps[i];
            if (r.active && !r.cleared && r.d >= player.d && r.d <= maxD) {
              rampsAhead.push(r);
            }
          }
        }
      }
    }

    // Sort upcoming targets by distance
    gatesAhead.sort((a, b) => a.d - b.d);
    rampsAhead.sort((a, b) => a.d - b.d);
    const nextGate = gatesAhead[0] || null;
    const nextRamp = rampsAhead[0] || null;
    this.targetObject = nextGate || nextRamp;

    // Check Yeti threat level
    let yetiThreat = false;
    let yetiGap = 999;
    if (yeti && (yeti.status === 'chase' || yeti.status === 'warning')) {
      yetiGap = Math.max(0, player.d - yeti.d);
      if (yetiGap < 32) yetiThreat = true;
    }

    // 2. Trajectory Rollout Evaluation (Model Predictive Heuristic)
    // Candidate steer values: [-1.0, -0.65, -0.3, 0.0, 0.3, 0.65, 1.0]
    const candidates = [-1.0, -0.65, -0.3, 0.0, 0.3, 0.65, 1.0];
    let bestSteer = 0;
    let highestScore = -Infinity;
    let hazardDetected = false;

    for (let c = 0; c < candidates.length; c++) {
      const steer = candidates[c];
      let score = 0;

      // Simulate trajectory over multiple time horizons
      const horizons = [0.25, 0.55, 0.95];
      let collides = false;

      for (let h = 0; h < horizons.length; h++) {
        const horizon = horizons[h];
        // Predicted position along candidate trajectory
        const simSpeed = yetiThreat ? C.turboSpeed : C.normalSpeed;
        const simVx = steer * (8 + simSpeed * 0.18);
        const simX = player.x + simVx * horizon;
        const simD = player.d + simSpeed * horizon;

        // Boundary penalty
        if (Math.abs(simX) > C.halfWidth - 1.8) {
          score -= 900;
          collides = true;
        }

        // Obstacle collision & clearance check
        for (let o = 0; o < obstaclesAhead.length; o++) {
          const obs = obstaclesAhead[o];
          const dx = simX - obs.x;
          const dd = simD - obs.d;
          const distSq = dx * dx + dd * dd;
          const clearance = obs.r + 0.95;

          if (distSq < clearance * clearance) {
            score -= 1500;
            collides = true;
            hazardDetected = true;
          } else if (distSq < (clearance + 1.2) * (clearance + 1.2)) {
            // Near-miss safety buffer
            score -= 120;
          }
        }

        // Slalom gate alignment incentive
        if (nextGate && Math.abs(simD - nextGate.d) < 4) {
          const gateDist = Math.abs(simX - nextGate.x);
          if (gateDist < C.safeHalf - 0.5) {
            score += 450 * (1 + player.slalomCombo * 0.3);
          } else {
            score -= 150;
          }
        }

        // Ramp jump alignment incentive
        if (nextRamp && Math.abs(simD - nextRamp.d) < 3.5) {
          const rampDist = Math.abs(simX - nextRamp.x);
          if (rampDist < 1.4) {
            score += 350;
          }
        }

        // Yeti evasion lateral pull
        if (yetiThreat && yetiGap < 20) {
          const yetiDx = simX - yeti.x;
          // Reward steering away from Yeti's lateral vector
          score += clamp(Math.abs(yetiDx) * 20, 0, 300);
        }
      }

      // Smoothness: penalize large steer reversals from current turn
      score -= Math.abs(steer - player.turn) * 25;

      if (score > highestScore) {
        highestScore = score;
        bestSteer = steer;
      }
    }

    this.plannedSteer = bestSteer;
    this.bestScore = highestScore;
    this.imminentHazard = hazardDetected;

    // 3. Command Synthesis
    if (this.mode === SkierAIMode.AUTOPILOT) {
      // Direct autonomous control
      if (bestSteer < -0.2) this.virtualInput[ACTION.LEFT] = 1;
      if (bestSteer > 0.2) this.virtualInput[ACTION.RIGHT] = 1;

      // Turbo decision
      if (yetiThreat && yetiGap < 28 && player.energy > 0.05) {
        this.virtualInput[ACTION.TURBO] = 1;
      } else if (player.energy > 0.75 && !hazardDetected) {
        // Opportunistic burst
        this.virtualInput[ACTION.TURBO] = 1;
      }

      // Brake only in emergencies (trapped by obstacles)
      if (hazardDetected && highestScore < -800) {
        this.virtualInput[ACTION.BRAKE] = 1;
      }
    } else if (this.mode === SkierAIMode.CO_PILOT) {
      // Co-pilot assist: human controls, but intervene if imminent crash
      if (hazardDetected) {
        if (bestSteer < -0.2) this.virtualInput[ACTION.LEFT] = 1;
        if (bestSteer > 0.2) this.virtualInput[ACTION.RIGHT] = 1;
        if (highestScore < 0 || Math.abs(bestSteer) > 0.4) {
          this.virtualInput[ACTION.BRAKE] = 1;
        }
      }
    }

    // Check near-misses for DDA telemetry
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

  /**
   * Blends virtual AI actions with human inputs.
   * @param {number} action Action code from ACTION enum
   * @param {boolean} humanHeld Whether human input held the action
   * @returns {boolean} Final blended boolean
   */
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
