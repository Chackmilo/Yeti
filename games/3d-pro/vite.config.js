import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: './',
  // assets/ de la raíz: Vite lo sirve en dev; en build no se copia (dist lo resuelve como ../../../assets/)
  publicDir: command === 'serve' ? '../../assets' : false,
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three']
        }
      }
    }
  }
}));
