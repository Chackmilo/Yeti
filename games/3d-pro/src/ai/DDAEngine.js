/**
 * @file DDAEngine.js
 * @description Dynamic Difficulty Adjustment (DDA) Engine powered by Flow Theory (Csikszentmihalyi).
 * Analyzes real-time player telemetry, estimates skill & flow states, and dynamically modulates
 * game parameters to keep the player in the optimal psychological flow channel.
 */

import { clamp, lerp } from '../config.js';

export const FlowState = Object.freeze({
  RELIEF: 'RELIEF',     // Player is overwhelmed (crashes, low speed, high Yeti pressure) -> Ease off
  BALANCE: 'BALANCE',   // Optimal flow state (high engagement, moderate challenge) -> Standard
  SURGE: 'SURGE'        // Player is dominating (flawless combos, outrunning Yeti) -> Heighten challenge
});

export class DDAEngine {
  /**
   * @param {Object} options Configuration parameters.
   */
  constructor(options = {}) {
    this.windowDuration = options.windowDuration || 10.0; // 10-second rolling analysis window
    this.reset();
  }

  reset() {
    this.playerSkill = 0.5; // Baseline normalized skill [0, 1]
    this.flowIndex = 0.0;   // [-1 = Frustration, 0 = Flow, +1 = Boredom/Dominance]
    this.state = FlowState.BALANCE;

    // Rolling metrics
    this.eventBuffer = []; // { time, type, value }
    this.lastDistance = 0;
    this.distanceTraveledInWindow = 0;
    this.crashesInWindow = 0;
    this.nearMissesInWindow = 0;
    this.gatesAttemptedInWindow = 0;
    this.gatesClearedInWindow = 0;
    this.jumpsHitInWindow = 0;
    this.yetiProximityTime = 0;

    // Modulators
    this.yetiSpeedMod = 1.0;
    this.yetiForesightMod = 1.0;
    this.energyRegenMod = 1.0;
    this.pounceCooldownMod = 1.0;
  }

  /**
   * Records a discrete gameplay event for telemetry analysis.
   * @param {string} type Event type ('crash', 'gate_clear', 'gate_miss', 'jump', 'near_miss')
   * @param {number} value Optional numeric payload
   */
  recordEvent(type, value = 1) {
    this.eventBuffer.push({
      time: performance.now() / 1000,
      type,
      value
    });
  }

