import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['unintensive-precosmic-latia.ngrok-free.dev'],
    proxy: {
      '/wa-api': {
        target: 'https://wa-slilg.avlokai.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/wa-api/, ''),
      },
    },
  },
})
