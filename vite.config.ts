/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const asyncScriptPlugin = () => ({
  name: 'async-script',
  transformIndexHtml(html) {
    return html.replace(/<script type="module"/g, '<script type="module" async');
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    asyncScriptPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'FlowSuite',
        short_name: 'FlowSuite',
        description: 'Personal Productivity Suite',
        theme_color: '#0A0A0A',
        background_color: '#0A0A0A',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
  },
  worker: {
    format: 'es',
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('fabric')) return 'fabric';
            if (id.includes('pdf-lib') || id.includes('jspdf')) return 'pdf';
            if (id.includes('html2canvas')) return 'html2canvas';
            if (id.includes('supabase')) return 'supabase';
            // Everything else goes to the default vendor/app chunks
          }
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
  }
})
