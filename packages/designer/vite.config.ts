import { globSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import packageJson from './package.json';

const format = 'es';

const multipleInputsMode = ['es', 'cjs'];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    sourcemap: true,
    copyPublicDir: false,
    emptyOutDir: false,
    lib: {
      entry: './src/index.ts',
    },
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
            name: 'form-engine-designer.js',
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
