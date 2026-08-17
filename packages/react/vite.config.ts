import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineLibConfig, workspaceAliases } from '../../scripts/vite-lib';

export default defineLibConfig({
  name: 'NexusFormEngineReact',
  plugins: [react(), tailwindcss()],
  injectCss: true,
  dts: {
    // vite resolve.alias 指向源码目录，d.ts 产物中必须保留包名导入
    aliasesExclude: ['@xbeeant/form-engine', '@xbeeant/form-engine-ui'],
  },
  resolve: {
    // 强制主项目和链接包使用同一个 React 实例，否则容易造成 useState null 问题
    dedupe: ['react', 'react-dom'],
    // 工作区包解析：node_modules 无符号链接，直接映射到源码
    alias: workspaceAliases(),
  },
  assetsInclude: ['**/*.bpmn'],
});