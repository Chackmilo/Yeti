/**
 * Parchea el index.html de Vite para que funcione igual en http(s):// (bundle ESM) y en file:/// (bundle IIFE).
 */
export function patchHtml(html) {
  const moduleSrc = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/)?.[1];
  if (!moduleSrc) throw new Error('postbuild: no se encontró el script ESM de Vite en index.html');
  const preloads = [...html.matchAll(/<link rel="modulepreload" crossorigin href="([^"]+)">/g)].map(m => m[1]);
  const loader = `<script>
  (function () {
    if (location.protocol === 'file:') {
      var s = document.createElement('script');
      s.src = './assets/app.iife.js';
      document.head.appendChild(s);
      return;
    }
    ${JSON.stringify(preloads)}.forEach(function (href) {
      var l = document.createElement('link');
      l.rel = 'modulepreload'; l.crossOrigin = ''; l.href = href;
      document.head.appendChild(l);
    });
    var m = document.createElement('script');
    m.type = 'module'; m.crossOrigin = ''; m.src = ${JSON.stringify(moduleSrc)};
    document.head.appendChild(m);
  })();
  </script>`;
  return html
    .replace(/<script type="module" crossorigin src="[^"]+"><\/script>\n?/, '')
    .replace(/<link rel="modulepreload" crossorigin href="[^"]+">\n?/g, '')
    .replace(/<link rel="stylesheet" crossorigin href="/g, '<link rel="stylesheet" href="')
    .replace('</head>', `${loader}\n</head>`);
}
