import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // Emit relative asset paths so Electron can load dist/index.html over file://.
  // Absolute "/assets/..." only resolves when something is serving from a web root.
  base: './',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
