/**
 * @file YetiAI.js
 * @description Advanced Yeti Autonomous Agent with Predictive Interception (Lead Pursuit),
 * Multi-Ray Spatial Perception (Whisker Radar), Context Steering, and Behavior Tree decision-making.
 */

import { CONFIG as C, clamp, lerp, damp, corridor } from '../config.js';
import { Selector, Sequence, Condition, Action, NodeStatus } from './BehaviorTree.js';

export class YetiAI {
  /**
   * @param {Object} options Configuration
   */
  constructor(options = {}) {
    this.foresightMult = options.foresightMult || 1.0;
    this.whiskerAngles = [-0.785, -0.349, 0, 0.349, 0.785]; // -45°, -20°, 0°, +20°, +45° in radians
    this.whiskerHits = [false, false, false, false, false];
    this.whiskerDists = [20, 20, 20, 20, 20];
    this.avoidanceForce = { x: 0, d: 0 };
    this.leadTarget = { x: 0, d: 0 };

    // Pounce mechanic
    this.pounceActive = false;
    this.pounceTime = 0;
    this.pounceDuration = 0.75;
    this.pounceCooldown = 4.0;
    this.airborneY = 0;

    // Slalom anticipation
    this.playerPrevVx = 0;
    this.playerOscillationTimer = 0;
    this.playerIsSlaloming = false;

    // Current behavior state name for XAI
    this.currentBehavior = 'PREDICTIVE_CHASE';

    // Build the Behavior Tree
    this.tree = this.buildBehaviorTree();
  }

  reset() {
    this.whiskerHits.fill(false);
    this.whiskerDists.fill(20);
    this.avoidanceForce.x = 0;
    this.avoidanceForce.d = 0;
    this.leadTarget.x = 0;
    this.leadTarget.d = 0;
    this.pounceActive = false;
    this.pounceTime = 0;
    this.pounceCooldown = 3.0;
    this.airborneY = 0;
    this.playerPrevVx = 0;
    this.playerOscillationTimer = 0;
    this.playerIsSlaloming = false;
    this.currentBehavior = 'PREDICTIVE_CHASE';
    if (this.tree) this.tree.reset();
  }

  buildBehaviorTree() {
    return new Selector('Yeti_Root_Selector', [
      // 1. Pounce Sequence: Close distance + aligned -> athletic leap
      new Sequence('Pounce_Sequence', [
        new Condition('Can_Pounce', ctx => this.checkCanPounce(ctx)),
        new Action('Execute_Pounce', ctx => this.executePounce(ctx))
      ]),

      // 2. Obstacle Avoidance Action: Whisker radar detected danger
      new Sequence('Avoidance_Sequence', [
        new Condition('Obstacle_Imminent', ctx => this.checkObstacleImminent(ctx)),
        new Action('Execute_Avoidance', ctx => this.executeAvoidance(ctx))
      ]),

      // 3. Flanking Sequence: Skier in slalom flow -> cut off exit
      new Sequence('Flanking_Sequence', [
        new Condition('Skier_In_Slalom', ctx => ctx.player.slalomCombo >= 2),
        new Action('Execute_Flank', ctx => this.executeFlank(ctx))
      ]),

      // 4. Default: Predictive Lead Pursuit
      new Action('Predictive_Chase', ctx => this.executePredictiveChase(ctx))
    ]);
  }

  /**
   * Spatial Perception: Casts whisker rays ahead to scan for trees & rocks.
   * @param {number} x Yeti X
   * @param {number} d Yeti D
   * @param {number} speed Yeti forward speed
   * @param {Object} world WorldGenerator instance containing active blocks
   */
  scanPerceptionWhiskers(x, d, speed, world) {
    this.avoidanceForce.x = 0;
    this.avoidanceForce.d = 0;
    const baseLength = clamp(speed * 0.55, 10, 18);

    if (!world || !world.blocks) return;

    for (let w = 0; w < this.whiskerAngles.length; w++) {
      const angle = this.whiskerAngles[w];
      const rayLen = baseLength * (Math.abs(angle) > 0.5 ? 0.75 : 1.0);
      const rayEndX = x + Math.sin(angle) * rayLen;
      const rayEndD = d + Math.cos(angle) * rayLen;

      let nearestHitDist = rayLen;
      let hit = false;
      let hitObs = null;

      const minD = Math.min(d, rayEndD) - 2;
      const maxD = Math.max(d, rayEndD) + 2;

      for (let b = 0; b < world.blocks.length; b++) {
        const block = world.blocks[b];
        if (block.end + 4 < minD || block.start - 4 > maxD) continue;

        for (let i = 0; i < block.items.length; i++) {
          const item = block.items[i];
          if (!item.active || item.d + item.r < minD || item.d - item.r > maxD) continue;

          // Circle-to-ray distance check
          const vx = rayEndX - x;
          const vd = rayEndD - d;
          const lenSq = vx * vx + vd * vd;
          const t = clamp(((item.x - x) * vx + (item.d - d) * vd) / (lenSq || 1), 0, 1);
          const px = x + vx * t;
          const pd = d + vd * t;
          const distSq = (px - item.x) * (px - item.x) + (pd - item.d) * (pd - item.d);
          const threatRadius = item.r + 0.8;

          if (distSq <= threatRadius * threatRadius) {
            const hitDistance = Math.hypot(px - x, pd - d);
            if (hitDistance < nearestHitDist) {
              nearestHitDist = hitDistance;
              hit = true;
              hitObs = item;
            }
          }
        }
      }

      this.whiskerHits[w] = hit;
      this.whiskerDists[w] = nearestHitDist;

      if (hit && hitObs) {
        // Compute repulsive force away from obstacle
        const awayX = x - hitObs.x;
        const awayD = d - hitObs.d;
        const norm = Math.hypot(awayX, awayD) || 1;
        const weight = (1.0 - nearestHitDist / rayLen) * 3.5;
        this.avoidanceForce.x += (awayX / norm) * weight;
        this.avoidanceForce.d += (awayD / norm) * weight;
      }
    }
  }

