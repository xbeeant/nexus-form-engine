import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineLibConfig, workspaceAliases } from '../../scripts/vite-lib';

export default defineLibConfig({
  name: 'NexusFormEngineDesigner',
  format: 'es',
  plugins: [react(), tailwindcss()],
  sourcemap: true,
  resolve: {
    dedupe: ['react', 'react-dom'],
    // 工作区包解析：node_modules 无符号链接，直接映射到源码
    alias: workspaceAliases(),
  },
});
