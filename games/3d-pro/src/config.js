export const CONFIG = Object.freeze({
  halfWidth: 24,
  safeHalf: 4.2,            // 4.2 real, coincide con la spec certificada
  rowStep: 14,
  rowsPerBlock: 6,
  blockCount: 8,

  terrainLength: 48,
  terrainCount: 14,

  fixedDT: 1 / 60,
  maxSteps: 6,              // 6 * 1/60 = 100 ms de avance máximo
  maxAccumulator: 0.1,      // descarta por encima de esto

  normalSpeed: 20,
  turboSpeed: 35,
  turnAuthorityTurbo: 0.76,
  yetiSpeed: 24,
  escapeGap: 48,
  escapeTime: 3,
  warningTime: 1.8,
  nextYetiDistance: 600,
  alertRange: 65,           // radio de alerta del Yeti: latido de audio + viñeta visual

  shadowSize: 1024,
  trackCount: 720,
  particleCount: 650,
  trackLife: 8,

  colors: Object.freeze({
    sky: '#b7d9ed', fog: '#c3deed', ambient: '#c0d9ff', sun: '#fff1d0',
    snow: '#f0f8ff', pine: '#204e47', bark: '#685049', rock: '#7b8a9a',
    red: '#fc664d', navy: '#12374e', teal: '#3dc8c1', black: '#182932',
    skin: '#efb48e', white: '#fafaff', blue: '#397ee8', gold: '#ffca54'
  })
});

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp  = (a, b, t) => a + (b - a) * t;
export const damp  = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));

// Eje de pista — UNA sola definición canónica, la que documenta ARCHITECTURE.md
export function corridor(d) {
  return Math.sin(d * 0.009) * 11 + Math.sin(d * 0.023) * 6;
}

// Derivada, para el sesgo de pendiente lateral sin coste extra
export function corridorSlope(d) {
  return Math.cos(d * 0.009) * 11 * 0.009 + Math.cos(d * 0.023) * 6 * 0.023;
}

export function snowHeight(x, d) {
  return -d * 0.115
       + 0.55 * Math.sin(d * 0.041)
       + 0.22 * Math.sin(x * 0.16 + d * 0.025)
       + 0.10 * Math.cos(x * 0.32 - d * 0.08);
}

export const YETI_EVENT = Object.freeze({
  NONE: 0, WARNING: 1, STUMBLE: 2, ESCAPE: 3, CAPTURE: 4
});
export const YETIEVENT = YETI_EVENT;

// Invariante verificable por los tests: el corredor nunca puede
// ser más estrecho que el ancho transitable declarado.
export function assertConfigCoherent() {
  const errs = [];
  if (CONFIG.safeHalf * 2 >= CONFIG.halfWidth) {
    errs.push(`safeHalf (${CONFIG.safeHalf}) deja el corredor sin margen`);
  }
  if (!Number.isInteger(CONFIG.maxSteps) || CONFIG.maxSteps < 1) {
    errs.push('maxSteps debe ser entero >= 1');
  }
  if (Math.abs(CONFIG.maxSteps * CONFIG.fixedDT - CONFIG.maxAccumulator) > 1e-9) {
    errs.push('maxSteps * fixedDT debe igualar maxAccumulator');
  }
  return errs;
}
