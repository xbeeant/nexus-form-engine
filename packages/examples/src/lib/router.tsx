import { FrameworkProvider, type Router } from 'fumadocs-core/framework';
import { useSyncExternalStore } from 'react';

// 页面路由统一使用 `#/xxx` 前缀；`#anchor` 形式的 hash 视为页内锚点，
// 不改变页面路由（由浏览器默认滚动行为处理）
let routePath = '/';

export function getHashPath(): string {
  return routePath;
}

export function navigate(to: string) {
  const target = to.startsWith('/') ? `#${to}` : to;
  if (window.location.hash === target) {
    window.scrollTo({ top: 0 });
  } else {
    window.location.hash = target;
  }
}

const listeners = new Set<() => void>();
// 全局 hashchange 监听用引用计数管理：单个订阅者卸载时不能移除
// 其他订阅者仍在依赖的全局 handler
let eventBound = 0;

function handleHashChange() {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash.startsWith('/')) {
    routePath = hash;
  }
  for (const cb of listeners) {
    cb();
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (eventBound === 0) {
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
  }
  eventBound += 1;
  return () => {
    listeners.delete(cb);
    eventBound -= 1;
    if (eventBound === 0) {
      window.removeEventListener('hashchange', handleHashChange);
    }
  };
}

export function useHashPath() {
  return useSyncExternalStore(subscribe, getHashPath, () => '/');
}

export function Link({
  href,
  onClick,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={href}
      onClick={(e) => {
        if (
          href?.startsWith('/') &&
          !e.defaultPrevented &&
          !e.metaKey &&
          !e.ctrlKey &&
          !e.shiftKey &&
          !e.altKey
        ) {
          e.preventDefault();
          navigate(href);
          onClick?.(e);
        } else {
          onClick?.(e);
        }
      }}
      {...props}
    />
  );
}

function useRouter(): Router {
  return {
    push: (url) => navigate(url),
    refresh: () => {},
  };
}

export function DocsFrameworkProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FrameworkProvider
      Link={Link}
      usePathname={useHashPath}
      useRouter={useRouter}
      useParams={() => ({})}
    >
      {children}
    </FrameworkProvider>
  );
}
