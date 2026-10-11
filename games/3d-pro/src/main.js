/**
 * @file main.js
 * @description Master Game Orchestrator with Senior AI Architecture.
 * Integrates 60 Hz physics, procedural world, audio spatialization, Behavior Tree Yeti AI,
 * Autonomous Skier Agent (Autopilot/Co-Pilot), DDA Flow State Engine, and XAI Telemetry.
 */

import { Engine } from './core/Engine.js';
import { InputManager } from './core/InputManager.js';
import { AudioManager } from './core/AudioManager.js';
import { StorageManager } from './core/StorageManager.js';
import { MountainTerrain } from './world/MountainTerrain.js';
import { WorldGenerator } from './world/WorldGenerator.js';
import { ObstaclePool } from './world/ObstaclePool.js';
import { SnowTracks } from './world/SnowTracks.js';
import { Player } from './entities/Player.js';
import { Yeti } from './entities/Yeti.js';
import { createModelFactory } from './entities/ProceduralModels.js';
import { CollisionSystem } from './physics/CollisionSystem.js';
import { HUD } from './ui/HUD.js';
import { MenuManager } from './ui/MenuManager.js';
import { YETI_EVENT as E } from './config.js';

// AI Systems
import { AITelemetry } from './ai/AITelemetry.js';
import { DDAEngine } from './ai/DDAEngine.js';
import { SkierAgentAI, SkierAIMode } from './ai/SkierAgentAI.js';
import { AIDebugRenderer } from './ai/AIDebugRenderer.js';

class SnowEscapeGame {
  constructor() {
    this.state = 'menu';
    this.pausedState = 'playing';
    this.runMode = 'classic';
    this.seed = 1;
    this.debug = false;
    this.runPrevious = 0;
    this.saveTime = 0;
    this.audioTime = 0;

    // Core Foundation
    this.storage = new StorageManager();
    this.engine = new Engine(document.getElementById('viewport'));
    this.factory = createModelFactory();
    this.world = new WorldGenerator();
    this.world.reset(this.seed);
    this.terrain = new MountainTerrain(this.engine.scene, this.factory.materials, this.factory.geometries);
    this.obstacles = new ObstaclePool(this.engine.scene, this.world, this.factory.materials);
    this.effects = new SnowTracks(this.engine.scene);
    this.collisions = new CollisionSystem(this.world);
    this.audio = new AudioManager(this.storage);
    this.hud = new HUD();

    // AI Systems
    this.telemetry = new AITelemetry();
    this.dda = new DDAEngine();
    this.skierAI = new SkierAgentAI();
    this.aiRenderer = new AIDebugRenderer(this.engine.scene);

    // Entities
    this.player = new Player(this.factory, this.engine.scene);
    this.yeti = new Yeti(this.factory, this.engine.scene);

    // UI & Control Handlers
    this.menu = new MenuManager(this.storage, {
      start: () => this.start(),
      pause: () => this.togglePause(),
      menu: () => this.toMenu(),
      sound: () => {
        this.audio.toggle();
        this.menu.sound(this.audio.enabled);
      },
      debug: () => this.toggleDebug(),
      summon: () => {
        if (this.state === 'playing' && this.yeti.summon(this.player)) this.handleYetiEvent();
      },
      refill: () => {
        if (this.state === 'playing') this.player.energy = 1;
      },
      quality: q => this.engine.setQuality(q),
      toggleAi: () => this.toggleAi()
    });

    this.input = new InputManager({
      onCommand: command => this.command(command),
      onBlur: () => this.pause(),
      isPlaying: () => this.state === 'playing'
    });

    this.abort = new AbortController();
    window.addEventListener('pagehide', () => this.save(), { signal: this.abort.signal });

    this.engine.onContextLost = () => {
      this.pause();
      document.getElementById('loader').classList.remove('hidden');
      document.getElementById('loadingText').textContent = 'Contexto WebGL perdido. Recarga para reconstruir la montaña.';
    };

    this.menu.show(this.state);
    this.menu.sound(this.audio.enabled);
    this.menu.updateAi(this.skierAI.mode);
    this.draw(0);
    document.getElementById('loader').classList.add('hidden');

    this.engine.start({
      isSimulating: () => this.state === 'playing' || this.state === 'caught',
      step: dt => this.step(dt),
      draw: (dt, alpha) => this.draw(dt, alpha),
      updateUI: dt => this.updateUI(dt)
    });
  }

