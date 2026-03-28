import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    headers: {
      // Required for SharedArrayBuffer (FFmpeg.wasm multi-threaded mode)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    // FFmpeg ships native ESM — exclude from Vite's CommonJS pre-bundling
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Passinho – Dance Class Tracker',
        short_name: 'Passinho',
        description: 'Track your dance class packages beautifully',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0a0a0f',
        theme_color: '#7c3aed',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/open\.er-api\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'exchange-rates',
              expiration: { maxAgeSeconds: 86400, maxEntries: 5 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
})
