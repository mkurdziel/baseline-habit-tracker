import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'startup-message',
      configureServer(server) {
        server.httpServer?.once('listening', () => {
          const port = 5173;
          console.log(`\n🎨 Web App ready at http://localhost:${port}`);
          console.log(`   API proxied from http://localhost:3001\n`);
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying request:', req.method, req.url, '→', proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Proxy response:', req.method, req.url, '←', proxyRes.statusCode);
          });
        },
      },
    },
  },
});
