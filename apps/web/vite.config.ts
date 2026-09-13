import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const apiTarget = 'http://localhost:3000';
const proxy = {
  '/api': { target: apiTarget },
  '/uploads': { target: apiTarget },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true, proxy },
  preview: { port: 4173, proxy },
  build: { sourcemap: false, chunkSizeWarningLimit: 900 },
});
