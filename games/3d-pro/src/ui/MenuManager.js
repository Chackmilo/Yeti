/**
 * @file MenuManager.js
 * @description Manages UI views, difficulty modes, settings, audio toggles, and AI Autopilot controls.
 */
/** Carpeta assets/ compartida de la suite: Vite la sirve en dev (publicDir); en dist se resuelve desde games/3d-pro/dist/. */
export const SUITE_ASSETS = import.meta.env?.DEV ? '/' : '../../../assets/';

/** Marca un botón de un radiogroup como seleccionado (clase visual + aria-checked). */
export function selectRadio(buttons, selected) {
  for (const o of buttons) {
    o.classList.toggle('selected', o === selected);
    o.setAttribute('aria-checked', String(o === selected));
  }
}

export class MenuManager {
  constructor(storage, handlers) {
    this.storage = storage;
    this.mode = 'classic';
    this.spawnAt = 500;
    this.debug = false;
    this.handlers = handlers;
    this.quality = document.getElementById('quality');
    this.format = new Intl.NumberFormat('es-ES');

    this.elements = {};
    const ids = [
      'menu', 'pause', 'over', 'hud', 'energy', 'aiBadges', 'touch', 'helpBadge',
      'debug', 'record', 'modeDesc', 'results', 'audioMenu', 'sound', 'debugMenu',
      'aiMenu', 'aiBtn', 'toggleAiPilot'
    ];
    for (const id of ids) this.elements[id] = document.getElementById(id);

    this.modeButtons = Array.from(document.querySelectorAll('#modes button'));
    this.distanceButtons = Array.from(document.querySelectorAll('#distances button'));

    for (const b of this.modeButtons) {
      b.onclick = () => {
        this.mode = b.dataset.mode;
        selectRadio(this.modeButtons, b);
        this.sync();
      };
    }

    for (const b of this.distanceButtons) {
      b.onclick = () => {
        this.spawnAt = Number(b.dataset.distance);
        selectRadio(this.distanceButtons, b);
      };
    }

    this.clicks = {
      play: handlers.start,
      replay: handlers.start,
      restartPause: handlers.start,
      resume: handlers.pause,
      pauseBtn: handlers.pause,
      menuPause: handlers.menu,
      menuOver: handlers.menu,
      audioMenu: handlers.sound,
      sound: handlers.sound,
      debugMenu: handlers.debug,
      summon: handlers.summon,
      refill: handlers.refill,
      aiMenu: handlers.toggleAi,
      aiBtn: handlers.toggleAi,
      toggleAiPilot: handlers.toggleAi
    };

    for (const id in this.clicks) {
      const el = document.getElementById(id);
      if (el) el.onclick = this.clicks[id];
    }

    if (this.quality) {
      this.quality.onchange = () => handlers.quality(this.quality.value);
    }

    const avatar = document.getElementById('menuAvatar');
    if (avatar) avatar.src = SUITE_ASSETS + 'otter_3d_coffee.jpg';

    this.sync();
  }

  sync() {
    if (this.elements.record) {
      this.elements.record.textContent = 'Récord ' + (this.mode === 'classic' ? 'clásico' : 'moderno') + ': ' + this.format.format(this.storage.record(this.mode)) + ' m';
    }
    if (this.elements.modeDesc) {
      this.elements.modeDesc.textContent = this.mode === 'classic'
        ? 'Modo Clásico: Turbo ilimitado con inercia a alta velocidad (76% autoridad de giro). Slalom otorga velocidad y combos.'
        : 'Modo Moderno: Barra de estamina táctica (6 s). Slalom recarga +25% de energía.';
    }
  }

  show(state) {
    for (const id of ['menu', 'pause', 'over']) {
      if (this.elements[id]) this.elements[id].classList.toggle('hidden', state !== id);
    }
    for (const id of ['hud', 'energy', 'aiBadges', 'helpBadge']) {
      if (this.elements[id]) this.elements[id].classList.toggle('hidden', state === 'menu');
    }
    if (this.elements.touch) {
      this.elements.touch.classList.toggle('hidden', state !== 'playing');
    }
  }

  setDebug(enabled) {
    this.debug = enabled;
    if (this.elements.debug) this.elements.debug.classList.toggle('hidden', !enabled);
    if (this.elements.debugMenu) this.elements.debugMenu.textContent = 'Debug: ' + (enabled ? 'sí' : 'no');
  }

  sound(enabled) {
    if (this.elements.audioMenu) this.elements.audioMenu.textContent = 'Sonido: ' + (enabled ? 'activado' : 'desactivado');
    if (this.elements.sound) {
      this.elements.sound.textContent = enabled ? '♪' : '×♪';
      this.elements.sound.setAttribute('aria-pressed', String(enabled));
    }
  }

  updateAi(mode) {
    const text = mode === 'AUTOPILOT' ? 'Piloto IA: AUTO' : mode === 'CO_PILOT' ? 'Piloto IA: CO-PILOT' : 'Piloto IA: OFF';
    if (this.elements.aiMenu) this.elements.aiMenu.textContent = text;
    if (this.elements.aiBtn) this.elements.aiBtn.textContent = mode === 'AUTOPILOT' ? '🤖 IA: AUTO' : mode === 'CO_PILOT' ? '🛡️ IA: CO-PILOT' : '🤖 IA: OFF';
  }

  results(distance, record, isNew, score = 0, gates = 0, stunts = 0) {
    if (this.elements.results) {
      this.elements.results.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0;background:rgba(12,43,58,0.75);padding:14px;border-radius:14px;border:1px solid rgba(140,233,255,0.2);text-align:left;">
          <div>
            <div style="color:#8ce9ff;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Puntos Totales</div>
            <div style="font-size:22px;font-weight:900;color:#ffffff;font-variant-numeric:tabular-nums;">${this.format.format(Math.floor(score))}</div>
          </div>
          <div>
            <div style="color:#8ce9ff;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Descenso</div>
            <div style="font-size:22px;font-weight:900;color:#ffffff;font-variant-numeric:tabular-nums;">${this.format.format(Math.floor(distance))} m</div>
          </div>
          <div style="grid-column:span 2;border-top:1px solid rgba(255,255,255,0.1);padding-top:10px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="color:#ffeaa1;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Récord Personal (${this.mode === 'classic' ? 'CLÁSICO' : 'MODERNO'})</div>
              <div style="font-size:20px;font-weight:900;color:#ffeaa1;font-variant-numeric:tabular-nums;">${this.format.format(record)} m</div>
            </div>
            ${isNew ? '<span style="background:#f59e0b;color:#000;font-weight:900;font-size:11px;padding:3px 8px;border-radius:6px;letter-spacing:1px;">¡NUEVO RÉCORD!</span>' : ''}
          </div>
          <div style="grid-column:span 2;display:flex;gap:14px;font-size:11px;color:#cbd5e1;border-top:1px solid rgba(255,255,255,0.08);padding-top:8px;">
            <span>🚩 Slaloms: <b style="color:#5fe6ff;">${gates}</b></span>
            <span>🏂 Acrobacias 360°: <b style="color:#5fe6ff;">${stunts}</b></span>
          </div>
        </div>
      `;
    }
  }

  dispose() {
    for (const id in this.clicks) {
      const el = document.getElementById(id);
      if (el) el.onclick = null;
    }
    for (const b of this.modeButtons) b.onclick = null;
    for (const b of this.distanceButtons) b.onclick = null;
    if (this.quality) this.quality.onchange = null;
  }
}
