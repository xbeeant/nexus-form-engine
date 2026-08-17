// ============================================================================
// @xbeeant/form-engine — 项目介绍站点（Fumadocs + Vite，hash 路由）
// 结构：MDX 文档（核心机制/扩展介绍）+ 交互演示（示例/组件文档/设计器）
// ============================================================================

import type { Root } from 'fumadocs-core/page-tree';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsFrameworkProvider, useHashPath } from './lib/router';
import { source } from './lib/source';
import AdvancedWidgetsPage from './pages/AdvancedWidgetsPage';
import DesignerPage from './pages/DesignerPage';
import ExamplesPage from './pages/ExamplesPage';
import ExtensionsPage from './pages/ExtensionsPage';
import { MdxDocsPage } from './pages/MdxDocsPage';
import MultiFormPage from './pages/MultiFormPage';
import WidgetValidationPage from './pages/WidgetValidationPage';
import { WidgetDocsPage } from './widget-docs/components/WidgetDocsPage';

// ── 侧边栏导航树：MDX 文档 + 交互演示页 ────────────────────────────────────
function buildTree(): Root {
  const mdTree = source.getPageTree();
  return {
    name: mdTree.name,
    children: [
      ...mdTree.children,
      { type: 'separator', name: '演示' },
      { type: 'page', name: '使用示例', url: '/examples' },
      { type: 'page', name: '多表单联动', url: '/multi-form' },
      { type: 'page', name: '组件文档', url: '/widget-docs' },
      { type: 'page', name: '组件内校验', url: '/widget-validation' },
      { type: 'page', name: '高级组件', url: '/advanced-widgets' },
      { type: 'page', name: '设计器', url: '/designer' },
    ],
  };
}

function PageRouter({ path }: { path: string }) {
  if (path.startsWith('/docs')) {
    return <MdxDocsPage path={path.replace(/^\/docs\/?/, '') || 'index'} />;
  }
  if (path === '/examples') {
    return <ExamplesPage />;
  }
  if (path === '/multi-form') {
    return <MultiFormPage />;
  }
  if (path === '/widget-docs') {
    return <WidgetDocsPage />;
  }
  if (path === '/widget-validation') {
    return <WidgetValidationPage />;
  }
  if (path === '/advanced-widgets') {
    return <AdvancedWidgetsPage />;
  }
  if (path === '/extensions') {
    return <ExtensionsPage />;
  }
  return <MdxDocsPage path={path.replace(/^\//, '') || 'index'} />;
}

function App() {
  const path = useHashPath();
  const isDesigner = path === '/designer';

  return (
    <DocsFrameworkProvider>
      {isDesigner ? (
        <div style={{ height: '100vh' }}>
          <DesignerPage />
        </div>
      ) : (
        <DocsLayout
          tree={buildTree()}
          nav={{ title: '🧩 @xbeeant/form-engine' }}
          githubUrl='https://github.com/xbeeant/nexus-form-engine'
        >
          <PageRouter path={path} />
        </DocsLayout>
      )}
    </DocsFrameworkProvider>
  );
}

export default App;
