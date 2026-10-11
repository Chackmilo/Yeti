/**
 * @file Player.js
 * @description Skier Player Entity with acrobatic jump physics, slalom combo scoring, and PBR animations.
 */

import { CONFIG as C, damp, lerp, clamp, snowHeight } from '../config.js';
import { ACTION } from '../core/InputManager.js';

export class Player {
  /**
   * @param {Object} factory Procedural model factory
   * @param {THREE.Scene} scene
   */
  constructor(factory, scene) {
    this.model = factory.makeSkier();
    scene.add(this.model.root);
    this.reset('classic');
  }

  reset(mode) {
    this.mode = mode;
    this.x = 0;
    this.d = 0;
    this.vx = 0;
    this.speed = 12;
    this.energy = 1;
    this.crash = 0;
    this.protect = 0;
    this.turn = 0;
    this.brake = 0;
    this.turbo = false;
    this.oldX = 0;
    this.oldD = 0;
    this.clock = 0;
    this.scarfPhase = 0;
    this.newCrash = false;

    // Acrobatics & Jumps
    this.isJumping = false;
    this.jumpTime = 0;
    this.jumpDuration = 0.85;
    this.airborneY = 0;
    this.airSpin = 0;

    // Scoring & Slalom Combos
    this.slalomCombo = 0;
    this.score = 0;
    this.gatesCleared = 0;
    this.lastGatePoints = 0;
    this.stuntsLanded = 0;
    this.newGate = false;
    this.newJump = false;
    this.newLanding = false;

    this.model.root.rotation.set(0, 0, 0);
    this.model.root.visible = true;
  }

  fall(dda) {
    if (this.protect > 0 || this.crash > 0) return false;
    this.crash = 1.1;
    this.protect = 3.1;
    this.speed = Math.max(4, this.speed * 0.24);
    this.vx *= -0.25;
    this.turbo = false;
    this.newCrash = true;
    this.isJumping = false;
    this.airborneY = 0;
    this.slalomCombo = 0;
    if (dda) dda.recordEvent('crash');
    return true;
  }

