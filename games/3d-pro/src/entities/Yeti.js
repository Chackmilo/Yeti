/**
 * @file Yeti.js
 * @description Monster Entity with procedural 3D model, animation kinematics, and YetiAI brain.
 */

import * as THREE from 'three';
import { CONFIG as C, damp, clamp, snowHeight, YETI_EVENT as E } from '../config.js';
import { YetiAI } from '../ai/YetiAI.js';

export class Yeti {
  /**
   * @param {Object} factory Procedural model factory
   * @param {THREE.Scene} scene
   */
  constructor(factory, scene) {
    this.model = factory.makeYeti();
    scene.add(this.model.root);
    this.entryFrom = new THREE.Vector3();
    this.entryWorld = new THREE.Vector3();
    this.ai = new YetiAI();
    this.reset(500);
  }

  reset(distance) {
    this.status = 'sleep';
    this.next = distance;
    this.x = 0;
    this.d = 0;
    this.t = 0;
    this.stumble = 0;
    this.grace = 0;
    this.escape = 0;
    this.phase = 0;
    this.hitId = -1;
    this.event = E.NONE;
    this.entryPending = false;
    this.model.root.visible = false;
    this.ai.reset();
  }

  summon(player) {
    if (this.status === 'chase' || this.status === 'warning' || this.status === 'caught') {
      return false;
    }
    this.status = 'warning';
    this.x = player.x + 4;
    this.d = player.d - 23;
    this.t = 0;
    this.stumble = 0;
    this.grace = 1.6;
    this.escape = 0;
    this.hitId = -1;
    this.entryPending = true;
    this.event = E.WARNING;
    this.model.root.visible = true;
    this.ai.reset();
    return true;
  }

  /**
   * Physics step for the Yeti (60 Hz).
   * @param {number} dt Delta time
   * @param {Object} player Skier player entity
   * @param {Object} collisions CollisionSystem
   * @param {Object} world WorldGenerator
   * @param {Object} dda DDAEngine
   * @param {Object} telemetry AITelemetry
   */
  step(dt, player, collisions, world, dda, telemetry) {
    this.event = E.NONE;
    this.phase += dt * 8;

    if (this.status === 'sleep') {
      if (player.d >= this.next) this.summon(player);
      return;
    }

    this.t += dt;

    if (this.status === 'warning') {
      this.d = player.d - 23;
      this.x = damp(this.x, player.x + 3, 1, dt);
      if (this.t >= C.warningTime) {
        this.status = 'chase';
        this.t = 0;
      }
      return;
    }

    if (this.status === 'gone') {
      this.d += 6 * dt;
      if (this.t > 3) {
        this.status = 'sleep';
        this.next = player.d + C.nextYetiDistance;
        this.model.root.visible = false;
      }
      return;
    }

    if (this.status !== 'chase') return;

    this.grace = Math.max(0, this.grace - dt);
    this.stumble = Math.max(0, this.stumble - dt);

    const oldX = this.x;
    const oldD = this.d;

    // AI Decision Brain Execution
    const aiOutput = this.ai.step(dt, this, player, world, collisions, dda);

    if (telemetry) {
      telemetry.recordYetiDecision({
        behavior: aiOutput.behavior,
        target: aiOutput.leadTarget,
        avoidance: aiOutput.avoidance,
        whiskers: aiOutput.whiskers,
        pounceCooldown: aiOutput.pounceCooldown,
        pounceActive: aiOutput.pounceActive
      });
    }

    // Kinematic Integration
    if (this.stumble > 0) {
      this.x += clamp((player.x - this.x) * 0.8, -4, 4) * dt * 0.3;
      this.d += 7 * dt;
    } else {
      this.x += aiOutput.lateralSteer * dt;
      this.d += aiOutput.desiredSpeed * dt;
    }

    // Keep Yeti within mountain bounds
    this.x = clamp(this.x, -C.halfWidth + 0.8, C.halfWidth - 0.8);

    // Collision Detection with trees/rocks (when not in grace period and not leaping)
    if (!this.stumble && !this.grace && !aiOutput.pounceActive) {
      const hit = collisions.hit(oldX, oldD, this.x, this.d, 0.8, true, this.hitId);
      if (hit) {
        this.hitId = hit.id;
        this.stumble = 1.0;
        this.event = E.STUMBLE;
        if (dda) dda.recordEvent('yeti_stumble');
      }
    }

    // Escape Tracking
    const gap = player.d - this.d;
    this.escape = gap >= C.escapeGap ? this.escape + dt : Math.max(0, this.escape - dt * 0.5);
    if (this.escape >= C.escapeTime) {
      this.status = 'gone';
      this.t = 0;
      this.event = E.ESCAPE;
      return;
    }

    // Sweep relative player/Yeti motion for robust Continuous Capture Detection
    const rx0 = player.oldX - oldX;
    const rd0 = player.oldD - oldD;
    const rx1 = player.x - this.x;
    const rd1 = player.d - this.d;
    const vx = rx1 - rx0;
    const vd = rd1 - rd0;
    const l = vx * vx + vd * vd;
    const u = l ? clamp(-(rx0 * vx + rd0 * vd) / l, 0, 1) : 0;

    if (Math.abs(rx0 + u * vx) < 1.3 && Math.abs(rd0 + u * vd) < 1.8 && !player.protect) {
      this.status = 'caught';
      this.t = 0;
      this.event = E.CAPTURE;
    }
  }

