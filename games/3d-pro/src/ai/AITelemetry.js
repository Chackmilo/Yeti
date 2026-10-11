/**
 * @file AITelemetry.js
 * @description Real-time AI Observability, Telemetry, and Explainable AI (XAI) manager.
 * Captures decision latencies, Behavior Tree transitions, potential fields, and DDA states.
 */

export class AITelemetry {
  constructor() {
    this.reset();
  }

  reset() {
    this.lastBTNode = 'NONE';
    this.lastBTStatus = 'NONE';
    this.btHistory = [];
    this.decisionHistory = [];
    this.yetiBehavior = 'SLEEP';
    this.yetiTarget = { x: 0, d: 0 };
    this.yetiAvoidance = { x: 0, d: 0 };
    this.whiskerHits = [false, false, false, false, false];
    this.pounceCooldown = 0;
    this.pounceActive = false;

    // Skier Agent Telemetry
    this.skierMode = 'OFF'; // 'OFF' | 'AUTOPILOT' | 'CO_PILOT'
    this.skierTarget = null;
    this.skierPlannedAngle = 0;
    this.skierUtilityScore = 0;
    this.skierImminentHazard = false;

    // DDA Telemetry
    this.flowIndex = 0; // -1 (frustration) to +1 (boredom), 0 = flow
    this.playerSkill = 0.5; // 0 to 1
    this.ddaStateName = 'BALANCE';
    this.yetiSpeedMod = 1.0;
    this.nearMissCount = 0;
    this.totalPouncesDodged = 0;

    // Drosophila Fly-Brain Telemetry
    this.flyActive = false;
    this.flyTelemetry = null;

    // Profiling
    this.aiTickTimeMs = 0;
    this.totalTicks = 0;
  }

  recordBTNode(nodeName, status) {
    this.lastBTNode = nodeName;
    this.lastBTStatus = status;
    if (this.btHistory.length > 20) this.btHistory.shift();
    this.btHistory.push({ node: nodeName, status, time: performance.now() });
  }

  recordYetiDecision({ behavior, target, avoidance, whiskers, pounceCooldown, pounceActive }) {
    this.yetiBehavior = behavior;
    if (target) {
      this.yetiTarget.x = target.x;
      this.yetiTarget.d = target.d;
    }
    if (avoidance) {
      this.yetiAvoidance.x = avoidance.x;
      this.yetiAvoidance.d = avoidance.d;
    }
    if (whiskers) {
      this.whiskerHits = whiskers;
    }
    this.pounceCooldown = pounceCooldown ?? this.pounceCooldown;
    this.pounceActive = Boolean(pounceActive);
  }

  recordSkierAgent({ mode, plannedAngle, utilityScore, imminentHazard, target }) {
    this.skierMode = mode;
    this.skierPlannedAngle = plannedAngle;
    this.skierUtilityScore = utilityScore;
    this.skierImminentHazard = imminentHazard;
    this.skierTarget = target;
  }

  recordDDA({ flowIndex, playerSkill, stateName, speedMod }) {
    this.flowIndex = flowIndex;
    this.playerSkill = playerSkill;
    this.ddaStateName = stateName;
    this.yetiSpeedMod = speedMod;
  }

  recordNearMiss() {
    this.nearMissCount++;
  }

  recordPounceDodged() {
    this.totalPouncesDodged++;
  }

  recordFlyBrain(telemetry, active) {
    this.flyActive = active;
    this.flyTelemetry = telemetry;
  }

  /**
   * Generates a concise diagnostic summary formatted for HUD / Debug displays.
   */
  getFormattedSummary() {
    const yTargetDist = Math.hypot(this.yetiTarget.x, this.yetiTarget.d);
    const flyInfo = this.flyActive && this.flyTelemetry
      ? `[AI DROSOPHILA SNN] Motor: ${this.flyTelemetry.engine} (${this.flyTelemetry.connected ? 'WS ONLINE' : 'LOCAL'})\n` +
        `  Spikes: S:${this.flyTelemetry.sensorySpikes} | C:${this.flyTelemetry.centralSpikes} | M_L:${this.flyTelemetry.motorSpikesLeft} | M_R:${this.flyTelemetry.motorSpikesRight} | GF:${this.flyTelemetry.giantFiberSpikes}`
      : '[AI DROSOPHILA] Inactivo (Pulsa "B" para invocar rival)';

    return [
      `[AI YETI] BT: ${this.lastBTNode} (${this.yetiBehavior})`,
      `  Radar: [${this.whiskerHits.map(h => h ? '█' : '░').join('')}] Avoidance: (${this.yetiAvoidance.x.toFixed(1)}, ${this.yetiAvoidance.d.toFixed(1)})`,
      `  Pounce: ${this.pounceActive ? 'LEAPING!' : (this.pounceCooldown <= 0 ? 'READY' : this.pounceCooldown.toFixed(1) + 's')}`,
      `[AI SKIER] Modo: ${this.skierMode} | Steer: ${(this.skierPlannedAngle * (180 / Math.PI)).toFixed(0)}° | Utility: ${this.skierUtilityScore.toFixed(0)}`,
      `  Alerta Peligro: ${this.skierImminentHazard ? '⚠️ INMINENTE' : 'DESPEJADO'}`,
      `[DDA FLOW] Estado: ${this.ddaStateName} (${(this.flowIndex > 0 ? '+' : '') + this.flowIndex.toFixed(2)}) | Skill: ${(this.playerSkill * 100).toFixed(0)}% | Mod Yeti: ${this.yetiSpeedMod.toFixed(2)}x`,
      `  Esquivas límite: ${this.nearMissCount} | Saltos esquivados: ${this.totalPouncesDodged}`,
      flyInfo
    ].join('\n');
  }
}
