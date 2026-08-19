import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import type { PluginOption } from 'vite';
import { defineConfig } from 'vite';
import { workspaceAliases } from '../../scripts/vite-lib';

// ui/react 包源码中的 styles.css 是给库产物消费方准备的独立 Tailwind 会话
// （theme+utilities，无 preflight）。示例应用自身已完整引入 tailwindcss，
// 若让该会话一并打进产物，其末尾的 .flex 等普通工具类会以同层叠顺序覆盖
// fumadocs 的响应式变体（如 @media 内的 .md:hidden），导致文档布局错乱，
// 因此直接把这两个 CSS 模块从应用构建中排除。
function skipLibStyles(): PluginOption {
  return {
    name: 'skip-lib-styles',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!importer || source !== './styles.css') {
        return;
      }
      const resolved = await this.resolve(source, importer, { skipSelf: true });
      if (
        resolved &&
        /packages\/(?:ui|react)\/src\/styles\.css$/.test(resolved.id)
      ) {
        return '\0skip-lib-styles';
      }
    },
    load(id) {
      if (id === '\0skip-lib-styles') {
        return 'export default undefined;';
      }
    },
  };
}

// GitHub Pages 部署在仓库子路径：https://<user>.github.io/nexus-form-engine/
// 可通过环境变量 NEXUS_BASE 覆盖（如自定义域名时传 "/"）
const base = process.env.NEXUS_BASE || '/nexus-form-engine/';

export default defineConfig({
  plugins: [react(), tailwindcss(), fumadocsMdx(), skipLibStyles()],
  base,
  optimizeDeps: {
    // fumadocs-mdx 宏产物含 `mdx/types` 类型引用，esbuild 依赖扫描会
    // 误打包 @types/mdx 导致 dev 启动失败，将其标记为 external
    esbuildOptions: {
      plugins: [
        {
          name: 'fumadocs-mdx-types-external',
          setup(build) {
            build.onResolve({ filter: /^mdx\/types$/ }, () => ({
              path: 'mdx/types',
              external: true,
            }));
            build.onResolve({ filter: /\.mdx$/ }, () => ({
              path: '',
              external: true,
            }));
          },
        },
      ],
    },
  },
  resolve: {
    // 工作区包解析：node_modules 无符号链接，直接映射到源码
    alias: workspaceAliases(),
  },
  build: {
    outDir: 'dist',
    // GitHub Pages 静态托管，无需 service worker
    sourcemap: false,
    rollupOptions: {
      output: {
        // 将 node_modules 中的运行时依赖单独分包，规避单 chunk 过大的告警
        manualChunks: {
          'antd-vendor': ['antd', 'dayjs'],
        },
      },
    },
  },
});
