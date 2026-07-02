import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, '../..')],
    },
  },
  optimizeDeps: {
    exclude: [
      '@editorjs/ui',
      '@editorjs/core',
    ]
  },
  build: {
    rollupOptions: {
      external: [
        '@editorjs/ui',
        '@editorjs/core',
      ]
    }
  }
})
