import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(ROOT, path), 'utf8');

const PAGES = ['index.html', 'games/2d-retro/index.html', 'games/3d-standalone/index.html', 'games/3d-pro/index.html'];
const EDITIONS = ['games/2d-retro/index.html', 'games/3d-standalone/index.html', 'games/3d-pro/index.html'];
const REF = /\b(?:src|href|poster|data-full)="([^"]*)"/g;
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;
const GENERATED = /(?:^|\/)games\/3d-pro\/dist\//;

test('Suite: las páginas solo enlazan archivos locales relativos que existen', () => {
  const problems = [];
  for (const page of PAGES) {
    for (const [, raw] of read(page).matchAll(REF)) {
      const ref = raw.split(/[?#]/)[0];
      if (!ref || EXTERNAL.test(raw) || GENERATED.test(ref)) continue;
      if (page === 'games/3d-pro/index.html' && ref.startsWith('/src/')) {
        if (!existsSync(resolve(ROOT, 'games/3d-pro', '.' + ref))) problems.push(`${page}: no existe ${raw}`);
        continue;
      }
      if (ref.startsWith('/')) {
        problems.push(`${page}: ruta absoluta ${raw} (rompe file:// y subrutas)`);
        continue;
      }
      if (!existsSync(resolve(ROOT, dirname(page), ref))) problems.push(`${page}: no existe ${raw}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('Suite: nginx solo marca immutable los bundles con hash y no pierde cabeceras de seguridad', () => {
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

test('Suite: la alerta de proximidad usa una capa visible en las tres ediciones', () => {
  for (const page of EDITIONS) {
    const html = read(page);
    assert.match(html, /id="yetiAlert"/, `${page}: falta la capa #yetiAlert`);
    assert.doesNotMatch(html, /boxShadow\s*=\s*[`'"]inset/, `${page}: box-shadow inset queda bajo el canvas opaco`);
  }
});

test('Suite: cada medio existe una sola vez y los originales quedan fuera del despliegue', () => {
  assert.equal(existsSync(resolve(ROOT, 'games/3d-pro/public')), false, 'games/3d-pro/public duplica assets/');
  assert.deepEqual(readdirSync(ROOT).filter(f => /\.(?:mp4|webm|jpe?g|png)$/i.test(f)), [],
    'medios sueltos en la raíz: muévelos a art/ o docs/screenshots/');
});
