// scripts/vite-lib.ts
// 各库包（core / react / ui / designer）共享的 Vite 库模式构建配置：
// 统一处理 CLI 格式参数、多入口 preserveModules 输出、外部依赖声明、
// .d.ts 产物（仅 es）、Sonda 分析与工作区包别名，避免 4 份配置重复维护。

import { globSync, readFileSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserOptions } from 'sonda';
import type { PluginOption, UserConfig } from 'vite';
import { libInjectCss } from 'vite-plugin-lib-inject-css';

// 构建期插件经「非字面量动态 import」加载：
// 避免裸 tsc / IDE 在非 bundler 解析模式下对子路径 exports（sonda/vite、
// vite-plugin-dts）静态解析失败（TS1259/TS2307）；运行时由 bun/vite 按
// package.json exports 正常解析。
const SondaPluginPath = 'sonda/vite';
const DtsPluginPath = 'vite-plugin-dts';
const Sonda = (await import(SondaPluginPath)).default as (
  options?: UserOptions,
) => PluginOption;
const dts = (await import(DtsPluginPath)).default as (
  options?: Record<string, unknown>,
) => PluginOption;

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
    '@xbeeant/form-engine-devtools': resolve(
      workspaceRoot,
      'packages/devtools/src',
    ),
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
   * 是否将所有 CSS 聚合到单个文件（默认 false，保持原有行为）。
   * 设为 true 时，es/cjs/umd 均输出聚合的 CSS 文件而非分散输出。
   * 开启后不再使用 libInjectCss 注入 CSS 到 JS。
   */
  cssBundle?: boolean;
  /** CSS 产物文件名（含扩展名），仅 cssBundle: true 时生效，默认 'index.css' */
  cssFileNames?: string;
  /**
   * 是否在 es/cjs 产物中以 import 形式注入 CSS（vite-plugin-lib-inject-css）。
   * 仅对多入口 es/cjs 生效；umd 由 vite 原生输出独立 index.css。
   * @deprecated 使用 cssBundle 替代
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
  /^@xbeeant\//,
];

/** 外部依赖匹配函数：react 系列 + 当前包 dependencies/peerDependencies（含子路径） */
function buildExternals(
  extra: (string | RegExp)[] = [],
): (id: string, importer: string | undefined, isResolved: boolean) => boolean {
  const pkg = JSON.parse(
    readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'),
  ) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
  const depNames = [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ];
  const fixedExternals: (string | RegExp)[] = [...REACT_EXTERNALS, ...extra];
  const fixedMatch = (id: string) =>
    fixedExternals.some((e) => (typeof e === 'string' ? id === e : e.test(id)));

  return (id, _importer, isResolved) => {
    // 未解析的原始规范符：按包名或其子路径精确匹配，直接保留原始导入字符串。
    // 若等到已解析成 node_modules 绝对路径后再外部化，会丢失原始包名，
    // 导致发布产物中出现写死本机绝对路径的 import（如 @lexical/react 子路径导入）。
    if (!isResolved) {
      if (fixedMatch(id)) {
        return true;
      }
      if (depNames.some((d) => id === d || id.startsWith(`${d}/`))) {
        return true;
      }
    }
    // 已解析路径兜底：位于 node_modules 的绝对路径视为外部依赖，防止把第三方代码打进产物
    return /node_modules/.test(id);
  };
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
 * - cssBundle：所有 CSS 聚合到单个文件输出（默认 false）
 */
export function defineLibConfig(options: ViteLibOptions): UserConfig {
  const format = options.format ?? getFormatFromArgs() ?? 'es';
  const multiEntry = format === 'es' || format === 'cjs';
  // cssBundle 优先级高于 injectCss（兼容旧配置）
  const cssBundle = options.cssBundle ?? false;
  const cssFileName = options.cssFileNames ?? 'index';
  // 兼容旧的 injectCss 配置：同时开启 cssBundle
  const legacyInjectCss = options.injectCss ?? false;

  console.info('[build][format]', format);

  const plugins: PluginOption[] = [
    ...(options.plugins ?? []),
    // libInjectCss 仅适用于多入口 preserveModules 产物（es/cjs）：
    // umd 单入口由 vite 原生输出独立 index.css，若在此注入会吞掉 CSS 产物
    // 当开启 cssBundle 时不使用 libInjectCss，CSS 将输出为独立文件
    ...(multiEntry && legacyInjectCss && !cssBundle ? [libInjectCss()] : []),
    Sonda({
      open: false,
      gzip: true,
      sources: true,
      filename: `${format}_sonda_[index]`,
    }),
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

  // CSS 聚合输出配置：所有 CSS 合并到 index.css
  const cssConfig: {
    cssCodeSplit: boolean;
    assetsInclude?: string | string[];
    rollupOptions?: {
      output?: Record<string, unknown>[];
    };
  } = {
    cssCodeSplit: false, // 关闭 CSS 按模块分割，聚合到一个文件
  };

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
              output: [
                {
                  ...buildMultiEntryOutput(format as 'es' | 'cjs'),
                  // cssBundle: 自定义 CSS 输出文件名
                  assetFileNames: cssBundle
                    ? () => `${cssFileName}.css`
                    : (assetInfo: { name?: string }) =>
                        assetInfo.name?.split('/').pop() || 'index[extname]',
                },
              ],
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
      ...cssConfig,
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
