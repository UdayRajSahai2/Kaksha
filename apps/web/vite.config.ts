import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  // satellite.js 7 ships an optional threaded WASM build whose worker uses top-level await,
  // which needs ES-module workers. Kaksha's own propagation workers (week 6) are ES modules too.
  worker: { format: 'es' },
});
