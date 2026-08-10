import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@nexus/form-engine': path.resolve(__dirname, '../core/src'),
      '@nexus/form-engine-ui': path.resolve(__dirname, '../ui/src'),
      '@nexus/form-engine-designer': path.resolve(__dirname, '../designer/src'),
      '@nexus/form-engine-react': path.resolve(__dirname, '../react/src'),
    },
  },
  server: {
    proxy: {
    },
  },
});
