import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '../dist');
const htmlPath = resolve(distDir, 'index.html');

let html = readFileSync(htmlPath, 'utf8');

// Find generated CSS file
const cssMatch = html.match(/href="(\.\/assets\/index-[^"]+\.css)"/);
let cssContent = '';
if (cssMatch) {
  const cssPath = resolve(distDir, cssMatch[1]);
  try {
    cssContent = readFileSync(cssPath, 'utf8');
  } catch {}
}

// Remove crossorigin from CSS link to allow loading via file:/// protocol in Chrome
html = html.replace(/<link rel="stylesheet" crossorigin href="(\.\/assets\/index-[^"]+\.css)">/, '<link rel="stylesheet" href="$1">');

// Inject inline CSS fallback and universal script loader (file:/// IIFE + http:// ESM)
const injection = `
  <style>
  /* Fallback de estilo inline para compatibilidad nativa con protocolo file:/// */
  ${cssContent}
  </style>
  <script>
  (function() {
    var s = document.createElement('script');
    if (location.protocol === 'file:') {
      s.src = './assets/app.iife.js';
    } else {
      s.type = 'module';
      s.crossOrigin = '';
      s.src = document.querySelector('meta[data-module]')?.getAttribute('data-module') || './assets/app.iife.js';
    }
    document.head.appendChild(s);
  })();
  </script>
`;

// Replace the existing module script with data-module reference so it doesn't execute twice on http
html = html.replace(/<script type="module" crossorigin src="(\.\/assets\/index-[^"]+\.js)"><\/script>/, `<meta data-module="$1">`);

// Inject into <head>
html = html.replace('</head>', `${injection}\n</head>`);

writeFileSync(htmlPath, html, 'utf8');
console.log('✓ postbuild: dist/index.html parcheado para soporte universal (file:/// y http://)');
