// ============================================================================
// MainArea — DocsLayout 内容区占位容器
// 占用 #nd-docs-layout 网格的 [grid-area:main] 区域（菜单左侧栏右侧、header 下方）。
// 未使用 DocsPage 的演示页面必须包裹本容器，否则内容会被网格自动放置到错误位置。
// ============================================================================

import type { ReactNode } from 'react';

export function MainArea({ children }: { children: ReactNode }) {
  return <div className='[grid-area:main] min-w-0'>{children}</div>;
}
