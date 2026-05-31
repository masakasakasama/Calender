import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// PWA + Service Worker 設定。
// autoUpdate + workbox により、新しい SW が出たら待機状態になり、
// UpdateService 側で skipWaiting / controllerchange を扱う。
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null, // 登録は src/services/update/UpdateService.ts で明示的に行う
      manifest: {
        name: 'Couple Calendar',
        short_name: 'Couple',
        description: '彼氏とレベッカの2人用共有カレンダー',
        theme_color: '#7c6cf0',
        background_color: '#faf8ff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
});