  /**
   * Predictive Lead Interception: Calculates future intercept point.
   */
  calculateLeadTarget(x, d, player, ddaForesight = 1.0) {
    const gap = Math.max(1, player.d - d);
    const relativeSpeed = Math.max(4, C.yetiSpeed - player.speed * 0.5);
    const timeToIntercept = clamp(gap / relativeSpeed, 0.2, 2.2) * this.foresightMult * ddaForesight;

    // Detect player slalom weaving
    const playerVx = player.vx || 0;
    if (Math.sign(playerVx) !== Math.sign(this.playerPrevVx) && Math.abs(playerVx) > 2) {
      this.playerOscillationTimer = 1.5;
    }
    this.playerPrevVx = playerVx;
    this.playerIsSlaloming = this.playerOscillationTimer > 0;

    let targetX = player.x + playerVx * timeToIntercept * 0.85;

    // If player is weaving back and forth, cut off the reversal towards corridor center!
    if (this.playerIsSlaloming) {
      const corridorCenter = corridor(player.d);
      targetX = lerp(targetX, corridorCenter, 0.45);
    }

    // Keep target within mountain limits
    this.leadTarget.x = clamp(targetX, -C.halfWidth + 2.5, C.halfWidth - 2.5);
    this.leadTarget.d = player.d + (player.speed * timeToIntercept * 0.3);
  }

  // --- Behavior Tree Predicates & Actions ---

  checkCanPounce(ctx) {
    if (this.pounceActive) return true;
    if (this.pounceCooldown > 0) return false;
    const gap = ctx.player.d - ctx.yeti.d;
    const dx = Math.abs(ctx.player.x - ctx.yeti.x);
    // Ready if distance is close, angle is aligned, and not currently stumbling
    return gap > 1.5 && gap < 9.0 && dx < 3.2 && ctx.yeti.stumble <= 0;
  }

  executePounce(ctx) {
    this.currentBehavior = 'POUNCE';
    if (!this.pounceActive) {
      this.pounceActive = true;
      this.pounceTime = 0;
      if (ctx.telemetry) ctx.telemetry.recordBTNode('Pounce_Initiated', NodeStatus.RUNNING);
    }

    this.pounceTime += ctx.dt;
    const progress = clamp(this.pounceTime / this.pounceDuration, 0, 1);
    this.airborneY = Math.sin(progress * Math.PI) * 1.85;

    // During pounce, surge forward with high speed
    ctx.desiredSpeed = C.yetiSpeed * 1.42;
    ctx.steerRate = 2.4;

    if (this.pounceTime >= this.pounceDuration) {
      this.pounceActive = false;
      this.airborneY = 0;
      this.pounceCooldown = 4.5 * (ctx.dda ? ctx.dda.pounceCooldownMod : 1.0);
      return NodeStatus.SUCCESS;
    }
    return NodeStatus.RUNNING;
  }

  checkObstacleImminent(ctx) {
    return this.whiskerHits[1] || this.whiskerHits[2] || this.whiskerHits[3];
  }

  executeAvoidance(ctx) {
    this.currentBehavior = 'AVOID_OBSTACLE';
    // Inject avoidance force into desired steering
    ctx.steerOffset += this.avoidanceForce.x * 2.2;
    return NodeStatus.SUCCESS;
  }

  executeFlank(ctx) {
    this.currentBehavior = 'TACTICAL_FLANK';
    // Shift pursuit target laterally towards the outer gate flank to trap skier
    const flankSide = ctx.player.x > ctx.yeti.x ? 1 : -1;
    ctx.steerOffset += flankSide * 3.5;
    return NodeStatus.SUCCESS;
  }

  executePredictiveChase(ctx) {
    this.currentBehavior = 'PREDICTIVE_CHASE';
    return NodeStatus.SUCCESS;
  }

  /**
   * Main step function called every physics tick (60 Hz).
   */
  step(dt, yeti, player, world, collisions, dda) {
    this.pounceCooldown = Math.max(0, this.pounceCooldown - dt);
    this.playerOscillationTimer = Math.max(0, this.playerOscillationTimer - dt);

    const ddaForesight = dda ? dda.yetiForesightMod : 1.0;
    const ddaSpeedMod = dda ? dda.yetiSpeedMod : 1.0;

    // 1. Sensory Scan
    this.scanPerceptionWhiskers(yeti.x, yeti.d, C.yetiSpeed, world);

    // 2. Predictive Target Calculation
    this.calculateLeadTarget(yeti.x, yeti.d, player, ddaForesight);

    // 3. Behavior Tree Context Setup & Evaluation
    const context = {
      dt,
      yeti,
      player,
      world,
      collisions,
      dda,
      desiredSpeed: C.yetiSpeed * ddaSpeedMod,
      steerRate: 1.8,
      steerOffset: 0
    };

    this.tree.tick(context);

    // 4. Context Steering Resolution
    const targetDx = (this.leadTarget.x + context.steerOffset) - yeti.x;
    const lateralSteer = clamp(targetDx * context.steerRate, -12, 12);

    return {
      desiredSpeed: context.desiredSpeed,
      lateralSteer,
      airborneY: this.airborneY,
      pounceActive: this.pounceActive,
      pounceCooldown: this.pounceCooldown,
      behavior: this.currentBehavior,
      leadTarget: this.leadTarget,
      avoidance: this.avoidanceForce,
      whiskers: this.whiskerHits
    };
  }
}
