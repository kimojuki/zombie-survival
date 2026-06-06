import { defineConfig } from 'vite';

export default defineConfig({
  root: 'apps/client',
  publicDir: 'public',
  build: {
    outDir: '../../build/client',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: 'apps/client/index.html',
        game: 'apps/client/game.html',
        armPreview: 'apps/client/arm-preview.html',
        modelsPreview: 'apps/client/models-preview.html',
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:3000',
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
