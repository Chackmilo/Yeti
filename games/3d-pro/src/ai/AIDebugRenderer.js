/**
 * @file AIDebugRenderer.js
 * @description 3D Visual AI Gizmos and Telemetry Renderer in Three.js.
 * Renders predictive intercept target markers, sensory whiskers, danger cones, and autopilot paths.
 */

import * as THREE from 'three';
import { snowHeight } from '../config.js';

export class AIDebugRenderer {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.visible = false;

    // 1. Yeti Lead Target Reticle (Cyan Ring on Snow)
    const ringGeo = new THREE.RingGeometry(0.8, 1.2, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });
    this.leadReticle = new THREE.Mesh(ringGeo, ringMat);
    this.leadReticle.visible = false;
    this.scene.add(this.leadReticle);

    // 2. Whisker Rays LineSegments
    const whiskerPositions = new Float32Array(5 * 2 * 3); // 5 rays * 2 points * 3 coords
    const whiskerColors = new Float32Array(5 * 2 * 3);
    const whiskerGeo = new THREE.BufferGeometry();
    whiskerGeo.setAttribute('position', new THREE.BufferAttribute(whiskerPositions, 3));
    whiskerGeo.setAttribute('color', new THREE.BufferAttribute(whiskerColors, 3));
    const whiskerMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });
    this.whiskerLines = new THREE.LineSegments(whiskerGeo, whiskerMat);
    this.whiskerLines.frustumCulled = false;
    this.whiskerLines.visible = false;
    this.scene.add(this.whiskerLines);

    // 3. Autopilot Planned Trajectory Line
    const trailCount = 12;
    const trailPositions = new Float32Array(trailCount * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.LineBasicMaterial({
      color: 0x8ef4d0,
      linewidth: 2,
      transparent: true,
      opacity: 0.9
    });
    this.autopilotTrail = new THREE.Line(trailGeo, trailMat);
    this.autopilotTrail.frustumCulled = false;
    this.autopilotTrail.visible = false;
    this.scene.add(this.autopilotTrail);
  }

  setVisible(visible) {
    this.visible = visible;
    this.leadReticle.visible = visible;
    this.whiskerLines.visible = visible;
    this.autopilotTrail.visible = visible;
  }

  /**
   * Update visual gizmos each frame.
   */
  update(player, yeti, yetiAI, skierAI) {
    if (!this.visible) return;

    const baseOriginD = player.d;
    const baseSnowY = snowHeight(0, baseOriginD);

    // 1. Update Yeti Lead Target Reticle
    if (yeti && yeti.model.root.visible && yetiAI && yetiAI.leadTarget) {
      const tx = yetiAI.leadTarget.x;
      const td = yetiAI.leadTarget.d;
      const ty = snowHeight(tx, td) - baseSnowY + 0.15;
      const tz = baseOriginD - td;

      this.leadReticle.position.set(tx, ty, tz);
      this.leadReticle.visible = true;
    } else {
      this.leadReticle.visible = false;
    }

    // 2. Update Whisker Rays
    if (yeti && yeti.model.root.visible && yetiAI) {
      const posAttr = this.whiskerLines.geometry.attributes.position;
      const colAttr = this.whiskerLines.geometry.attributes.color;
      const yx = yeti.x;
      const yd = yeti.d;
      const yy = snowHeight(yx, yd) - baseSnowY + 1.2;
      const yz = baseOriginD - yd;

      const angles = yetiAI.whiskerAngles;
      const hits = yetiAI.whiskerHits;
      const dists = yetiAI.whiskerDists;

      let idx = 0;
      for (let i = 0; i < angles.length; i++) {
        const ang = angles[i];
        const dist = dists[i] || 15;
        const ex = yx + Math.sin(ang) * dist;
        const ed = yd + Math.cos(ang) * dist;
        const ey = snowHeight(ex, ed) - baseSnowY + 0.8;
        const ez = baseOriginD - ed;

        // Start point
        posAttr.setXYZ(idx, yx, yy, yz);
        // End point
        posAttr.setXYZ(idx + 1, ex, ey, ez);

        // Color: Red if hit, Green if clear
        const isHit = hits[i];
        const r = isHit ? 1.0 : 0.2;
        const g = isHit ? 0.2 : 0.95;
        const b = isHit ? 0.2 : 0.3;

        colAttr.setXYZ(idx, r, g, b);
        colAttr.setXYZ(idx + 1, r, g, b);
        idx += 2;
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      this.whiskerLines.visible = true;
    } else {
      this.whiskerLines.visible = false;
    }

    // 3. Update Autopilot Planned Trajectory
    if (skierAI && skierAI.mode !== 'OFF') {
      const posAttr = this.autopilotTrail.geometry.attributes.position;
      const px = player.x;
      const pd = player.d;
      const steer = skierAI.plannedSteer || 0;
      const speed = player.speed || 20;

      for (let step = 0; step < 12; step++) {
        const t = (step / 11) * 1.0;
        const sx = px + steer * (8 + speed * 0.18) * t;
        const sd = pd + speed * t;
        const sy = snowHeight(sx, sd) - baseSnowY + 0.25;
        const sz = baseOriginD - sd;
        posAttr.setXYZ(step, sx, sy, sz);
      }
      posAttr.needsUpdate = true;
      this.autopilotTrail.visible = true;
    } else {
      this.autopilotTrail.visible = false;
    }
  }

  dispose() {
    this.scene.remove(this.leadReticle, this.whiskerLines, this.autopilotTrail);
    this.leadReticle.geometry.dispose();
    this.leadReticle.material.dispose();
    this.whiskerLines.geometry.dispose();
    this.whiskerLines.material.dispose();
    this.autopilotTrail.geometry.dispose();
    this.autopilotTrail.material.dispose();
  }
}
