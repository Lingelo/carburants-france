import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // manifest:false → keep public/manifest.webmanifest as the source of truth.
    // base & scope are auto-inherited from Vite's `base` setting.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [
          /^\/carburants-france\/data\//,
          /^\/carburants-france\/unregister-sw\.html$/,
        ],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 10 },
            },
          },
          {
            urlPattern: /\/carburants-france\/data\/.*\.json$/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  base: '/carburants-france/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
