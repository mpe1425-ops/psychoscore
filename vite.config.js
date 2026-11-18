import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  base: './', // работает под любым именем репозитория на GitHub Pages
  plugins: [VitePWA({
    registerType: 'autoUpdate',
    manifest: { name: 'ПсихоСкор', short_name: 'ПсихоСкор', lang: 'ru', display: 'standalone',
      theme_color: '#14213d', background_color: '#14213d', start_url: './#app', scope: './',
      icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }] },
    workbox: { globPatterns: ['**/*.{js,css,html,png,svg}'] } })],
  test: { environment: 'node' },
});
