/**
 * @file HUD.js
 * @description Heads-Up Display manager for real-time telemetry, scoring, AI badges, and XAI diagnostics.
 */

export class HUD {
  constructor() {
    this.distance = document.getElementById('distance');
    this.speed = document.getElementById('speed');
    this.score = document.getElementById('score');
    this.yetiLabel = document.getElementById('yetiLabel');
    this.yetiDistance = document.getElementById('yetiDistance');
    this.energyText = document.getElementById('energyText');
    this.energyFill = document.getElementById('energyFill');
    this.debugText = document.getElementById('debugText');
    this.banner = document.getElementById('banner');
    this.aiBadge = document.getElementById('aiBadge');
    this.ddaBadge = document.getElementById('ddaBadge');
    this.aiBadges = document.getElementById('aiBadges');
    this.aiBtn = document.getElementById('aiBtn');
    this.time = 0;
    this.bannerTime = 0;
    this.format = new Intl.NumberFormat('es-ES');
  }

  announce(text, seconds = 3) {
    this.banner.textContent = text;
    this.banner.classList.remove('hidden');
    this.bannerTime = seconds;
  }

  clear() {
    this.bannerTime = 0;
    this.banner.classList.add('hidden');
  }

  tick(dt, active) {
    if (active && this.bannerTime > 0) {
      this.bannerTime -= dt;
      if (this.bannerTime <= 0) this.banner.classList.add('hidden');
    }
  }

  /**
   * Update HUD metrics at 10 Hz for minimal DOM thrashing.
   */
  update(dt, player, yeti, engine, state, debug, seed, collisions, telemetry, skierAI, dda) {
    this.time += dt;
    if (this.time < 0.1) return;
    this.time = 0;

    const value = this.format.format(Math.floor(player.d));
    if (this.distance.textContent !== value) this.distance.textContent = value;

    const speed = String(Math.round(player.speed * 3.6));
    if (this.speed.textContent !== speed) this.speed.textContent = speed;

    if (this.score) {
      const sc = this.format.format(player.score || 0);
      if (this.score.textContent !== sc) this.score.textContent = sc;
    }

    const active = yeti.status === 'chase' || yeti.status === 'warning' || yeti.status === 'caught';
    this.yetiLabel.textContent = active ? 'EL YETI ESTÁ A' : yeti.status === 'gone' ? '¡YETI BURLADO!' : 'EL YETI APARECE EN';
    this.yetiDistance.textContent = yeti.status === 'gone' ? '—' : String(Math.max(0, active ? Math.round(player.d - yeti.d) : Math.ceil(yeti.next - player.d)));
    const gap = Math.max(0, player.d - yeti.d);
    const viewport = document.getElementById('viewport');
    if (viewport) {
      if (active && gap < 60) {
        const a = Math.min(0.65, 0.2 + (60 - gap) / 70);
        viewport.style.boxShadow = `inset 0 0 55px rgba(239, 68, 68, ${a.toFixed(2)})`;
      } else {
        viewport.style.boxShadow = 'none';
      }
    }

    this.energyText.textContent = player.mode === 'classic' ? '∞' : Math.round(player.energy * 100) + '%';
    this.energyFill.style.transform = 'scaleX(' + player.energy + ')';
    this.energyFill.style.background = player.mode === 'classic' ? '#5fe6ff' : (player.energy < 0.23 ? '#ff9a79' : '#8ef4d0');

    // AI Badges & Pilot status
    if (this.aiBadge && skierAI) {
      if (skierAI.mode === 'AUTOPILOT') {
        this.aiBadge.textContent = '🤖 PILOTO IA: ACTIVO';
        this.aiBadge.className = 'ai-badge autopilot';
        if (this.aiBtn) this.aiBtn.textContent = '🤖 IA: AUTO';
      } else if (skierAI.mode === 'CO_PILOT') {
        this.aiBadge.textContent = '🛡️ CO-PILOTO IA: ON';
        this.aiBadge.className = 'ai-badge copilot';
        if (this.aiBtn) this.aiBtn.textContent = '🛡️ IA: CO-PILOT';
      } else {
        this.aiBadge.textContent = 'PILOTO: HUMANO';
        this.aiBadge.className = 'ai-badge';
        if (this.aiBtn) this.aiBtn.textContent = '🤖 IA: OFF';
      }
    }

    if (this.ddaBadge && dda) {
      const stateName = dda.state === 'SURGE' ? 'INTENSO' : dda.state === 'RELIEF' ? 'ALIVIO' : 'BALANCE';
      this.ddaBadge.textContent = `DDA: ${stateName} (${dda.yetiSpeedMod.toFixed(2)}x)`;
      this.ddaBadge.className = 'ai-badge dda ' + (dda.state === 'SURGE' ? 'dda-surge' : dda.state === 'RELIEF' ? 'dda-relief' : '');
    }

    // Diagnostics & Explainable AI (XAI)
    if (debug && this.debugText) {
      const baseDiag = Math.round(engine.fps) + ' FPS · ' + engine.renderer.info.render.calls + ' draws\n' +
        'Estado: ' + state + '\n' +
        'Yeti Estado: ' + yeti.status + ' (' + (yeti.ai ? yeti.ai.currentBehavior : 'NA') + ')\n' +
        'Metros: ' + Math.floor(player.d) + '\n' +
        'Semilla: ' + seed + '\n' +
        'DPR: ' + engine.renderer.getPixelRatio().toFixed(2) + ' · ' + (engine.lowQuality ? 'ligera' : 'alta') + '\n' +
        'Candidatos CCD: ' + collisions.candidates;

      const aiSummary = telemetry ? '\n\n' + telemetry.getFormattedSummary() : '';
      this.debugText.textContent = baseDiag + aiSummary;
    }
  }
}
