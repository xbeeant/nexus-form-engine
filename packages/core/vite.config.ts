// Core 层为纯 TypeScript 库，无任何 UI 依赖：
// 不加载 react / tailwind / css-inject 等插件，保证产物纯净
import { defineLibConfig } from '../../scripts/vite-lib';

export default defineLibConfig({
  name: 'NexusFormEngine',
  dts: true,
});
