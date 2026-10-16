## 🎯 Descripción del Cambio

<!-- Explica qué problema soluciona o qué funcionalidad agrega este Pull Request. -->

Closes #(issue)

---

## 🕹️ Tipo de Cambio

- [ ] 🚀 Nueva funcionalidad (`feat`)
- [ ] 🐛 Corrección de bug (`fix`)
- [ ] ⚡ Optimización de rendimiento / Zero-allocation (`perf`)
- [ ] 🧪 Tests nuevos o refactorizados (`test`)
- [ ] 📚 Documentación técnica (`docs`)
- [ ] 🧹 Refactorización de código (`refactor`)

---

## 🏔️ Ediciones y Componentes Afectados

- [ ] `games/3d-pro/` (Vite, Three.js r170, AI Suite)
- [ ] `games/3d-standalone/` (Three.js CDN standalone)
- [ ] `games/2d-retro/` (HTML5 Canvas 2D)
- [ ] `index.html` (Portal Hub)
- [ ] `experiments/fly-brain/` (Simulación SNN LIF)
- [ ] Infraestructura (Docker, Nginx, CI/CD)

---

## ✅ Lista de Verificación (Checklist de Calidad Senior)

- [ ] **Tests:** He ejecutado `npm test` y los 46 tests pasan sin errores (`0 failing`).
- [ ] **Build:** He ejecutado `npm run build` y el bundle compila sin advertencias críticas.
- [ ] **Zero-Allocation:** No he introducido instanciaciones de objetos (`new Vector3`, arrays) en el bucle principal (`update`/`fixedStep`).
- [ ] **Rutas Relativas:** No he utilizado rutas absolutas (`/assets/...`) que rompan el protocolo `file:///`.
- [ ] **Convención de Commits:** Los commits siguen el formato `tipo(scope): descripción` (Conventional Commits).
- [ ] **Documentación:** He actualizado la documentación (`docs/`, `README.md`) si corresponde.
