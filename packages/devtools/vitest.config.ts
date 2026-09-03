import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { workspaceAliases } from '../../scripts/vite-lib';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // 工作区包解析：node_modules 无符号链接，直接映射到源码
    alias: workspaceAliases(),
    dedupe: ['react', 'react-dom'],
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
