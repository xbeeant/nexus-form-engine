// ── 设备识别工具 ────────────────────────────────────────────────────────────────
// 仅 `@xbeeant/form-engine-ui` 使用，core 包不依赖设备感知能力。
// 提供 同步检测（注册时使用）+ React Hook（widget 内响应式订阅）。

import { useCallback, useSyncExternalStore } from 'react';

/** 设备断点（mobile 屏幕最大宽度，单位 px） */
export const DEFAULT_MOBILE_BREAKPOINT = 768;

/** 设备检测选项 */
export interface IsMobileOptions {
  /**
   * 自定义断点（px）。viewport 宽度 ≤ breakpoint 视为移动端。
   * 默认 768（即平板/桌面分界）。
   * 仅在浏览器环境下生效；UA 嗅探不受断点影响。
   */
  breakpoint?: number;

  /**
   * 强制把断点判定注入为结果（true/false）。
   * - true：始终认为是移动端（不考虑 UA / viewport）
   * - false：始终认为是桌面端
   * - 不传：根据 UA + viewport 判定
   *
   * 用于测试 / 单端应用强制指定。
   */
  force?: boolean;
}

/**
 * 同步检测当前设备是不是移动端。
 *
 * 判定顺序：
 * 1. options.force 已指定 → 直接返回
 * 2. SSR / 无 window → 返回 false（无法判定）
 * 3. `navigator.userAgent` 命中常见移动端关键字（Android/iPhone/iPad/iPod/Mobile/Phone/WebOS/BlackBerry）
 *    → true
 * 4. 否则按 viewport 宽度 ≤ 断点判定 → boolean
 *
 * 不抛异常，可安全在 SSR/顶层模块调用。
 *
 * @example
 * ```ts
 * if (isMobile()) {
 *   registerAntdUI(engine, { device: 'mobile', mobileWidgets });
 * }
 * ```
 */
export function isMobile(options?: IsMobileOptions): boolean {
  if (typeof options?.force === 'boolean') {
    return options.force;
  }
  if (typeof window === 'undefined') {
    return false;
  }

  const ua = (navigator?.userAgent ?? '').toLowerCase();
  if (
    /(android|iphone|ipad|ipod|mobile|phone|webos|blackberry|windows phone)/.test(
      ua,
    )
  ) {
    return true;
  }

  const breakpoint = options?.breakpoint ?? DEFAULT_MOBILE_BREAKPOINT;
  if (typeof window.matchMedia === 'function') {
    try {
      return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
    } catch {
      // 某些环境 matchMedia 抛错，降级用 innerWidth
    }
  }
  return window.innerWidth <= breakpoint;
}

/**
 * 返回当前是否移动端的 React 订阅 Hook。
 *
 * - 初次渲染使用 `isMobile()` 的同步结果，确保 SSR / hydration 一致。
 * - 通过 `useSyncExternalStore` 订阅 `matchMedia('(max-width: breakpoint)')` 变化事件，
 *   设备切换（旋转、横竖屏窗口调整）时自动触发组件重渲染。
 * - SSR 环境下始终返回 `false`（无 window），与 `isMobile()` 行为一致。
 *
 * @example
 * ```tsx
 * function SelectWidget(props) {
 *   const mobile = useIsMobile();
 *   return mobile ? <MobilePicker {...props} /> : <Select {...props} />;
 * }
 * ```
 */
export function useIsMobile(options?: IsMobileOptions): boolean {
  const breakpoint = options?.breakpoint ?? DEFAULT_MOBILE_BREAKPOINT;
  // 把 force 提取为常量，避免 hook 之间穿插提前 return，保证 hook 调用顺序一致
  const forced =
    typeof options?.force === 'boolean' ? options.force : undefined;

  const getServerSnapshot = useCallback(() => false, []);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      // force 模式下值永不变，不订阅以避免无意义 store 监听
      if (forced !== undefined) {
        return () => {};
      }
      if (
        typeof window === 'undefined' ||
        typeof window.matchMedia !== 'function'
      ) {
        return () => {};
      }
      let mediaQuery: MediaQueryList;
      try {
        mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);
      } catch {
        return () => {};
      }
      // 兼容旧版：使用 addEventListener，回退到 addListener
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', onStoreChange);
        return () => mediaQuery.removeEventListener('change', onStoreChange);
      }
      // biome-ignore lint/suspicious/noExplicitAny: jsdom/老旧浏览器兜底
      const legacy = mediaQuery as any;
      legacy.addListener(onStoreChange);
      return () => legacy.removeListener(onStoreChange);
    },
    [breakpoint, forced],
  );

  // force 模式下 getSnapshot 永远返回 forced；否则调 isMobile(options) 检测。
  // 不 memo：force 不变时 forced 引用稳定，isMobile(options) 内部读 window/UA，
  // 外层 options 引用变化不影响实际返回值；useSyncExternalStore 会用 Object.is
  // 比对快照值，不会触发额外渲染。
  return useSyncExternalStore(
    subscribe,
    () => (forced !== undefined ? forced : isMobile(options)),
    getServerSnapshot,
  );
}
