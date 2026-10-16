/**
 * @file FlyBrainCompetitorAI.js
 * @description Biologically inspired Drosophila melanogaster Spiking Neural Network (SNN)
 * controller for autonomous rival skier ("Fly-Bot").
 */

import { clamp, lerp } from '../config.js';
import { ACTION } from '../core/InputManager.js';

export class FlyBrainCompetitorAI {
  constructor(options = {}) {
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    this.serverUrl = options.serverUrl || 'ws://127.0.0.1:8765';
    this.connected = false;
    this.ws = null;
    this.reconnectTimer = null;

    this.steer = 0;
    this.jump = false;
    this.turbo = false;
    this.brake = false;
    this.virtualInput = new Uint8Array(5);

    this.telemetry = {
      connected: false,
      sensorySpikes: 0,
      centralSpikes: 0,
      motorSpikesLeft: 0,
      motorSpikesRight: 0,
      giantFiberSpikes: 0,
      engine: 'LOCAL_LIF'
    };

    this.lastPerception = {
      left_hazard: 0,
      right_hazard: 0,
      center_hazard: 0,
      yeti_proximity: 0,
      goal_bias: 0
    };

    this.initLocalSNN();
    this.connectWebSocket();
  }

  initLocalSNN() {
    this.vRest = -70.0;
    this.vThresh = -50.0;
    this.vReset = -75.0;
    this.tauM = 16.0;

    this.vSensory = new Float32Array(16).fill(this.vRest);
    this.vCentral = new Float32Array(32).fill(this.vRest);
    this.vMotor = new Float32Array(8).fill(this.vRest);

    this.refrSensory = new Int32Array(16);
    this.refrCentral = new Int32Array(32);
    this.refrMotor = new Int32Array(8);

    this.synCentral = new Float32Array(32);
    this.synMotor = new Float32Array(8);
    this.iSens = new Float32Array(16); // Pre-allocated buffer for 60Hz zero-allocation
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

  update(dt, rival, yeti, world) {
    if (!this.enabled || !rival) return;

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

        if (block.flags && !nextGate) {
          for (let i = 0; i < block.flags.length; i++) {
            const f = block.flags[i];
            if (f.active && !f.rivalCleared && f.d >= rival.d && f.d <= maxD) {
              nextGate = f;
              break;
            }
          }
        }
      }
    }

    // Yeti Proximity (Compatible with Yeti.status and mock yeti.active)
    let yetiProximity = 0;
    const yetiActive = yeti && (yeti.status === 'chase' || yeti.status === 'warning' || yeti.active === true);
    if (yetiActive) {
      const distToYeti = Math.hypot(rival.x - yeti.x, rival.d - yeti.d);
      if (distToYeti < 45) {
        yetiProximity = Math.max(0, 1 - distToYeti / 45);
      }
    }

    let goalBias = 0;
    if (nextGate) {
      const dx = nextGate.x - rival.x;
      goalBias = clamp(dx / 5.0, -1, 1);
    }

    // Mutate in-place (zero allocation)
    this.lastPerception.left_hazard = clamp(leftHazard, 0, 1);
    this.lastPerception.right_hazard = clamp(rightHazard, 0, 1);
    this.lastPerception.center_hazard = clamp(centerHazard, 0, 1);
    this.lastPerception.yeti_proximity = clamp(yetiProximity, 0, 1);
    this.lastPerception.goal_bias = goalBias;

    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'perception',
        data: this.lastPerception
      }));
    } else {
      this.stepLocalSNN(this.lastPerception, dt);
    }

    this.virtualInput.fill(0);
    if (this.steer < -0.15) this.virtualInput[ACTION.LEFT] = 1;
    if (this.steer > 0.15) this.virtualInput[ACTION.RIGHT] = 1;
    if (this.turbo) this.virtualInput[ACTION.TURBO] = 1;
    if (this.brake) this.virtualInput[ACTION.BRAKE] = 1;
  }

  stepLocalSNN(p, dtSim) {
    const microTicks = 20;
    const dt = 1.0;
    let sensorySpikes = 0;
    let centralSpikes = 0;
    let motorLeftSpikes = 0;
    let motorRightSpikes = 0;
    let gfSpikes = 0;

    const iSens = this.iSens;
    for (let i = 0; i < 6; i++) {
      iSens[i] = (p.right_hazard * 110.0) + Math.max(0, -p.goal_bias * 50.0);
    }
    for (let i = 6; i < 12; i++) {
      iSens[i] = (p.left_hazard * 110.0) + Math.max(0, p.goal_bias * 50.0);
    }
    for (let i = 12; i < 16; i++) {
      iSens[i] = (p.center_hazard * 120.0) + (p.yeti_proximity * 140.0);
    }

    for (let step = 0; step < microTicks; step++) {
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

          const tgtStart = i < 6 ? 0 : (i < 12 ? 16 : 0);
          for (let c = tgtStart; c < tgtStart + 16; c++) {
            this.synCentral[c] += 16.0;
          }

          if (i < 6) {
            this.synMotor[0] += 14.0;
            this.synMotor[1] += 14.0;
          } else if (i < 12) {
            this.synMotor[2] += 14.0;
            this.synMotor[3] += 14.0;
          } else {
            this.synMotor[6] += 26.0;
            this.synMotor[7] += 26.0;
          }
        }
      }

      for (let i = 0; i < 32; i++) {
        this.synCentral[i] *= 0.88;
        if (this.refrCentral[i] > 0) {
          this.refrCentral[i]--;
          continue;
        }
        this.vCentral[i] += (-(this.vCentral[i] - this.vRest) + this.synCentral[i]) * (dt / 14.0);
        if (this.vCentral[i] >= this.vThresh) {
          this.vCentral[i] = this.vReset;
          this.refrCentral[i] = 2;
          centralSpikes++;
          if (i < 16) {
            this.synMotor[0] += 15.0;
            this.synMotor[1] += 15.0;
          } else {
            this.synMotor[2] += 15.0;
            this.synMotor[3] += 15.0;
          }
        }
      }

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
