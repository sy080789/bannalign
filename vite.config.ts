/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // show "Update available" banner instead of silently staying stale
      includeAssets: ['icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'bannalign',
        short_name: 'bannalign',
        description: 'Our household, in one place.',
        start_url: '/',
        display: 'standalone',
        background_color: '#F5EFE6',
        theme_color: '#F5EFE6',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { navigateFallback: '/index.html', globPatterns: ['**/*.{js,css,html,svg,png}'] },
    }),
  ],
  test: { environment: 'node' },
})
