import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// GitHub Pages serves the site from /<repo-name>/. The deploy workflow sets
// BASE_PATH from the repository name so this works no matter what the repo is
// called; locally (and for a user/org pages site) it falls back to "/".
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // The app registers the worker itself (PwaGate) so it can surface an
      // "update ready" prompt instead of swapping code under the user.
      injectRegister: null,
      registerType: 'prompt',

      // A hand-written worker (src/sw.ts) instead of a generated one: only
      // that way can it handle `push` and `notificationclick` for reminders.
      // Offline navigation and the Supabase denylist live there now too.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',

      // public/manifest.webmanifest is hand-maintained and already linked from
      // index.html with relative paths, which survive any base. Letting the
      // plugin generate a second one would put two manifests on the page.
      manifest: false,

      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],

        // The Supabase chunk is ~230 kB uncompressed; the default 2 MiB cap
        // is fine, but be explicit so a future asset does not silently drop
        // out of the precache.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },

      devOptions: {
        // Off in dev: a service worker caching a Vite dev server is a reliable
        // way to spend an afternoon debugging stale modules.
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
