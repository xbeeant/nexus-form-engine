import react from '@vitejs/plugin-react';
import { defineLibConfig, workspaceAliases } from '../../scripts/vite-lib';

export default defineLibConfig({
  name: 'NexusFormEngineDevTools',
  plugins: [react()],
  dts: {
    // vite resolve.alias 指向源码目录，d.ts 产物中必须保留包名导入
    aliasesExclude: ['@xbeeant/form-engine'],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    // 工作区包解析：node_modules 无符号链接，直接映射到源码
    alias: workspaceAliases(),
  },
});