  command(command) {
    switch (command) {
      case 'start': if (this.state === 'menu') this.start(); break;
      case 'restart': this.start(); break;
      case 'pause': this.togglePause(); break;
      case 'debug': this.toggleDebug(); break;
      case 'autopilot': this.toggleAi(); break;
    }
  }

  toggleAi() {
    const newMode = this.skierAI.toggleMode();
    this.menu.updateAi(newMode);
    const label = newMode === SkierAIMode.AUTOPILOT
      ? '🤖 PILOTO AUTOMÁTICO IA: ACTIVADO'
      : newMode === SkierAIMode.CO_PILOT
        ? '🛡️ CO-PILOTO IA: ACTIVO (ASISTENCIA)'
        : '👤 CONTROL MANUAL HUMANO';
    this.hud.announce(label, 2.2);
  }

  save() {
    if (this.state !== 'menu') this.storage.saveRecord(this.runMode, this.player.d);
  }

  start() {
    this.save();
    this.runMode = this.menu.mode;
    this.runPrevious = this.storage.record(this.runMode);
    this.audio.init();
    this.audio.silence();
    this.input.clear();
    this.seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    this.world.reset(this.seed);
    this.terrain.reset();
    this.effects.reset();
    this.player.reset(this.runMode);
    this.yeti.reset(this.menu.spawnAt);
    this.telemetry.reset();
    this.dda.reset();
    this.hud.clear();
    this.saveTime = 0;
    this.engine.setQuality(this.menu.quality.value);
    this.engine.resetCamera();
    this.state = 'playing';
    this.menu.show(this.state);
    this.menu.updateAi(this.skierAI.mode);
    this.draw(0);
  }

  pause() {
    if (this.state !== 'playing' && this.state !== 'caught') return;
    this.pausedState = this.state;
    this.state = 'pause';
    this.input.clear();
    this.audio.silence();
    this.menu.show(this.state);
  }

  togglePause() {
    if (this.state === 'pause') {
      this.state = this.pausedState;
      this.engine.accumulator = 0;
      this.audio.init();
      this.input.clear();
      this.menu.show(this.state);
    } else {
      this.pause();
    }
  }

  toMenu() {
    this.save();
    this.state = 'menu';
    this.input.clear();
    this.audio.silence();
    this.hud.clear();
    this.yeti.model.root.visible = false;
    this.menu.sync();
    this.menu.show(this.state);
  }

  toggleDebug() {
    this.debug = !this.debug;
    this.menu.setDebug(this.debug);
    this.obstacles.setDebug(this.debug);
    this.aiRenderer.setVisible(this.debug);
  }

  handleYetiEvent() {
    switch (this.yeti.event) {
      case E.WARNING:
        this.yeti.draw(this.player, this.engine.camera);
        this.audio.update(true, this.player, this.yeti, this.engine.camera);
        this.audio.roar();
        this.hud.announce('¡RUGIDO EN LA CUMBRE! EL YETI VIENE', 3.2);
        break;
      case E.STUMBLE:
        this.audio.noise(0.2, 0.18, 300, true);
        break;
      case E.ESCAPE:
        this.save();
        this.audio.fanfare();
        this.hud.announce('¡ESCAPASTE! El Yeti se queda sin aliento', 3.5);
        break;
      case E.CAPTURE:
        this.state = 'caught';
        this.input.clear();
        this.player.turbo = false;
        this.audio.tone(220, 0.4, 'triangle', 0.2, 0, 440, true);
        this.hud.announce('El Yeti exige un baile…', 2.2);
        this.menu.show(this.state);
        break;
    }
  }

