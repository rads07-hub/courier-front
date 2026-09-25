import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/cotizar': { target: 'https://localhost:7250', changeOrigin: true, secure: false },
      '/confirmar': { target: 'https://localhost:7250', changeOrigin: true, secure: false },
      '/envio': { target: 'https://localhost:7250', changeOrigin: true, secure: false },
    },
  },
})
