import test from 'node:test';
import assert from 'node:assert/strict';
import { patchHtml } from '../scripts/patch-html.js';

const VITE_HTML = `<!DOCTYPE html>
<html><head>
<script type="module" crossorigin src="./assets/index-AbCdEf12.js"></script>
<link rel="modulepreload" crossorigin href="./assets/three-XyZ12345.js">
<link rel="stylesheet" crossorigin href="./assets/index-QwErTy12.css">
</head><body></body></html>`;

test('Postbuild: un solo CSS enlazado sin crossorigin y sin copia inline', () => {
  const html = patchHtml(VITE_HTML);
  assert.match(html, /<link rel="stylesheet" href="\.\/assets\/index-QwErTy12\.css">/);
  assert.doesNotMatch(html, /<style>/);
});

test('Postbuild: ESM y modulepreload solo por http; IIFE en file://', () => {
  const html = patchHtml(VITE_HTML);
  assert.doesNotMatch(html, /<script type="module"/);
  assert.doesNotMatch(html, /<link rel="modulepreload"/);
  assert.match(html, /location\.protocol === 'file:'/);
  assert.match(html, /\.\/assets\/app\.iife\.js/);
  assert.match(html, /"\.\/assets\/index-AbCdEf12\.js"/);
  assert.match(html, /\["\.\/assets\/three-XyZ12345\.js"\]/);
});

test('Postbuild: falla con un mensaje claro si cambia el formato de Vite', () => {
  assert.throws(() => patchHtml('<html><head></head></html>'), /no se encontró el script ESM/);
});
