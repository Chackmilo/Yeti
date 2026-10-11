import * as THREE from 'three';
import { CONFIG as C, damp, snowHeight } from '../config.js';

export class Engine {
  constructor(container) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(63, innerWidth / innerHeight, 0.15, 510);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(C.colors.ambient, 0.65));
    this.scene.add(new THREE.HemisphereLight('#e6f5ff', '#7c99b1', 1.45));

    this.sun = new THREE.DirectionalLight(C.colors.sun, 3.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(C.shadowSize, C.shadowSize);
    Object.assign(this.sun.shadow.camera, { left: -50, right: 50, top: 65, bottom: -35, near: 1, far: 190 });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.sun.shadow.bias = -0.00035;
    this.sun.shadow.normalBias = 0.045;
    this.scene.add(this.sun, this.sun.target);

    this.goal = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.bank = 0;
    this.fps = 60;
    this.frames = 0;
    this.fpsTime = 0;
    this.adaptiveTime = 0;
    this.accumulator = 0;
    this.droppedTime = 0;
    this.running = false;
    this.quality = 'auto';
    this.lowQuality = false;
    this.raf = 0;

    this.abort = new AbortController();
    window.addEventListener('resize', () => this.resize(), { signal: this.abort.signal });
    this.renderer.domElement.addEventListener('webglcontextlost', e => {
      e.preventDefault();
      this.stop();
      this.onContextLost?.();
    }, { signal: this.abort.signal });

    this.tick = this.tick.bind(this);
    this.setQuality('auto');
    this.resetCamera();
  }

  resetCamera() {
    this.camera.position.set(0, 15.5, 32);
    this.bank = 0;
    this.camera.fov = 63;
    this.camera.updateProjectionMatrix();
    this.accumulator = 0;
    this.droppedTime = 0;
  }

  setQuality(quality) {
    this.quality = quality;
    const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer:coarse)').matches;
    const small = typeof innerWidth !== 'undefined' && typeof innerHeight !== 'undefined' && Math.min(innerWidth, innerHeight) < 700;
    const lowMem = (typeof navigator !== 'undefined' && (navigator.deviceMemory ?? 8) <= 2);
    this.lowQuality = quality === 'low' || (quality === 'auto' && lowMem && (coarse || small));
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.lowQuality ? 1 : 1.65));
    this.renderer.shadowMap.enabled = !this.lowQuality;
    this.sun.intensity = this.lowQuality ? 3 : 3.5;
    this.adaptiveTime = 0;
    this.resize();
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }

  updateCamera(dt, player) {
    const y = snowHeight(player.x, player.d) - snowHeight(0, player.d);
    this.goal.set(player.x * 0.72, y + 15.5, 32);
    this.camera.position.lerp(this.goal, 1 - Math.exp(-4 * dt));
    this.look.set(player.x + player.vx * 0.38, y + 1, -19);
    this.bank = damp(this.bank, -player.turn * 0.075, 3, dt);
    this.camera.up.set(Math.sin(this.bank), Math.cos(this.bank), 0);
    this.camera.lookAt(this.look);

    const fov = damp(this.camera.fov, player.turbo ? 76 : 63, 3, dt);
    if (Math.abs(fov - this.camera.fov) > 0.001) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld();
    this.sun.position.set(player.x - 32, 62, -38);
    this.sun.target.position.set(player.x, 0, -16);
    this.sun.target.updateMatrixWorld();
  }

  start(callbacks) {
    this.callbacks = callbacks;
    this.last = performance.now();
    this.running = true;
    this.raf = requestAnimationFrame(this.tick);
  }

  tick(now) {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.tick);

    const raw = (now - this.last) / 1000;
    const frameDT = Math.min(Math.max(raw, 0), C.maxAccumulator);
    this.last = now;

    if (this.callbacks?.isSimulating?.()) {
      this.accumulator += frameDT;

      // Descarte visible y medible: informa si hubo descarte por encima de maxAccumulator
      if (this.accumulator > C.maxAccumulator) {
        this.droppedTime = (this.droppedTime ?? 0) + (this.accumulator - C.maxAccumulator);
        this.accumulator = C.maxAccumulator;
      } else {
        this.droppedTime = 0;
      }

      let steps = 0;
      while (this.accumulator >= C.fixedDT && steps < C.maxSteps && this.callbacks.isSimulating()) {
        this.callbacks.step(C.fixedDT);
        this.accumulator -= C.fixedDT;
        steps++;
      }
    } else {
      this.accumulator = 0;
      this.droppedTime = 0;
    }

    const alpha = this.accumulator / C.fixedDT;
    this.callbacks?.draw?.(frameDT, alpha);
    this.callbacks?.updateUI?.(frameDT);
    this.renderer.render(this.scene, this.camera);
    this.measureFps(frameDT);
  }

  measureFps(frameDT) {
    this.frames++;
    this.fpsTime += frameDT;
    if (this.fpsTime < 0.5) return;
    this.fps = this.frames / this.fpsTime;
    this.frames = 0;
    this.fpsTime = 0;

    // Histéresis real: 5 s sostenidos por debajo de 47 FPS => baja calidad una vez
    if (this.quality === 'auto' && this.callbacks?.isSimulating?.()) {
      if (!this.lowQuality && this.fps < 47) {
        this.adaptiveTime += 0.5;
        if (this.adaptiveTime >= 5) {
          const ratio = this.renderer.getPixelRatio();
          if (ratio > 0.85) {
            this.renderer.setPixelRatio(Math.max(0.85, ratio - 0.2));
            this.resize();
          }
          if (this.fps < 38) {
            this.renderer.shadowMap.enabled = false;
            this.lowQuality = true;
          }
          this.adaptiveTime = 0;
        }
      } else if (this.fps >= 52) {
        this.adaptiveTime = Math.max(0, this.adaptiveTime - 0.5);
      }
    }
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose() {
    this.stop();
    this.abort.abort();
    this.sun.shadow.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
