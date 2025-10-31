import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  // Allow configuring the proxy target via environment variable
  // Usage: VITE_XNAT_PROXY_TARGET=https://mr-m8070.dev.xnatworks.io npm run dev
  const proxyTarget = process.env.VITE_XNAT_PROXY_TARGET || 'http://demo02.xnatworks.io';

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
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/xnat/, ''),
          secure: false, // Allow self-signed certificates in dev
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
              console.log('Target URL:', proxyTarget + proxyReq.path);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        },
      },
    },
  };
});
