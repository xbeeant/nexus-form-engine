// antd 组件在 jsdom 环境下所需的浏览器 API polyfill

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

// getComputedStyle：antd @rc-component/portal 的 useScrollLocker 调用
// measureScrollbarSize → getComputedStyle，jsdom 已定义但未实现，需覆盖
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({ getPropertyValue: () => '' }),
  configurable: true,
  writable: true,
});
