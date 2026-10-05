import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  resolve: {
    alias: {
      '@leai/domain': fileURLToPath(new URL('../../libs/domain/src/index.ts', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Cache só dos assets estáticos do app. NUNCA de requisições com texto/imagem/áudio.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [],
        navigateFallbackDenylist: [/^\/functions\//],
      },
      manifest: {
        name: 'LeAI',
        short_name: 'LeAI',
        description: 'Transforma o texto de uma foto em áudio, destacando cada palavra.',
        lang: 'pt-BR',
        display: 'standalone',
        theme_color: '#1d4ed8',
        background_color: '#ffffff',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
