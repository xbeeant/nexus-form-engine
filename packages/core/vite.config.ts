import { globSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

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

// Core 层为纯 TypeScript 库，无任何 UI 依赖：
// 不加载 react / tailwind / css-inject 等插件，保证产物纯净
export default defineConfig({
  plugins:
    format === 'es'
      ? [
          dts({
            tsconfigPath: './tsconfig.app.json',
            entryRoot: 'src',
            outDirs: 'dist/es',
          }),
        ]
      : [],
  build: {
    // 默认不生成 sourcemap（publish 产物不含 map），本地调试用 BUILD_SOURCEMAP=true 开启
    sourcemap: process.env.BUILD_SOURCEMAP === 'true',
    copyPublicDir: false,
    emptyOutDir: false,
    lib: {
      entry: './src/index.ts',
      fileName: 'index',
    },
    // @ts-expect-error
    rollupOptions: {
      external: [
        /node_modules/,
        ...Object.keys(packageJson.dependencies || {}),
      ],
      ...(multipleInputsMode.indexOf(format) === -1 && {
        output: [
          {
            format: format,
            name: 'NexusFormEngine',
            dir: resolve(__dirname, `dist/${format}`),
          },
        ],
      }),
      // 多入口文件，保证输出的文件结构和代码工程的文件结构一致
      ...(multipleInputsMode.indexOf(format) !== -1 && {
        input: Object.fromEntries(
          globSync('src/**/*.{ts,tsx}')
            // node:fs 的 glob ignore 在 Windows 下不可靠，改为手动过滤
            .filter(
              (file) =>
                !file.endsWith('.d.ts') &&
                !file.endsWith('.stories.tsx') &&
                // types 目录为纯类型模块，无需作为独立入口打包
                !file.split(/[\\/]/).includes('types'),
            )
            .map((file) => [
              // The name of the entry point
              // core/nested/foo.ts becomes nested/foo
              relative(
                'src',
                file.slice(0, file.length - extname(file).length),
              ),
              // The absolute path to the entry file
              // core/nested/foo.ts becomes /project/core/nested/foo.ts
              fileURLToPath(new URL(file, import.meta.url)),
            ]),
        ),
        output: [
          {
            //打包格式
            format: format,
            entryFileNames: format === 'cjs' ? '[name].cjs' : '[name].js',
            chunkFileNames:
              format === 'cjs'
                ? 'chunks/[name]-[hash].cjs'
                : 'chunks/[name]-[hash].js',
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
});
