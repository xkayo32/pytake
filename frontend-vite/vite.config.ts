import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    port: 3000,
    host: true,
    strictPort: true,
    allowedHosts: [
      'app.pytake.net',
      'localhost',
      '127.0.0.1',
      '.pytake.net', // Permite todos os subdomínios de pytake.net
    ],
  },
})
