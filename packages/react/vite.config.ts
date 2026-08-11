import { globSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import Sonda from 'sonda/vite';
import { defineConfig } from 'vite';
import { libInjectCss } from 'vite-plugin-lib-inject-css';

import packageJson from './package.json';

// 从命令行参数中提取格式信息
function getFormatFromArgs() {
  const args = process.argv;
  const formatIndex =
    args.indexOf('-f') !== -1
      ? args.indexOf('-f') + 1
      : args.indexOf('--format') !== -1
        ? args.indexOf('--format') + 1
        : -1;
  return formatIndex !== -1 && formatIndex < args.length
    ? args[formatIndex]
    : undefined;
}

const format = getFormatFromArgs() || 'es';

console.info('[build][format]', format);

const multipleInputsMode = ['es', 'cjs'];

export default defineConfig({
  plugins: [react(), tailwindcss(), libInjectCss(), Sonda()],
  css: {
    preprocessorOptions: {
      less: {
        // 这里可以配置 Less 的选项
      },
    },
  },
  resolve: {
    // 强制主项目和链接包使用同一个 React 实例，否则容易造成useState null问题。直接让 Vite 自动去重
    dedupe: ['react', 'react-dom'],
    // 工作区包解析：node_modules 无 @nexus 符号链接，直接映射到源码
    alias: {
      '@nexus/form-engine': resolve(__dirname, '../core/src'),
      '@nexus/form-engine-ui': resolve(__dirname, '../ui/src'),
    },
  },
  build: {
    sourcemap: true,
    copyPublicDir: false,
    emptyOutDir: false,
    lib: {
      entry: './src/index.ts',
    },
    // @ts-expect-error
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        /node_modules/,
        // 一些特殊的路径
        ...Object.keys(packageJson.dependencies || {}),
        ...Object.keys(packageJson.peerDependencies || {}),
      ],
      ...(multipleInputsMode.indexOf(format) === -1 && {
        output: [
          {
            format: format,
            name: 'flow-designer.js',
            //配置打包根目录
            dir: resolve(__dirname, `dist/${format}`),
          },
        ],
      }),
      // 多入口文件，保证输出的文件结构和代码工程的文件结构是一直都
      ...(multipleInputsMode.indexOf(format) !== -1 && {
        input: Object.fromEntries(
          globSync('src/**/*.{ts,tsx}', {
            // @ts-expect-error
            ignore: ['src/**/*.d.ts', 'src/**/*.stories.tsx'],
          }).map((file) => [
            // The name of the entry point
            // core/nested/foo.ts becomes nested/foo
            relative('src', file.slice(0, file.length - extname(file).length)),
            // The absolute path to the entry file
            // core/nested/foo.ts becomes /project/core/nested/foo.ts
            fileURLToPath(new URL(file, import.meta.url)),
          ]),
        ),
        output: [
          {
            //打包格式
            format: format,
            entryFileNames: '[name].js',
            chunkFileNames: 'chunks/[name]-[hash].js',
            assetFileNames: (assetInfo) => {
              const name = assetInfo.name || '';
              return name.split('/').pop() || 'index[extname]';
            },
            preserveModules: true,
            exports: 'auto',
            //配置打包根目录
            dir: resolve(__dirname, `dist/${format}`),
          },
        ],
      }),
    },
  },
  assetsInclude: ['**/*.bpmn'],
});
