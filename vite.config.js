import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Hradník',
        short_name: 'Hradník',
        description: 'Moje mapa, katalog a deník hradů, zámků a zřícenin.',
        theme_color: '#7657ff',
        background_color: '#f4f5f9',
        display: 'standalone',
        lang: 'cs',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp}'],
      }
    })
  ]
})