  /**
   * Step the DDA engine every tick.
   * @param {number} dt Delta time in seconds.
   * @param {Object} player Current player entity state.
   * @param {Object} yeti Current yeti entity state.
   * @param {Object} telemetry Telemetry reporter.
   */
  step(dt, player, yeti, telemetry) {
    const now = performance.now() / 1000;
    const windowStart = now - this.windowDuration;

    // Prune events outside rolling window
    while (this.eventBuffer.length > 0 && this.eventBuffer[0].time < windowStart) {
      this.eventBuffer.shift();
    }

    // Aggregate window metrics
    let crashes = 0;
    let nearMisses = 0;
    let gatesCleared = 0;
    let gatesAttempted = 0;
    let jumps = 0;

    for (let i = 0; i < this.eventBuffer.length; i++) {
      const e = this.eventBuffer[i];
      if (e.type === 'crash') crashes++;
      else if (e.type === 'near_miss') nearMisses++;
      else if (e.type === 'gate_clear') { gatesCleared++; gatesAttempted++; }
      else if (e.type === 'gate_miss') { gatesAttempted++; }
      else if (e.type === 'jump') jumps++;
    }

    this.crashesInWindow = crashes;
    this.nearMissesInWindow = nearMisses;
    this.gatesClearedInWindow = gatesCleared;
    this.gatesAttemptedInWindow = gatesAttempted;
    this.jumpsHitInWindow = jumps;

    // Yeti proximity pressure
    if (yeti && (yeti.status === 'chase' || yeti.status === 'warning')) {
      const gap = Math.max(0, player.d - yeti.d);
      if (gap < 22) {
        this.yetiProximityTime = Math.min(10, this.yetiProximityTime + dt);
      } else {
        this.yetiProximityTime = Math.max(0, this.yetiProximityTime - dt * 0.5);
      }
    } else {
      this.yetiProximityTime = Math.max(0, this.yetiProximityTime - dt);
    }

    // Compute Instantaneous Skill & Challenge Indexes
    const speedRatio = clamp(player.speed / 30, 0, 1.2);
    const gateSuccessRate = gatesAttempted > 0 ? (gatesCleared / gatesAttempted) : 0.5;
    const comboFactor = clamp(player.slalomCombo / 5, 0, 1.5);

    // Skill score calculation
    // High speed + combos + jumps + near misses without crashing = High Skill
    const rawSkill = (speedRatio * 0.35) + (gateSuccessRate * 0.25) + (comboFactor * 0.2) + (jumps * 0.1) - (crashes * 0.3);
    this.playerSkill = clamp(lerp(this.playerSkill, clamp(rawSkill, 0.1, 1.0), dt * 0.4), 0, 1);

    // Challenge & Pressure calculation
    // Crashes + constant Yeti breathing on neck = High Stress / Overwhelmed
    // Flawless high combo + Yeti far behind = Under-challenged / Dominating
    const pressureScore = (crashes * 0.45) + (this.yetiProximityTime / 10 * 0.4) - (comboFactor * 0.2) - (speedRatio * 0.15);
    
    // Target Flow Index: -1 (Overwhelmed) to +1 (Bored/Dominating), 0 = Flow Channel
    const targetFlow = clamp(-pressureScore + (this.playerSkill - 0.5) * 0.6, -1.0, 1.0);
    this.flowIndex = lerp(this.flowIndex, targetFlow, dt * 0.3);

    // State Classification with hysteresis
    if (this.flowIndex < -0.32) {
      this.state = FlowState.RELIEF;
    } else if (this.flowIndex > 0.35) {
      this.state = FlowState.SURGE;
    } else {
      this.state = FlowState.BALANCE;
    }

    // Compute Adaptive Modulators smoothly
    let targetSpeedMod = 1.0;
    let targetForesightMod = 1.0;
    let targetEnergyMod = 1.0;
    let targetPounceMod = 1.0;

    switch (this.state) {
      case FlowState.RELIEF:
        // Player is struggling: give slight breathing room
        targetSpeedMod = 0.92;      // 8% slower Yeti
        targetForesightMod = 0.80;  // Less aggressive lead pursuit
        targetEnergyMod = 1.25;     // 25% faster energy recovery
        targetPounceMod = 1.35;     // Longer cooldown between pounces
        break;

      case FlowState.SURGE:
        // Player is dominating: elevate adrenaline
        targetSpeedMod = 1.10;      // 10% faster Yeti
        targetForesightMod = 1.25;  // Sharper lead pursuit & flanking
        targetEnergyMod = 0.90;     // Slightly stricter energy consumption
        targetPounceMod = 0.80;     // Quicker pounce cooldowns
        break;

      case FlowState.BALANCE:
      default:
        targetSpeedMod = 1.0;
        targetForesightMod = 1.0;
        targetEnergyMod = 1.0;
        targetPounceMod = 1.0;
        break;
    }

    // Smooth transition
    this.yetiSpeedMod = lerp(this.yetiSpeedMod, targetSpeedMod, dt * 0.5);
    this.yetiForesightMod = lerp(this.yetiForesightMod, targetForesightMod, dt * 0.5);
    this.energyRegenMod = lerp(this.energyRegenMod, targetEnergyMod, dt * 0.5);
    this.pounceCooldownMod = lerp(this.pounceCooldownMod, targetPounceMod, dt * 0.5);

    if (telemetry) {
      telemetry.recordDDA({
        flowIndex: this.flowIndex,
        playerSkill: this.playerSkill,
        stateName: this.state,
        speedMod: this.yetiSpeedMod
      });
    }
  }
}