  step(dt) {
    this.hud.tick(dt, true);

    if (this.state === 'caught') {
      this.yeti.t += dt;
      this.effects.step(dt, this.player, false);
      if (this.yeti.t > 2.8) {
        this.save();
        this.state = 'over';
        this.menu.results(
          this.player.d,
          this.storage.record(this.runMode),
          Math.floor(this.player.d) > this.runPrevious,
          this.player.score,
          this.player.gatesCleared,
          this.player.stuntsLanded
        );
        this.menu.show(this.state);
        this.audio.silence();
      }
      return;
    }

    if (this.state !== 'playing') return;

    // 1. Skier AI Agent Evaluation
    this.skierAI.update(dt, this.player, this.yeti, this.world, this.input, this.dda);
    this.telemetry.recordSkierAgent({
      mode: this.skierAI.mode,
      plannedAngle: this.skierAI.plannedSteer,
      utilityScore: this.skierAI.bestScore,
      imminentHazard: this.skierAI.imminentHazard,
      target: this.skierAI.targetObject
    });

    // 2. Input Blending (Human input blended with Autopilot or Co-Pilot)
    const blendedInput = {
      held: action => this.skierAI.isHeld(action, this.input.held(action))
    };

    // 3. Player Step
    this.player.step(dt, blendedInput, this.collisions, this.world, this.dda);
    this.world.update(this.player.d);

    // Dynamic Feedback Events
    if (this.player.newCrash) {
      this.effects.spray(this.player, 65, 2);
      this.audio.crash();
      this.hud.announce('¡Vaya voltereta! Protección temporal', 1.9);
    }
    if (this.player.newGate) {
      this.audio.gateChime();
      this.hud.announce('¡PUERTA SLALOM! +' + (100 * this.player.slalomCombo) + ' PTS · COMBO x' + this.player.slalomCombo, 1.2);
    }
    if (this.player.newJump) {
      this.audio.tone(440, 0.25, 'sine', 0.25, 0, 750);
      this.effects.spray(this.player, 25, 1.8);
      this.hud.announce('¡SALTO EN RAMPA! 360° EN EL AIRE...', 1.0);
    }
    if (this.player.newLanding) {
      this.audio.noise(0.2, 0.35, 600);
      this.effects.spray(this.player, 50, 2.5);
      this.hud.announce('¡ATERRIZAJE PERFECTO! +250 PTS', 1.5);
    }

    // 4. Yeti AI Step
    this.yeti.step(dt, this.player, this.collisions, this.world, this.dda, this.telemetry);
    this.handleYetiEvent();

    // 5. DDA Flow Engine Step
    this.dda.step(dt, this.player, this.yeti, this.telemetry);

    // 6. Effects Step
    this.effects.step(dt, this.player, this.state === 'playing');

    // Periodic Autosave
    this.saveTime += dt;
    if (this.saveTime >= 5) {
      this.saveTime = 0;
      this.save();
    }
  }

  draw(dt, alpha = 1) {
    if (this.state === 'pause' || this.state === 'over') return;
    this.engine.updateCamera(dt, this.player);
    this.terrain.update(this.player);
    this.obstacles.update(this.player);
    this.player.draw();
    this.yeti.draw(this.player, this.engine.camera);
    this.effects.draw(this.player);

    // Update 3D Visual AI Gizmos (Whiskers, Trajectories, Targets)
    if (this.debug) {
      this.aiRenderer.update(this.player, this.yeti, this.yeti.ai, this.skierAI);
    }
  }

  updateUI(dt) {
    this.input.poll();
    this.hud.update(
      dt,
      this.player,
      this.yeti,
      this.engine,
      this.state,
      this.debug,
      this.seed,
      this.collisions,
      this.telemetry,
      this.skierAI,
      this.dda
    );
    this.audioTime += dt;
    if (this.audioTime >= 0.04) {
      this.audio.update(this.state === 'playing', this.player, this.yeti, this.engine.camera, this.audioTime);
      this.audioTime = 0;
    }
  }

  dispose() {
    this.save();
    this.abort.abort();
    this.input.dispose();
    this.menu.dispose();
    this.audio.dispose();
    this.engine.stop();
    this.effects.dispose();
    this.obstacles.dispose();
    this.terrain.dispose();
    this.aiRenderer.dispose();
    this.engine.scene.remove(this.player.model.root, this.yeti.model.root);
    this.factory.dispose();
    this.engine.dispose();
  }
}

let game;
try {
  game = new SnowEscapeGame();
  window.SnowEscape = Object.freeze({
    version: '4.5.0-AI',
    getDiagnostics: () => ({
      state: game.state,
      mode: game.runMode,
      metres: game.player.d,
      fps: game.engine.fps,
      seed: game.seed,
      yeti: game.yeti.status,
      yetiAI: game.yeti.ai ? game.yeti.ai.currentBehavior : null,
      skierMode: game.skierAI.mode,
      ddaFlow: game.dda.flowIndex,
      ddaState: game.dda.state,
      drawCalls: game.engine.renderer.info.render.calls,
      terrainTiles: game.terrain.tiles.length,
      quality: game.engine.lowQuality ? 'low' : 'high'
    }),
    validateWorld: () => game.world.validate(),
    getAITelemetry: () => game.telemetry
  });
} catch (error) {
  console.error(error);
  document.getElementById('loader').classList.remove('hidden');
  document.getElementById('loadingText').textContent = 'No se pudo iniciar el juego. Comprueba WebGL y la aceleración gráfica. Consulta la consola para ver el detalle.';
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game?.dispose();
    delete window.SnowEscape;
  });
}
