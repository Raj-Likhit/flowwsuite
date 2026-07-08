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
    coverage: {
      provider: 'v8',
      // @ts-expect-error - 'all' option is valid for v8 coverage provider
      all: true,
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/main.tsx', 'src/**/*.d.ts', 'src/vite-env.d.ts', 'src/**/*.test.*', 'src/**/*.types.ts']
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
        importScripts: ['/sw-custom.js']
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
            if (id.includes('pdfjs-dist')) return 'pdfjs';
            if (id.includes('jszip')) return 'jszip';
            if (id.includes('@dnd-kit')) return 'dnd-kit';
            if (id.includes('@radix-ui')) return 'radix-ui';
            if (id.includes('date-fns')) return 'date-fns';
            if (id.includes('framer-motion')) return 'framer-motion';
            if (id.includes('supabase')) return 'supabase';
            // Everything else goes to the default vendor/app chunks
          }
        }
      }
    }
  }
})
