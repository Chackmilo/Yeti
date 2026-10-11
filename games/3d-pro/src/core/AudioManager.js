import * as THREE from 'three';
import { CONFIG as C } from '../config.js';

export class AudioManager {
  constructor(storage) {
    this.storage = storage;
    this.enabled = storage.get('audio', 'true') !== 'false';
    this.ctx = null;
    this.forward = new THREE.Vector3();
    this.up = new THREE.Vector3();
    this.events = new Set();
    this.heartbeatTimer = 0;
    this.lastYetiPhase = 0;
  }

  init() {
    if (this.ctx) {
      this.ctx.resume().catch(() => {});
      return;
    }
    const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
    if (!AC) return;
    try {
      this.ctx = new AC();
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = this.enabled ? 0.45 : 0;
      this.master.connect(c.destination);

      const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;

      this.source = c.createBufferSource();
      this.source.buffer = buffer;
      this.source.loop = true;

      this.windFilter = c.createBiquadFilter();
      this.windFilter.type = 'lowpass';
      this.windFilter.frequency.value = 650;
      this.windGain = c.createGain();
      this.windGain.gain.value = 0;
      this.source.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.master);

      this.cutFilter = c.createBiquadFilter();
      this.cutFilter.type = 'bandpass';
      this.cutFilter.frequency.value = 1800;
      this.cutFilter.Q.value = 0.8;
      this.cutGain = c.createGain();
      this.cutGain.gain.value = 0;
      this.source.connect(this.cutFilter);
      this.cutFilter.connect(this.cutGain);
      this.cutGain.connect(this.master);

      this.yetiPanner = c.createPanner();
      this.yetiPanner.panningModel = 'HRTF';
      this.yetiPanner.distanceModel = 'inverse';
      this.yetiPanner.refDistance = 8;
      this.yetiPanner.maxDistance = 260;
      this.yetiPanner.rolloffFactor = 1.1;
      this.yetiPanner.connect(this.master);

      this.source.start();
      c.resume().catch(() => {});
    } catch {
      this.dispose();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    this.storage.set('audio', this.enabled);
    this.init();
    if (this.ctx) {
      this.master.gain.setTargetAtTime(this.enabled ? 0.45 : 0, this.ctx.currentTime, 0.04);
    }
  }

  position(p, x, y, z, t) {
    if (p.positionX) {
      p.positionX.setTargetAtTime(x, t, 0.03);
      p.positionY.setTargetAtTime(y, t, 0.03);
      p.positionZ.setTargetAtTime(z, t, 0.03);
    } else {
      p.setPosition(x, y, z);
    }
  }

  update(active, player, yeti, camera, dt = 0.04) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const isTurbo = Boolean(active && player?.turbo);
    const baseWind = 350 + (player?.speed || 0) * 25;
    this.windFilter.frequency.setTargetAtTime(isTurbo ? baseWind * 1.45 : baseWind, t, 0.08);
    this.windFilter.Q.setTargetAtTime(isTurbo ? 2.6 : 0.7, t, 0.08);
    this.windGain.gain.setTargetAtTime(active ? (isTurbo ? 0.1 : 0.035) + (player?.speed || 0) * 0.0025 : 0, t, 0.1);
    this.cutGain.gain.setTargetAtTime(active ? (player?.brake || 0) * 0.15 + Math.abs(player?.vx || 0) * 0.007 : 0, t, 0.05);

    const listener = this.ctx.listener;
    this.position(listener, camera.position.x, camera.position.y, camera.position.z, t);
    camera.getWorldDirection(this.forward);
    this.up.set(0, 1, 0).applyQuaternion(camera.quaternion);

    if (listener.forwardX) {
      listener.forwardX.setTargetAtTime(this.forward.x, t, 0.03);
      listener.forwardY.setTargetAtTime(this.forward.y, t, 0.03);
      listener.forwardZ.setTargetAtTime(this.forward.z, t, 0.03);
      listener.upX.setTargetAtTime(this.up.x, t, 0.03);
      listener.upY.setTargetAtTime(this.up.y, t, 0.03);
      listener.upZ.setTargetAtTime(this.up.z, t, 0.03);
    } else {
      listener.setOrientation(this.forward.x, this.forward.y, this.forward.z, this.up.x, this.up.y, this.up.z);
    }

    if (yeti?.model?.root?.position) {
      this.position(this.yetiPanner, yeti.model.root.position.x, yeti.model.root.position.y + 2, yeti.model.root.position.z, t);
    }

    // Yeti spatial footsteps via HRTF Panner
    if (active && yeti && yeti.status === 'chase' && yeti.stumble <= 0) {
      if (Math.floor(yeti.phase / Math.PI) !== Math.floor(this.lastYetiPhase / Math.PI)) {
        this.stepYeti();
      }
      this.lastYetiPhase = yeti.phase;
    } else {
      this.lastYetiPhase = 0;
    }

