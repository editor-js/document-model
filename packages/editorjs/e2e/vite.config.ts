import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname + '/fixtures',
  server: {
    port: 4173,
    strictPort: true,
  },
});
