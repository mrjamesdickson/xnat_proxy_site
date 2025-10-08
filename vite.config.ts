import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    base: isBuild ? '/morpheus/' : '/',
    build: {
      outDir: isBuild ? 'dist/morpheus' : 'dist',
      emptyOutDir: true,
    },
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
  };
});
