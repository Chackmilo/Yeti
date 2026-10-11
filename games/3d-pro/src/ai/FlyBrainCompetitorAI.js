/**
 * @file FlyBrainCompetitorAI.js
 * @description Biologically inspired Drosophila melanogaster Spiking Neural Network (SNN)
 * controller for autonomous rival skier ("Fly-Bot").
 * 
 * Supports Dual-Engine Operation:
 * 1. WebSocket Remote Mode: Connects to local Python server (ws://127.0.0.1:8765) running
 *    the full PyTorch / LIF connectome model.
 * 2. Embedded Local SNN Mode: Runs real-time Leaky Integrate-and-Fire (LIF) spiking dynamics
 *    directly inside JavaScript at 60 Hz if the Python bridge is not running.
 */

import { clamp, lerp } from '../config.js';
import { ACTION } from '../core/InputManager.js';

export class FlyBrainCompetitorAI {
  /**
   * @param {Object} options Configuration
   */
  constructor(options = {}) {
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    this.serverUrl = options.serverUrl || 'ws://127.0.0.1:8765';
    this.connected = false;
    this.ws = null;
    this.reconnectTimer = null;

    // Control Outputs
    this.steer = 0;       // -1.0 (left) to +1.0 (right)
    this.jump = false;
    this.turbo = false;
    this.brake = false;
    this.virtualInput = new Uint8Array(5);

    // Neural Telemetry (Exposed to HUD and Gizmos)
    this.telemetry = {
      connected: false,
      sensorySpikes: 0,
      centralSpikes: 0,
      motorSpikesLeft: 0,
      motorSpikesRight: 0,
      giantFiberSpikes: 0,
      engine: 'LOCAL_LIF'
    };

    // Perception state
    this.lastPerception = {
      left_hazard: 0,
      right_hazard: 0,
      center_hazard: 0,
      yeti_proximity: 0,
      goal_bias: 0
    };

    // Local LIF Spiking Model State (Refractory, potentials, EPSC)
    this.initLocalSNN();

    // Initialize WebSocket client
    this.connectWebSocket();
  }

  initLocalSNN() {
    this.vRest = -70.0;
    this.vThresh = -50.0;
    this.vReset = -75.0;
    this.tauM = 16.0;

    // 16 sensory, 32 central, 8 motor
    this.vSensory = new Float32Array(16).fill(this.vRest);
    this.vCentral = new Float32Array(32).fill(this.vRest);
    this.vMotor = new Float32Array(8).fill(this.vRest);

    this.refrSensory = new Int32Array(16);
    this.refrCentral = new Int32Array(32);
    this.refrMotor = new Int32Array(8);

    this.synCentral = new Float32Array(32);
    this.synMotor = new Float32Array(8);
  }

