// bun test 根目录运行的全局预加载：为 react / ui 组件测试注入 jsdom 环境。
// 与 packages/ui/tests/setup.ts（vitest 用）保持等价能力，antd 组件所需浏览器 API 全量补齐。
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});

const { window } = dom;

globalThis.window = window;
globalThis.document = window.document;
globalThis.navigator = window.navigator;

// React 19 act() 环境标记（@testing-library/react 依赖）
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// scrollIntoView：FormController.submit 失败自动滚动聚焦首个错误字段
if (!window.Element.prototype.scrollIntoView) {
  window.Element.prototype.scrollIntoView = () => {};
}

// matchMedia：antd Grid / 响应式组件依赖
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// ResizeObserver：部分 antd 组件（如 autoComplete 的虚拟列表）依赖
if (!window.ResizeObserver) {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: ResizeObserverMock,
  });
}

// getComputedStyle 的 CSS 变量读取（antd 主题 token 依赖）
if (!window.getComputedStyle) {
  Object.defineProperty(window, 'getComputedStyle', {
    value: () => ({ getPropertyValue: () => '' }),
  });
}

// 将 jsdom window 的全部属性复制到 globalThis（已存在的如 console/fetch/setTimeout 保持 bun 原生）。
// 需在 polyfill 定义之后执行，保证 matchMedia / ResizeObserver 等以全局名可用
// （rc 组件直接引用裸全局 ResizeObserver，而非 window.ResizeObserver）。
for (const key of Object.getOwnPropertyNames(window)) {
  if (!(key in globalThis)) {
    try {
      Object.defineProperty(globalThis, key, {
        configurable: true,
        writable: true,
        value: (window as Record<string, unknown>)[key],
      });
    } catch {
      // 个别只读 getter 复制失败忽略
    }
  }
}
