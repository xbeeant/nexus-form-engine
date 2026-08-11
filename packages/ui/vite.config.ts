import { globSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import packageJson from './package.json';

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

const multipleInputsMode = ['es', 'cjs'];

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    // 工作区包解析：node_modules 无 @nexus 符号链接，直接映射到源码
    alias: {
      '@nexus/form-engine': resolve(__dirname, '../core/src'),
      '@nexus/form-engine-react': resolve(__dirname, '../react/src'),
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
        ...Object.keys(packageJson.dependencies || {}),
        ...Object.keys(packageJson.peerDependencies || {}),
      ],
      ...(multipleInputsMode.indexOf(format) === -1 && {
        output: [
          {
            format: format,
            name: 'form-engine-ui.js',
            dir: resolve(__dirname, `dist/${format}`),
          },
        ],
      }),
      ...(multipleInputsMode.indexOf(format) !== -1 && {
        input: Object.fromEntries(
          globSync('src/**/*.{ts,tsx}', {
            // @ts-expect-error
            ignore: ['src/**/*.d.ts'],
          }).map((file) => [
            relative('src', file.slice(0, file.length - extname(file).length)),
            fileURLToPath(new URL(file, import.meta.url)),
          ]),
        ),
        output: [
          {
            format: format,
            entryFileNames: '[name].js',
            chunkFileNames: 'chunks/[name]-[hash].js',
            assetFileNames: (assetInfo) => {
              const name = assetInfo.name || '';
              return name.split('/').pop() || 'index[extname]';
            },
            preserveModules: true,
            exports: 'auto',
            dir: resolve(__dirname, `dist/${format}`),
          },
        ],
      }),
    },
  },
});
