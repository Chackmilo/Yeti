/**
 * @file FlyCompetitor.js
 * @description Autonomous Rival Skier driven by the Drosophila Spiking Neural Network.
 * Competes against the player on the mountain slopes with identical physical constraints.
 */

import * as THREE from 'three';
import { CONFIG as C, damp, lerp, clamp, snowHeight } from '../config.js';
import { ACTION } from '../core/InputManager.js';

export class FlyCompetitor {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.model = this.buildModel();
    this.scene.add(this.model.root);
    this.reset();
  }

  buildModel() {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    const geo = {
      box: new THREE.BoxGeometry(1, 1, 1),
      sphere: new THREE.SphereGeometry(1, 12, 8),
      cylinder: new THREE.CylinderGeometry(1, 1, 1, 8),
      cone: new THREE.ConeGeometry(1, 1, 8)
    };

    const mat = {
      chitin: new THREE.MeshStandardMaterial({ color: '#16222f', roughness: 0.35, metalness: 0.2 }),
      flyEyes: new THREE.MeshStandardMaterial({ color: '#00ffaa', emissive: '#00aa66', emissiveIntensity: 0.6, roughness: 0.2 }),
      helmet: new THREE.MeshStandardMaterial({ color: '#2b3a4a', roughness: 0.5 }),
      skis: new THREE.MeshStandardMaterial({ color: '#00e5ff', emissive: '#007799', emissiveIntensity: 0.4, roughness: 0.4 }),
      scarf: new THREE.MeshStandardMaterial({ color: '#00ffaa', roughness: 0.7 }),
      antenna: new THREE.MeshStandardMaterial({ color: '#ffd000', emissive: '#ffaa00', emissiveIntensity: 0.5, metalness: 0.8 }),
      black: new THREE.MeshStandardMaterial({ color: '#0a0f14', roughness: 0.6 })
    };

    const part = (parent, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) => {
      const o = new THREE.Mesh(geometry, material);
      o.position.set(x, y, z);
      o.scale.set(sx, sy, sz);
      o.castShadow = true;
      o.receiveShadow = true;
      parent.add(o);
      return o;
    };

    // Body & Torso
    part(body, geo.sphere, mat.chitin, 0, 0.95, 0, 0.32, 0.38, 0.26);
    part(body, geo.sphere, mat.chitin, 0, 1.25, 0, 0.34, 0.46, 0.28);

    // Head
    const head = part(body, geo.sphere, mat.helmet, 0, 1.62, -0.05, 0.28, 0.25, 0.28);

    // Compound Insectoid Facet Eyes (Left & Right)
    for (const s of [-1, 1]) {
      part(body, geo.sphere, mat.flyEyes, s * 0.16, 1.64, -0.22, 0.12, 0.14, 0.12);
      // Antennae
      const ant = part(body, geo.cylinder, mat.antenna, s * 0.14, 1.86, -0.06, 0.018, 0.24, 0.018);
      ant.rotation.z = s * 0.35;
      ant.rotation.x = -0.2;
    }

    // Scarf / Streamer
    const scarf = part(body, geo.box, mat.scarf, 0.2, 1.35, 0.2, 0.12, 0.04, 0.45);
    scarf.rotation.y = -0.2;

    // Skis & Poles
    const skis = [];
    for (const s of [-1, 1]) {
      const ski = new THREE.Group();
      ski.position.set(s * 0.25, 0.06, 0);
      root.add(ski);
      part(ski, geo.box, mat.skis, 0, 0, 0, 0.16, 0.07, 2.2);
      const tip = part(ski, geo.box, mat.antenna, 0, 0.08, -1.08, 0.16, 0.07, 0.35);
      tip.rotation.x = -0.4;
      skis.push(ski);

      const pole = part(body, geo.cylinder, mat.black, s * 0.52, 0.65, 0.1, 0.02, 0.95, 0.02);
      pole.rotation.x = -0.2;
    }

    // Holographic Neural Pulse Halo above head
    const brainHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.035, 8, 24),
      new THREE.MeshStandardMaterial({
        color: '#00ffaa',
        emissive: '#00ff88',
        emissiveIntensity: 1.0,
        wireframe: true
      })
    );
    brainHalo.position.set(0, 2.05, -0.05);
    brainHalo.rotation.x = Math.PI * 0.5;
    body.add(brainHalo);

    root.visible = false;
    return { root, body, skis, scarf, brainHalo };
  }

  reset(startX = 2.5) {
    this.x = startX;
    this.d = 0;
    this.vx = 0;
    this.speed = 12;
    this.energy = 1;
    this.crash = 0;
    this.protect = 0;
    this.turn = 0;
    this.brake = 0;
    this.turbo = false;
    this.oldX = this.x;
    this.oldD = 0;
    this.clock = 0;
    this.score = 0;
    this.gatesCleared = 0;
    this.stuntsLanded = 0;
    this.isJumping = false;
    this.jumpTime = 0;
    this.jumpDuration = 0.85;
    this.airborneY = 0;
    this.airSpin = 0;

    if (this.model && this.model.root) {
      this.model.root.rotation.set(0, 0, 0);
      this.model.root.visible = this.active;
    }
  }

  setActive(active) {
    this.active = active;
    if (this.model && this.model.root) {
      this.model.root.visible = active;
    }
  }

  fall() {
    if (this.protect > 0 || this.crash > 0) return false;
    this.crash = 0.9;
    this.protect = 1.6;
    this.speed = Math.max(3, this.speed * 0.35);
    this.turbo = false;
    this.isJumping = false;
    this.airborneY = 0;
    return true;
  }

  /**
   * Physics step for the Fly Competitor.
   * @param {number} dt Delta time
   * @param {Object} ai FlyBrainCompetitorAI
   * @param {Object} collisions CollisionSystem
   * @param {Object} world WorldGenerator
   */
  step(dt, ai, collisions, world) {
    if (!this.active) return;

    this.clock += dt;
    this.oldX = this.x;
    this.oldD = this.d;
    this.protect = Math.max(0, this.protect - dt);
    this.crash = Math.max(0, this.crash - dt);

    // Jump Physics
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
        this.speed = Math.min(C.turboSpeed, this.speed + 3.0);
      }
    } else if (ai.jump && !this.crash) {
      this.isJumping = true;
      this.jumpTime = 0;
      this.score += 50;
    }

    // Steering & Speed Dynamics
    const turnVal = Number(ai.isHeld(ACTION.RIGHT)) - Number(ai.isHeld(ACTION.LEFT));
    const braking = ai.isHeld(ACTION.BRAKE);
    this.brake = damp(this.brake, braking ? 1 : 0, 4, dt);
    this.turn = damp(this.turn, turnVal, 6, dt);
    this.turbo = ai.isHeld(ACTION.TURBO) && this.brake < 0.2 && !this.crash && this.energy > 0.05;

    this.energy = clamp(this.energy + (this.turbo ? -1 / 6 : 1 / 8) * dt, 0, 1);

    let target = this.turbo ? C.turboSpeed : C.normalSpeed;
    target = lerp(target, 4, this.brake) * (1 - 0.13 * Math.abs(this.turn));
    if (this.crash) target = 4;

    this.speed = damp(this.speed, target, braking ? 2.2 : 1.2, dt);
    const turnAuthority = this.turbo ? 0.76 : 1.0;
    this.vx = damp(this.vx, this.crash ? 0 : this.turn * (8 + this.speed * 0.18) * turnAuthority, 4, dt);
    this.x += this.vx * dt;
    this.d += this.speed * dt;

    // Mountain Boundaries
    if (Math.abs(this.x) > C.halfWidth - 0.55) {
      this.x = clamp(this.x, -C.halfWidth + 0.55, C.halfWidth - 0.55);
      this.vx *= -0.3;
      this.fall();
    }

    // Continuous Collision Detection
    if (!this.isJumping && collisions && collisions.checkPoint) {
      if (collisions.checkPoint(this.x, this.d, 0.45)) {
        this.fall();
      }
    }

    // Slalom Gates Crossing Check
    if (world && world.blocks) {
      for (let b = 0; b < world.blocks.length; b++) {
        const blk = world.blocks[b];
        if (!blk.flags || blk.end < this.d - 2 || blk.start > this.d + 2) continue;
        for (let i = 0; i < blk.flags.length; i++) {
          const f = blk.flags[i];
          if (f.active && !f.rivalCleared && this.oldD <= f.d && this.d >= f.d) {
            if (Math.abs(this.x - f.x) <= f.spacing * 0.5) {
              f.rivalCleared = true;
              this.gatesCleared++;
              this.score += 150;
            }
          }
        }
      }
    }
  }

  /**
   * Visual render update.
   */
  draw() {
    if (!this.active || !this.model || !this.model.root) return;

    const baseZ = -(this.d % C.chunkLength);
    const groundY = snowHeight(this.x, this.d);
    const finalY = groundY + this.airborneY;

    this.model.root.position.set(this.x, finalY, baseZ);

    // Body Tilt and Lean
    const root = this.model.root;
    root.rotation.y = -this.turn * 0.38;
    root.rotation.z = -this.turn * 0.18;

    if (this.isJumping) {
      this.model.body.rotation.y = this.airSpin;
    } else {
      this.model.body.rotation.y = 0;
    }

    // Animate Scarf and Halo Pulse
    if (this.model.scarf) {
      this.model.scarf.rotation.z = Math.sin(this.clock * 16) * 0.25;
    }
    if (this.model.brainHalo) {
      this.model.brainHalo.rotation.z = this.clock * 4.0;
      const pulseScale = 1.0 + Math.sin(this.clock * 8.0) * 0.15;
      this.model.brainHalo.scale.set(pulseScale, pulseScale, pulseScale);
    }
  }
}
