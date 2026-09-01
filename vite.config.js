import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192.svg', 'pwa-512.svg'],
      manifest: {
        name: 'Hradník',
        short_name: 'Hradník',
        description: 'Moje mapa, katalog a deník hradů, zámků a zřícenin.',
        theme_color: '#7657ff',
        background_color: '#f4f5f9',
        display: 'standalone',
        lang: 'cs',
        icons: [
          { src: '/pwa-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/pwa-512.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp}']
      }
    })
  ]
})
