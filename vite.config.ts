import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// GitHub Pages はプロジェクトサイトを /<repo>/ 配下で配信するため base が必要。
// 環境変数 VITE_BASE で上書き可（ローカルや独自ドメインでは '/' を渡す）。
const base = process.env.VITE_BASE ?? '/Calender/';

// PWA + Service Worker 設定。
// autoUpdate + workbox により、新しい SW が出たら待機状態になり、
// UpdateService 側で skipWaiting / controllerchange を扱う。
export default defineConfig({
  base,
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null, // 登録は src/services/update/UpdateService.ts で明示的に行う
      manifest: {
        name: 'calender',
        short_name: 'calender',
        description: '彼氏とレベッカの2人用共有カレンダー',
        theme_color: '#7c6cf0',
        background_color: '#faf8ff',
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
        icons: [
          // base 配下の public/icons を指す相対パス（先頭スラッシュ無し）。
          { src: 'icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: 'icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
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
