// scripts/vite-lib.ts
// 各库包（core / react / ui / designer）共享的 Vite 库模式构建配置：
// 统一处理 CLI 格式参数、多入口 preserveModules 输出、外部依赖声明、
// .d.ts 产物（仅 es）、Sonda 分析与工作区包别名，避免 4 份配置重复维护。

import { globSync, readFileSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Sonda from 'sonda/vite';
import type { PluginOption, UserConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { libInjectCss } from 'vite-plugin-lib-inject-css';

/** 构建格式：es（默认）/ cjs / umd */
export type ViteLibFormat = 'es' | 'cjs' | 'umd';

/** 从命令行提取构建格式（vite build -f es|cjs|umd） */
export function getFormatFromArgs(): ViteLibFormat | undefined {
  const args = process.argv;
  const formatIndex =
    args.indexOf('-f') !== -1
      ? args.indexOf('-f') + 1
      : args.indexOf('--format') !== -1
        ? args.indexOf('--format') + 1
        : -1;
  return formatIndex !== -1 && formatIndex < args.length
    ? (args[formatIndex] as ViteLibFormat)
    : undefined;
}

const workspaceRoot = fileURLToPath(new URL('..', import.meta.url));

/** 工作区包源码别名：node_modules 无符号链接，直接映射 packages 各包源码目录 */
export function workspaceAliases(): Record<string, string> {
  return {
    '@xbeeant/form-engine': resolve(workspaceRoot, 'packages/core/src'),
    '@xbeeant/form-engine-react': resolve(workspaceRoot, 'packages/react/src'),
    '@xbeeant/form-engine-ui': resolve(workspaceRoot, 'packages/ui/src'),
    '@xbeeant/form-engine-designer': resolve(
      workspaceRoot,
      'packages/designer/src',
    ),
  };
}

export interface ViteLibOptions {
  /** UMD 全局名 */
  name: string;
  /** 构建格式，默认读取 CLI -f/--format，缺省 'es' */
  format?: ViteLibFormat;
  /** 前置插件（react() / tailwindcss() / libInjectCss() 等），Sonda 与 dts 由公共配置自动追加 */
  plugins?: PluginOption[];
  /** 额外 external（react/react-dom/jsx-runtime、/node_modules/、dependencies、peerDependencies 已内置） */
  extraExternal?: (string | RegExp)[];
  /**
   * 是否在 es/cjs 产物中以 import 形式注入 CSS（vite-plugin-lib-inject-css）。
   * 仅对多入口 es/cjs 生效；umd 由 vite 原生输出独立 index.css。
   */
  injectCss?: boolean;
  /** 是否在 es 格式下生成 .d.ts */
  dts?: boolean | { aliasesExclude?: string[] };
  /** 解析配置（dedupe / alias 等），core 无需设置 */
  resolve?: UserConfig['resolve'];
  /** build.sourcemap，默认读取 BUILD_SOURCEMAP=true */
  sourcemap?: boolean;
  /** 额外 asset 类型（如 bpmn 文件等） */
  assetsInclude?: string[];
}

/** react 系列 peer 依赖：所有带 UI 的包统一 external，core 无此依赖但声明无害 */
const REACT_EXTERNALS: (string | RegExp)[] = [
  'react',
  'react-dom',
  'react/jsx-runtime',
];

/** 外部依赖 = react 系列 + /node_modules/ + 当前包 dependencies/peerDependencies */
function buildExternals(extra: (string | RegExp)[] = []): (string | RegExp)[] {
  const pkg = JSON.parse(
    readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'),
  ) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
  return [
    ...REACT_EXTERNALS,
    ...extra,
    /node_modules/,
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ];
}

/**
 * 多入口收集：保证输出的文件结构和代码工程的文件结构一致。
 * 排除类型声明（.d.ts）、stories、测试文件与纯类型目录（types）。
 */
function collectEntries(): Record<string, string> {
  return Object.fromEntries(
    globSync('src/**/*.{ts,tsx}')
      .filter((file) => !/\.(d|stories|test)\.tsx?$/.test(file))
      // node:fs 的 glob ignore 在 Windows 下不可靠，改为手动过滤
      .filter((file) => !file.split(/[\\/]/).includes('types'))
      .map((file) => [
        // core/nested/foo.ts becomes nested/foo
        relative('src', file.slice(0, file.length - extname(file).length)),
        // 相对于当前包目录（vite 在包目录下执行）解析为绝对路径
        resolve(process.cwd(), file),
      ]),
  );
}

function buildMultiEntryOutput(format: 'es' | 'cjs') {
  const isCjs = format === 'cjs';
  return {
    format,
    entryFileNames: isCjs ? '[name].cjs' : '[name].js',
    chunkFileNames: isCjs
      ? 'chunks/[name]-[hash].cjs'
      : 'chunks/[name]-[hash].js',
    assetFileNames: (assetInfo: { name?: string }) =>
      assetInfo.name?.split('/').pop() || 'index[extname]',
    preserveModules: true,
    // as const：字面量类型收窄，兼容 Rollup OutputOptions.exports 联合类型
    exports: 'auto' as const,
    // 配置打包根目录
    dir: resolve(process.cwd(), `dist/${format}`),
  };
}

/**
 * 库模式公共配置工厂。
 * - es/cjs：多入口 preserveModules，产物结构与源码一致
 * - umd：单入口 bundle，全局名由 name 指定
 */
export function defineLibConfig(options: ViteLibOptions): UserConfig {
  const format = options.format ?? getFormatFromArgs() ?? 'es';
  const multiEntry = format === 'es' || format === 'cjs';

  console.info('[build][format]', format);

  const plugins: PluginOption[] = [
    ...(options.plugins ?? []),
    // libInjectCss 仅适用于多入口 preserveModules 产物（es/cjs）：
    // umd 单入口由 vite 原生输出独立 index.css，若在此注入会吞掉 CSS 产物
    ...(multiEntry && options.injectCss ? [libInjectCss()] : []),
    Sonda(),
    ...(format === 'es' && options.dts
      ? [
          dts({
            tsconfigPath: './tsconfig.app.json',
            entryRoot: 'src',
            outDirs: 'dist/es',
            ...(typeof options.dts === 'object'
              ? { aliasesExclude: options.dts.aliasesExclude }
              : {}),
          }),
        ]
      : []),
  ];

  const config: UserConfig = {
    plugins,
    build: {
      // 默认不生成 sourcemap（publish 产物不含 map），本地调试用 BUILD_SOURCEMAP=true 开启
      sourcemap: options.sourcemap ?? process.env.BUILD_SOURCEMAP === 'true',
      copyPublicDir: false,
      emptyOutDir: false,
      lib: {
        entry: './src/index.ts',
        fileName: 'index',
      },
      rollupOptions: {
        external: buildExternals(options.extraExternal),
        ...(multiEntry
          ? {
              input: collectEntries(),
              output: [buildMultiEntryOutput(format as 'es' | 'cjs')],
            }
          : {
              output: [
                {
                  format,
                  name: options.name,
                  dir: resolve(process.cwd(), `dist/${format}`),
                },
              ],
            }),
      },
    },
  };

  if (options.resolve) {
    config.resolve = options.resolve;
  }
  if (options.assetsInclude) {
    config.assetsInclude = options.assetsInclude;
  }

  return config;
}
