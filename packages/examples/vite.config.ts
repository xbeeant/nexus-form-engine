import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import { defineConfig } from 'vite';

// GitHub Pages 部署在仓库子路径：https://<user>.github.io/nexus-form-engine/
// 可通过环境变量 NEXUS_BASE 覆盖（如自定义域名时传 "/"）
const base = process.env.NEXUS_BASE || '/nexus-form-engine/';

export default defineConfig({
  plugins: [react(), tailwindcss(), fumadocsMdx()],
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
    alias: {
      '@nexus/form-engine': path.resolve(__dirname, '../core/src'),
      '@nexus/form-engine-ui': path.resolve(__dirname, '../ui/src'),
      '@nexus/form-engine-designer': path.resolve(__dirname, '../designer/src'),
      '@nexus/form-engine-react': path.resolve(__dirname, '../react/src'),
    },
  },
  server: {
    proxy: {},
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
