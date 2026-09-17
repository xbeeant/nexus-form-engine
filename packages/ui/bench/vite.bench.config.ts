import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// UI 基准专用构建：与各包 dev 一致把 @nexus 依赖 alias 到 src（单一模块实例）
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@nexus/form-engine': resolve(__dirname, '../../core/src'),
      '@nexus/form-engine-react': resolve(__dirname, '../../react/src'),
      '@nexus/form-engine-ui': resolve(__dirname, '../src'),
    },
  },
  build: {
    ssr: 'bench/bench.tsx',
    outDir: 'bench/dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'antd',
        'dayjs',
        /@ant-design\/pro-components/,
      ],
    },
  },
});