  /**
   * Physics step for the Skier (60 Hz).
   * @param {number} dt Delta time
   * @param {Object} input Input interface (Human or AI Autopilot)
   * @param {Object} collisions CollisionSystem
   * @param {Object} world WorldGenerator
   * @param {Object} dda DDAEngine
   */
  step(dt, input, collisions, world, dda) {
    this.newCrash = false;
    this.newGate = false;
    this.newJump = false;
    this.newLanding = false;
    this.clock += dt;
    this.oldX = this.x;
    this.oldD = this.d;
    this.protect = Math.max(0, this.protect - dt);
    this.crash = Math.max(0, this.crash - dt);

    // Jump Physics (360° Aerial Acrobatics)
    if (this.isJumping) {
      this.jumpTime += dt;
      const progress = clamp(this.jumpTime / this.jumpDuration, 0, 1);
      this.airborneY = Math.sin(progress * Math.PI) * 2.8;
      this.airSpin = progress * Math.PI * 2;
      this.protect = Math.max(this.protect, 0.2);

      if (this.jumpTime >= this.jumpDuration) {
        this.isJumping = false;
        this.airborneY = 0;
        this.airSpin = 0;
        this.stuntsLanded++;
        this.score += 250;
        this.energy = clamp(this.energy + 0.35, 0, 1);
        this.speed = Math.min(C.turboSpeed, this.speed + 3.5);
        this.newLanding = true;
        if (dda) dda.recordEvent('landing');
      }
    }

    // Steering & Speed Dynamics
    const turn = Number(input.held(ACTION.RIGHT)) - Number(input.held(ACTION.LEFT));
    const braking = input.held(ACTION.BRAKE);
    this.brake = damp(this.brake, braking ? 1 : 0, 4, dt);
    this.turn = damp(this.turn, turn, 6, dt);
    this.turbo = input.held(ACTION.TURBO) && this.brake < 0.2 && !this.crash && (this.mode === 'classic' || this.energy > 0.02);

    // Cosmetic only: continuous scarf flutter phase, faster under turbo
    this.scarfPhase += dt * (this.turbo ? 20 : 12);

    const energyRegenMult = dda ? dda.energyRegenMod : 1.0;
    this.energy = this.mode === 'modern' ? clamp(this.energy + (this.turbo ? -1 / 6 : (1 / 8) * energyRegenMult) * dt, 0, 1) : 1;

    let target = this.turbo ? C.turboSpeed : C.normalSpeed + (input.held(ACTION.DOWN) ? 2 : 0);
    target = lerp(target, 4, this.brake) * (1 - 0.13 * Math.abs(this.turn));
    if (this.crash) target = 4;

    this.speed = damp(this.speed, target, braking ? 2.2 : 1.2, dt);
    // Turbo trade-off: high-speed inertia reduces agile lateral response, requiring brake/throttle control
    const turnAuthority = this.turbo ? (C.turnAuthorityTurbo ?? 0.76) : 1.0;
    this.vx = damp(this.vx, this.crash ? 0 : this.turn * (8 + this.speed * 0.18) * turnAuthority, 4, dt);
    this.x += this.vx * dt;
    this.d += this.speed * dt;

    // Mountain Boundary Constraints
    if (Math.abs(this.x) > C.halfWidth - 0.55) {
      this.x = clamp(this.x, -C.halfWidth + 0.55, C.halfWidth - 0.55);
      this.vx *= -0.3;
      this.fall(dda);
    }

    // Continuous Collision Detection (CCD) against trees & rocks
    if (!this.crash && !this.protect && collisions.hit(this.oldX, this.oldD, this.x, this.d, 0.39)) {
      this.fall(dda);
    }

    // Interactive World Features: Slalom Gates & Jump Ramps
    if (world && world.blocks) {
      for (let b = 0; b < world.blocks.length; b++) {
        const block = world.blocks[b];

        // Slalom Gate detection
        if (block.flags) {
          for (let i = 0; i < block.flags.length; i++) {
            const f = block.flags[i];
            if (f.active && !f.cleared && this.oldD <= f.d && this.d >= f.d) {
              const u = (f.d - this.oldD) / Math.max(0.001, this.d - this.oldD);
              const crossX = this.oldX + u * (this.x - this.oldX);
              if (Math.abs(crossX - f.x) <= C.safeHalf + 1.1) {
                f.cleared = true;
                this.gatesCleared++;
                this.slalomCombo++;
                if (this.mode === 'classic') {
                  this.lastGatePoints = 150 * this.slalomCombo;
                  this.speed = Math.min(C.turboSpeed + 3, this.speed + 3.0);
                } else {
                  this.lastGatePoints = 100 * this.slalomCombo;
                  this.energy = clamp(this.energy + 0.25, 0, 1);
                }
                this.score += this.lastGatePoints;
                this.newGate = true;
                if (dda) dda.recordEvent('gate_clear');
              } else {
                this.slalomCombo = 0;
                if (dda) dda.recordEvent('gate_miss');
              }
            }
          }
        }

        // Jump Ramp detection
        if (block.ramps && !this.isJumping && !this.crash) {
          for (let i = 0; i < block.ramps.length; i++) {
            const r = block.ramps[i];
            if (r.active && !r.cleared && this.oldD <= r.d && this.d >= r.d && Math.abs(this.x - r.x) < 1.8) {
              r.cleared = true;
              this.isJumping = true;
              this.jumpTime = 0;
              this.newJump = true;
              if (dda) dda.recordEvent('jump');
            }
          }
        }
      }
    }
  }

  /**
   * Updates 3D mesh transformations and animations.
   */
  draw() {
    const m = this.model;
    const y = snowHeight(this.x, this.d) - snowHeight(0, this.d);
    m.root.position.set(this.x, y + this.airborneY, 0);
    m.root.rotation.set(0, -Math.atan2(this.vx, Math.max(2, this.speed)), 0);

    if (this.isJumping) {
      m.body.rotation.set(-0.3, this.airSpin, -this.turn * 0.24);
      m.skis[0].rotation.set(0, -0.3, -0.2);
      m.skis[1].rotation.set(0, 0.3, 0.2);
      m.arms[0].rotation.set(-1.2, 0, -0.8);
      m.arms[1].rotation.set(-1.2, 0, 0.8);
    } else {
      m.body.rotation.set(this.turbo ? -0.26 : 0.09, 0, -this.turn * 0.24);
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1;
        m.skis[i].rotation.set(0, side * this.brake * 0.3, 0);
        m.skis[i].position.x = side * (0.25 + this.brake * 0.16);
        m.legs[i].rotation.x = this.turbo ? -0.2 : 0.1;
        m.arms[i].rotation.x = this.turbo ? -1.05 : this.brake * 0.35;
      }
    }

    if (m.tail) {
      m.tail.rotation.y = Math.sin(this.clock * 8) * 0.12 + this.turn * 0.45;
    }
    if (m.scarf) {
      m.scarf.rotation.x = Math.sin(this.scarfPhase) * 0.1 * (this.turbo ? 1.8 : 1.0);
    }

    m.body.position.set(0, 0, 0);
    m.root.visible = !this.protect || this.crash > 0 || Math.floor(this.clock * 12) % 2 === 0;

    if (this.crash) {
      const t = 1 - this.crash / 1.1;
      m.body.rotation.x = t * Math.PI * 4;
      m.body.rotation.z += 0.8;
      m.body.position.y = 0.4 + Math.sin(t * Math.PI) * 0.75;
    }
  }
}
