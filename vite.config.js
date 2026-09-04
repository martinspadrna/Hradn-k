import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'pwa-192.svg', 'pwa-512.svg', 'hradnik-app-icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Hradník',
        short_name: 'Hradník',
        description: 'Osobní katalog a deník českých hradů, zámků, zřícenin a dalších historických míst.',
        theme_color: '#080b0e',
        background_color: '#080b0e',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'cs',
        icons: [
          { src: '/pwa-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: '/pwa-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp}']
      }
    })
  ]
})
