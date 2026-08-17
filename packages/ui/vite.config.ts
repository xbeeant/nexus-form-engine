import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineLibConfig, workspaceAliases } from '../../scripts/vite-lib';

export default defineLibConfig({
  name: 'NexusFormEngineUI',
  // tailwindcss：编译 src/styles.css 生成工具类样式；
  // injectCss：es/cjs 产物注入 CSS import（umd 由 vite 输出独立 index.css）
  plugins: [react(), tailwindcss()],
  injectCss: true,
  dts: {
    // vite resolve.alias 指向源码目录，d.ts 产物中必须保留包名导入
    aliasesExclude: ['@xbeeant/form-engine', '@xbeeant/form-engine-react'],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    // 工作区包解析：node_modules 无符号链接，直接映射到源码
    alias: workspaceAliases(),
  },
});
