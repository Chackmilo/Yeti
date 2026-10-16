import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { patchHtml } from './patch-html.js';

const htmlPath = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/index.html');
writeFileSync(htmlPath, patchHtml(readFileSync(htmlPath, 'utf8')), 'utf8');
console.log('✓ postbuild: dist/index.html listo para file:/// (IIFE) y http:// (ESM)');