  connectWebSocket() {
    if (typeof WebSocket === 'undefined') return;
    if (typeof window === 'undefined' && !this.enableWsInNode) return;
    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        this.connected = true;
        this.telemetry.connected = true;
        this.telemetry.engine = 'PYTHON_PYTORCH';
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'action') {
            this.steer = lerp(this.steer, clamp(msg.steer, -1, 1), 0.4);
            this.jump = !!msg.jump;
            this.turbo = !!msg.turbo;
            this.brake = !!msg.brake;
            if (msg.telemetry) {
              Object.assign(this.telemetry, msg.telemetry);
              this.telemetry.connected = true;
              this.telemetry.engine = 'PYTHON_PYTORCH';
            }
          }
        } catch (_) {}
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.telemetry.connected = false;
        this.telemetry.engine = 'LOCAL_LIF';
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.connected = false;
        this.telemetry.connected = false;
        this.telemetry.engine = 'LOCAL_LIF';
      };
    } catch (_) {
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.connected) this.connectWebSocket();
    }, 4000);
    if (this.reconnectTimer && typeof this.reconnectTimer.unref === 'function') {
      this.reconnectTimer.unref();
    }
  }

  /**
   * Gathers sensory stimuli from the mountain and updates neural processing.
   * @param {number} dt Delta time
   * @param {Object} rival The Fly Competitor entity
   * @param {Object} yeti The Yeti entity
   * @param {Object} world The WorldGenerator
   */
  update(dt, rival, yeti, world) {
    if (!this.enabled || !rival) return;

    // 1. Gather Sensory Perception
    const lookaheadD = 34;
    const minD = rival.d - 1;
    const maxD = rival.d + lookaheadD;

    let leftHazard = 0;
    let rightHazard = 0;
    let centerHazard = 0;
    let nextGate = null;

    if (world && world.blocks) {
      for (let b = 0; b < world.blocks.length; b++) {
        const block = world.blocks[b];
        if (block.end < minD || block.start > maxD) continue;

        // Obstacles (Trees and Rocks)
        for (let i = 0; i < block.items.length; i++) {
          const item = block.items[i];
          if (!item.active || item.d < minD || item.d > maxD) continue;

          const relD = item.d - rival.d;
          if (relD < 0.2) continue;
          const relX = item.x - rival.x;
          const proximity = Math.max(0, 1 - relD / lookaheadD);

          if (Math.abs(relX) < 1.1) {
            centerHazard = Math.max(centerHazard, proximity * 1.3);
          }
          if (relX < -0.4 && relX > -4.5) {
            leftHazard = Math.max(leftHazard, proximity);
          } else if (relX > 0.4 && relX < 4.5) {
            rightHazard = Math.max(rightHazard, proximity);
          }
        }

        // Slalom Flags targeting
        if (block.flags && !nextGate) {
          for (let i = 0; i < block.flags.length; i++) {
            const f = block.flags[i];
            if (f.active && !f.cleared && f.d >= rival.d && f.d <= maxD) {
              nextGate = f;
              break;
            }
          }
        }
      }
    }

    // Yeti Proximity (Looming predator threat)
    let yetiProximity = 0;
    if (yeti && yeti.active) {
      const distToYeti = Math.hypot(rival.x - yeti.x, rival.d - yeti.d);
      if (distToYeti < 45) {
        yetiProximity = Math.max(0, 1 - distToYeti / 45);
      }
    }

    // Slalom Gate Attractor (Biased navigation)
    let goalBias = 0;
    if (nextGate) {
      const dx = nextGate.x - rival.x;
      goalBias = clamp(dx / 5.0, -1, 1);
    }

    this.lastPerception = {
      left_hazard: clamp(leftHazard, 0, 1),
      right_hazard: clamp(rightHazard, 0, 1),
      center_hazard: clamp(centerHazard, 0, 1),
      yeti_proximity: clamp(yetiProximity, 0, 1),
      goal_bias: goalBias
    };

    // 2. Transmit to Python or Execute Local SNN
    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'perception',
        data: this.lastPerception
      }));
    } else {
      // Local In-Browser LIF Simulation step
      this.stepLocalSNN(this.lastPerception, dt);
    }

    // 3. Translate Decoded Motor Output to Virtual Inputs
    this.virtualInput.fill(0);
    if (this.steer < -0.15) this.virtualInput[ACTION.LEFT] = 1;
    if (this.steer > 0.15) this.virtualInput[ACTION.RIGHT] = 1;
    if (this.turbo) this.virtualInput[ACTION.TURBO] = 1;
    if (this.brake) this.virtualInput[ACTION.BRAKE] = 1;
  }

  /**
   * In-Browser Leaky Integrate-and-Fire simulation of Drosophila sensorimotor loop.
   */
  stepLocalSNN(p, dtSim) {
    const microTicks = 20;
    const dt = 1.0; // 1 ms micro-tick
    let sensorySpikes = 0;
    let centralSpikes = 0;
    let motorLeftSpikes = 0;
    let motorRightSpikes = 0;
    let gfSpikes = 0;

    // Injected currents
    const iSens = new Float32Array(16);
    // Left sensors (stimulated by right hazard to trigger turn-left avoidance)
    for (let i = 0; i < 6; i++) {
      iSens[i] = (p.right_hazard * 110.0) + Math.max(0, -p.goal_bias * 50.0);
    }
    // Right sensors (stimulated by left hazard to trigger turn-right avoidance)
    for (let i = 6; i < 12; i++) {
      iSens[i] = (p.left_hazard * 110.0) + Math.max(0, p.goal_bias * 50.0);
    }
    // Looming threat (Giant fiber pathway)
    for (let i = 12; i < 16; i++) {
      iSens[i] = (p.center_hazard * 120.0) + (p.yeti_proximity * 140.0);
    }

    for (let step = 0; step < microTicks; step++) {
      // 1. Sensory Layer LIF
      for (let i = 0; i < 16; i++) {
        if (this.refrSensory[i] > 0) {
          this.refrSensory[i]--;
          continue;
        }
        this.vSensory[i] += (-(this.vSensory[i] - this.vRest) + iSens[i]) * (dt / this.tauM);
        if (this.vSensory[i] >= this.vThresh) {
          this.vSensory[i] = this.vReset;
          this.refrSensory[i] = 2;
          sensorySpikes++;

          // Synaptic transmission to Central Complex
          const tgtStart = i < 6 ? 0 : (i < 12 ? 16 : 0);
          for (let c = tgtStart; c < tgtStart + 16; c++) {
            this.synCentral[c] += 16.0;
          }

          // Direct fast reflex pathway (LPTC -> DNa and Looming -> Giant Fiber)
          if (i < 6) {
            this.synMotor[0] += 14.0; // Turn Left reflex
            this.synMotor[1] += 14.0;
          } else if (i < 12) {
            this.synMotor[2] += 14.0; // Turn Right reflex
            this.synMotor[3] += 14.0;
          } else {
            this.synMotor[6] += 26.0; // Giant Fiber escape jump
            this.synMotor[7] += 26.0;
          }
        }
      }

      // 2. Central Complex LIF (Ring Attractor Heading)
      for (let i = 0; i < 32; i++) {
        this.synCentral[i] *= 0.88; // Synaptic decay
        if (this.refrCentral[i] > 0) {
          this.refrCentral[i]--;
          continue;
        }
        this.vCentral[i] += (-(this.vCentral[i] - this.vRest) + this.synCentral[i]) * (dt / 14.0);
        if (this.vCentral[i] >= this.vThresh) {
          this.vCentral[i] = this.vReset;
          this.refrCentral[i] = 2;
          centralSpikes++;
          // Transmit to motor neurons (left vs right steering bias)
          if (i < 16) {
            this.synMotor[0] += 15.0; // DNa01 Left
            this.synMotor[1] += 15.0;
          } else {
            this.synMotor[2] += 15.0; // DNa02 Right
            this.synMotor[3] += 15.0;
          }
        }
      }

      // 3. Motor Descending Neurons LIF
      for (let i = 0; i < 8; i++) {
        this.synMotor[i] *= 0.84;
        if (this.refrMotor[i] > 0) {
          this.refrMotor[i]--;
          continue;
        }
        this.vMotor[i] += (-(this.vMotor[i] - this.vRest) + this.synMotor[i]) * (dt / 10.0);
        if (this.vMotor[i] >= -48.0) {
          this.vMotor[i] = this.vReset;
          this.refrMotor[i] = 2;
          if (i === 0 || i === 1) motorLeftSpikes++;
          else if (i === 2 || i === 3) motorRightSpikes++;
          else if (i === 6 || i === 7) gfSpikes++;
        }
      }
    }

    // Motor Decoding
    const rateDiff = motorRightSpikes - motorLeftSpikes;
    const targetSteer = Math.tanh(rateDiff * 0.45);
    this.steer = lerp(this.steer, targetSteer, 0.5);

    this.jump = gfSpikes >= 2 && p.center_hazard > 0.5;
    this.turbo = p.yeti_proximity > 0.4 || (gfSpikes >= 2 && p.center_hazard < 0.3);
    this.brake = p.center_hazard > 0.75 && gfSpikes < 2;

    this.telemetry.sensorySpikes = sensorySpikes;
    this.telemetry.centralSpikes = centralSpikes;
    this.telemetry.motorSpikesLeft = motorLeftSpikes;
    this.telemetry.motorSpikesRight = motorRightSpikes;
    this.telemetry.giantFiberSpikes = gfSpikes;
    this.telemetry.engine = 'LOCAL_LIF';
  }

  isHeld(action) {
    return this.virtualInput[action] === 1;
  }

  dispose() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
    }
  }
}
