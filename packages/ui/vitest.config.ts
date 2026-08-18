import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { workspaceAliases } from '../../scripts/vite-lib';

export default defineConfig({
  plugins: [react()],
  esbuild: { jsx: 'automatic' },
  resolve: {
    // 工作区包解析：node_modules 无符号链接，直接映射到源码
    alias: workspaceAliases(),
    // 强制所有包使用同一个 React 实例（ui/react 各自 node_modules 存在嵌套副本）
    dedupe: ['react', 'react-dom'],
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    css: false,
    // 启用全局 afterEach，@testing-library/react 自动清理 DOM
    globals: true,
  },
});