  /**
   * Updates 3D mesh transformations and animations.
   * @param {Object} player Skier player entity
   * @param {THREE.Camera} camera
   */
  draw(player, camera) {
    if (!this.model.root.visible) return;

    const m = this.model;
    const base = snowHeight(0, player.d);
    const z = player.d - this.d;
    const airborneY = (this.ai && this.ai.airborneY) || 0;

    m.root.position.set(this.x, snowHeight(this.x, this.d) - base + airborneY, z);
    m.root.rotation.set(0, -Math.atan2(player.x - this.x, Math.max(1, z)), 0);
    m.body.rotation.set(0, 0, 0);
    m.body.position.y = 0;

    if (this.status === 'warning') {
      this.entryWorld.copy(m.root.position).project(camera);
      if (this.entryPending) {
        this.entryFrom.set(clamp(this.entryWorld.x, -0.75, 0.75), 1.25, this.entryWorld.z);
        this.entryPending = false;
      }
      this.entryWorld.copy(this.entryFrom).unproject(camera);
      const t = clamp(this.t / C.warningTime, 0, 1);
      const smooth = t * t * (3 - 2 * t);
      m.root.position.lerpVectors(this.entryWorld, m.root.position, smooth);
      m.body.rotation.x = -0.12;
    } else if (this.status === 'gone') {
      m.body.rotation.x = 0.45;
      m.body.position.y = Math.sin(this.phase) * 0.05;
    } else {
      if (this.ai && this.ai.pounceActive) {
        // Athletic Pounce forward reach animation
        m.body.rotation.x = 0.55;
        m.body.position.y = 0.2;
        m.arms[0].rotation.set(-1.6, 0, -0.4);
        m.arms[1].rotation.set(-1.6, 0, 0.4);
      } else {
        m.body.position.y = Math.abs(Math.sin(this.phase)) * 0.16;
        m.body.rotation.z = Math.sin(this.phase) * 0.06;
        m.body.rotation.x = this.stumble > 0 ? -1.15 : -0.1;
      }
    }

    if (!this.ai || !this.ai.pounceActive) {
      for (let i = 0; i < 2; i++) {
        const s = i === 0 ? 1 : -1;
        m.legs[i].rotation.x = Math.sin(this.phase) * s * 0.65;
        m.arms[i].rotation.x = -Math.sin(this.phase) * s * 0.65 - 0.15;
        m.arms[i].rotation.z = s * 0.16;
      }
    }

    if (this.status === 'caught') {
      const y = snowHeight(player.x, player.d) - base;
      const p = player.model;
      m.root.position.set(player.x, y, 0.8);
      m.root.rotation.y = 0;
      m.body.rotation.x = 0;
      m.arms[0].rotation.x = m.arms[1].rotation.x = -1.4;
      m.arms[0].rotation.z = -0.5;
      m.arms[1].rotation.z = 0.5;
      p.root.visible = true;
      p.root.position.y = y + 1.9 + Math.abs(Math.sin(this.t * 10)) * 0.45;
      p.root.rotation.z = Math.sin(this.t * 9) * 0.45;
      p.body.rotation.set(0, 0, 0);
      p.body.position.y = 0;
      m.body.rotation.z = Math.sin(this.t * 9) * 0.15;
    }
  }
}
