import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/xnat': {
        target: 'http://demo02.xnatworks.io', // Default XNAT demo server
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/xnat/, ''),
      },
    },
  },
})
