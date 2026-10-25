import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createKioskApi } from './kiosk-api.js';

// https://vitejs.dev/config/
export default defineConfig({
  // Emit relative asset paths so Electron can load dist/index.html over file://.
  // Absolute "/assets/..." only resolves when something is serving from a web root.
  base: './',
  plugins: [
    react(),
    {
      // Same /__kiosk/* backend the built kiosk serves, so `npm run dev` has
      // calendar, events, and photos too. No startup sync: on the kiosk machine
      // the running kiosk already owns that.
      name: 'kiosk-api',
      configureServer(server) {
        const api = createKioskApi({ syncPhotos: false });
        server.middlewares.use((req, res, next) => {
          if (!api(req, res)) next();
        });
      },
    },
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
