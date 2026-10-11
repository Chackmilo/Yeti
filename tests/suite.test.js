// tests/suite.test.js
// Guardias de coherencia de toda la suite: portal + 3 ediciones + infraestructura.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(ROOT, path), 'utf8');

const PAGES = ['index.html', 'games/2d-retro/index.html', 'games/3d-standalone/index.html', 'games/3d-pro/index.html'];
const EDITIONS = ['games/2d-retro/index.html', 'games/3d-standalone/index.html', 'games/3d-pro/index.html'];
const REF = /\b(?:src|href|poster|data-full)="([^"]*)"/g;
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;
const GENERATED = /(?:^|\/)games\/3d-pro\/dist\//;
// Oráculo: archivos versionados o versionables (incluye nuevos sin añadir; excluye lo ignorado, como art/ y dist/).
// Perezoso (git solo corre dentro de los tests) y con -z (sin comillas octales en nombres no ASCII).
let shippable;
const shippableFiles = () => (shippable ??= execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' })
  .split('\0').filter(Boolean));
const isShippable = rel => shippableFiles().includes(rel) || shippableFiles().some(f => f.startsWith(rel.endsWith('/') ? rel : rel + '/'));

test('Suite: las páginas solo enlazan archivos locales relativos que se despliegan', () => {
  const problems = [];
  for (const page of PAGES) {
    let refs = 0;
    for (const [, raw] of read(page).matchAll(REF)) {
      refs++;
      const ref = decodeURIComponent(raw.split(/[?#]/)[0]);
      if (!ref || EXTERNAL.test(raw) || GENERATED.test(ref)) continue;
      const viteSource = page === 'games/3d-pro/index.html' && ref.startsWith('/src/');
      if (ref.startsWith('/') && !viteSource) {
        problems.push(`${page}: ruta absoluta ${raw} (rompe file:// y subrutas)`);
        continue;
      }
      const target = viteSource ? resolve(ROOT, 'games/3d-pro', '.' + ref) : resolve(ROOT, dirname(page), ref);
      const rel = relative(ROOT, target).split(sep).join('/');
      if (!existsSync(target) || !isShippable(rel)) problems.push(`${page}: no existe o no se despliega ${raw}`);
    }
    assert.ok(refs > 0, `${page}: no se encontró ninguna referencia (¿cambió el formato de los atributos?)`);
  }
  assert.deepEqual(problems, []);
});

test('Suite: el Dockerfile solo copia rutas versionadas en git', () => {
  const sources = [...read('Dockerfile').matchAll(/^COPY (?!--from)(\S+) /gm)].map(m => m[1]);
  assert.ok(sources.length > 0, 'el Dockerfile debe copiar algo');
  const untracked = sources.filter(src =>
    execFileSync('git', ['ls-files', '--', src], { cwd: ROOT, encoding: 'utf8' }).trim() === '');
  assert.deepEqual(untracked, []);
});

test('Suite: nginx solo marca immutable los bundles con hash y no pierde cabeceras de seguridad', { todo: 'Tarea 6' }, () => {
  const blocks = [...read('nginx.conf').matchAll(/location\s+([^{]+)\{([^}]*)\}/g)]
    .map(([, where, body]) => ({ where: where.trim(), body }));
  const immutable = blocks.filter(b => b.body.includes('immutable'));
  assert.ok(immutable.length > 0, 'falta la regla immutable para los bundles de Vite');
  for (const b of immutable) assert.match(b.where, /games\/3d-pro\/dist\/assets/, `regla immutable demasiado amplia: ${b.where}`);
  for (const b of blocks.filter(b => b.body.includes('add_header'))) {
    assert.match(b.body, /X-Content-Type-Options/, `${b.where} anula las cabeceras de seguridad del server`);
    assert.match(b.body, /X-Frame-Options/, `${b.where} anula las cabeceras de seguridad del server`);
  }
});

test('Suite: la alerta de proximidad usa una capa visible en las tres ediciones', { todo: 'Tarea 4' }, () => {
  for (const page of EDITIONS) {
    const html = read(page);
    assert.match(html, /id="yetiAlert"/, `${page}: falta la capa #yetiAlert`);
    assert.doesNotMatch(html, /boxShadow\s*=\s*[`'"]inset/, `${page}: box-shadow inset queda bajo el canvas opaco`);
  }
});

test('Suite: cada medio existe una sola vez y los originales quedan fuera del despliegue', () => {
  assert.equal(existsSync(resolve(ROOT, 'games/3d-pro/public')), false, 'games/3d-pro/public duplica assets/');
  assert.deepEqual(readdirSync(ROOT).filter(f => /\.(?:mp4|webm|jpe?g)$/i.test(f)), [],
    'originales sueltos en la raíz: muévelos a art/');
  assert.ok(isShippable('assets/otter_3d_coffee.jpg'), 'falta el avatar compartido de 3D PRO en assets/');
});

test('Portal: prólogo ligero y accesible, galería operable con teclado', () => {
  const html = read('index.html');
  assert.match(html, /<div id="intro-modal" class="intro-modal-backdrop hidden"/, 'sin JS el modal no debe tapar el portal');
  assert.match(html, /<video id="intro-video"[^>]*preload="none"/);
  assert.match(html, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(html, /location\.hash === '#prologo'/);
  assert.match(html, /\.inert = true/);
  const cards = (html.match(/<article class="character-card"/g) || []).length;
  const buttons = (html.match(/<button type="button" class="character-zoom-hint">/g) || []).length;
  assert.ok(cards > 0 && buttons === cards, 'cada tarjeta necesita un botón "Ampliar" alcanzable con teclado');
});
