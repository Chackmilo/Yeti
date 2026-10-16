import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: './',
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