    // Procedural chase tension heartbeat (pulso de tensión acelerado según cercanía)
    if (active && yeti && (yeti.status === 'chase' || yeti.status === 'warning') && (!player || player.protect <= 0)) {
      const gap = Math.max(0, (player?.d || 0) - yeti.d);
      if (gap < C.alertRange) {
        const tension = Math.max(0, Math.min(1, (C.alertRange - gap) / 58));
        const tempo = 0.82 - tension * 0.52; // De ~73 BPM hasta ~187 BPM al estar muy cerca
        this.heartbeatTimer += dt;
        if (this.heartbeatTimer >= tempo) {
          this.heartbeatTimer = 0;
          this.playHeartbeat(tension);
        }
      } else {
        this.heartbeatTimer = 0;
      }
    } else {
      this.heartbeatTimer = 0;
    }
  }

  stepYeti() {
    if (!this.enabled || !this.ctx) return;
    this.noise(0.11, 0.24, 300, true);
    this.tone(68, 0.1, 'sine', 0.22, 0, 26, true);
  }

  playHeartbeat(tension) {
    if (!this.enabled || !this.ctx) return;
    const vol = 0.18 + tension * 0.28;
    this.tone(54, 0.08, 'sine', vol, 0, 26); // Lub (golpe sordo grave)
    this.tone(76, 0.07, 'sine', vol * 0.82, 0.11, 32); // Dub (segundo pulso)
  }

  gateChime() {
    if (!this.enabled || !this.ctx) return;
    this.tone(880, 0.16, 'triangle', 0.24);
    this.tone(1320, 0.22, 'sine', 0.18, 0.05);
  }

  tone(freq, duration = 0.2, type = 'sine', volume = 0.2, delay = 0, end = freq, spatial = false) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(15, end), t + duration);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g);
    g.connect(spatial ? this.yetiPanner : this.master);
    this.events.add(o);
    o.onended = () => {
      try { o.disconnect(); } catch { /* noop */ }
      try { g.disconnect(); } catch { /* noop */ }
      this.events.delete(o);
    };
    o.start(t);
    o.stop(t + duration + 0.05);
  }

  noise(duration = 0.3, volume = 0.35, freq = 500, spatial = false) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = c.currentTime;
    const s = c.createBufferSource();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    s.buffer = this.noiseBuffer;
    f.type = 'lowpass';
    f.frequency.value = freq;
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    s.connect(f);
    f.connect(g);
    g.connect(spatial ? this.yetiPanner : this.master);
    this.events.add(s);
    s.onended = () => {
      try { s.disconnect(); } catch { /* noop */ }
      try { f.disconnect(); } catch { /* noop */ }
      try { g.disconnect(); } catch { /* noop */ }
      this.events.delete(s);
    };
    s.start(t);
    s.stop(t + duration);
  }

  crash() {
    this.noise(0.38, 0.55, 800);
    this.tone(150, 0.25, 'triangle', 0.35, 0, 35);
    this.tone(60, 0.35, 'sine', 0.4, 0.04, 25);
  }

  roar() {
    this.noise(1.3, 0.38, 380, true);
    this.tone(108, 1.3, 'sawtooth', 0.22, 0, 38, true);
    this.tone(74, 1.5, 'triangle', 0.28, 0.05, 26, true);
  }

  fanfare() {
    this.tone(523, 0.32, 'triangle', 0.23);
    this.tone(659, 0.32, 'triangle', 0.23, 0.13);
    this.tone(784, 0.32, 'triangle', 0.23, 0.26);
    this.tone(1047, 0.32, 'triangle', 0.23, 0.39);
  }

  silence() {
    if (!this.ctx) return;
    this.heartbeatTimer = 0;
    this.lastYetiPhase = 0;
    const t = this.ctx.currentTime;
    if (this.windGain?.gain) this.windGain.gain.setTargetAtTime(0, t, 0.05);
    if (this.cutGain?.gain) this.cutGain.gain.setTargetAtTime(0, t, 0.05);
    for (const node of this.events) {
      try { node.stop(); } catch { /* ya detenido */ }
      try { node.disconnect(); } catch { /* ya desconectado */ }
    }
    this.events.clear();
  }

  dispose() {
    this.silence();
    if (!this.ctx) return;
    if (this.source) {
      this.source.onended = null;
      try { this.source.stop(); } catch { /* ya detenido o no arrancado */ }
    }
    const nodes = [
      this.source, this.windFilter, this.cutFilter,
      this.windGain, this.cutGain, this.yetiPanner, this.master
    ];
    for (const node of nodes) {
      if (node) {
        try { node.disconnect(); } catch { /* ya desconectado */ }
      }
    }
    this.ctx.close().catch(() => {});
    this.ctx = null;
  }
}
