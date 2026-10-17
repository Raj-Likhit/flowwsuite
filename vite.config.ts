/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import viteCompression from 'vite-plugin-compression'

const asyncScriptPlugin = () => ({
  name: 'async-script',
  transformIndexHtml(html: string) {
    return html.replace(/<script type="module"/g, '<script type="module" async');
  }
});

// https://vite.dev/config/
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
    coverage: {
      provider: 'v8',
      // @ts-expect-error - 'all' option is valid for v8 coverage provider
      all: true,
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/main.tsx', 'src/**/*.d.ts', 'src/vite-env.d.ts', 'src/**/*.test.*', 'src/**/*.types.ts', 'src/**/types.ts']
    }
  },
  plugins: [
    react(),
    asyncScriptPlugin(),
    viteCompression(),
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
      },
      workbox: {
        importScripts: ['/sw-custom.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.dicebear\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'dicebear-avatars',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/(?:cmaps|standard_fonts)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdfjs-assets',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  server: {
    // Restrict dev server to localhost (prevents LAN file-read exposure)
    host: false,
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
            if (id.includes('pdf-lib')) return 'pdf-lib';
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'jspdf';
            if (id.includes('pdfjs-dist')) return 'pdfjs';
            if (id.includes('jszip')) return 'jszip';
            if (id.includes('@dnd-kit')) return 'dnd-kit';
            if (id.includes('framer-motion')) return 'framer-motion';
            if (id.includes('supabase')) return 'supabase';
            // Everything else goes to the default vendor/app chunks
          }
        }
      }
    }
  }
})
