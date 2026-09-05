// ============================================================================
// @xbeeant/form-engine — 项目介绍站点（Fumadocs + Vite，hash 路由）
// 结构：MDX 文档（核心机制/扩展介绍）+ 交互演示（示例/组件文档/设计器）
// ============================================================================

import type { Root } from 'fumadocs-core/page-tree';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { useHashPath } from './lib/router';
import { source } from './lib/source';
import AdvancedWidgetsPage from './pages/advanced-widgets-page';
import BenchmarkPage from './pages/benchmark-page';
import DesignerPage from './pages/designer-page';
import DevToolsPage from './pages/dev-tools-page';
import ExamplesPage from './pages/examples-page';
import ExtensionsPage from './pages/extensions-page';
import { MdxDocsPage } from './pages/mdx-docs-page';
import ModalPage from './pages/modal-page';
import MultiFormPage from './pages/multi-form-page';
import MultiInstancePage from './pages/multi-instance-page';
import SideEffectsPage from './pages/side-effects-page';
import WidgetValidationPage from './pages/widget-validation-page';
import { WidgetDocsPage } from './widget-docs/components/widget-docs-page';

// ── 侧边栏导航树：MDX 文档 + 交互演示页 ────────────────────────────────────
function buildTree(): Root {
  const mdTree = source.getPageTree();
  return {
    name: mdTree.name,
    children: [
      ...mdTree.children,
      { type: 'separator', name: '演示' },
      { type: 'page', name: '使用示例', url: '/examples' },
      { type: 'page', name: '性能压测', url: '/benchmark' },
      { type: 'page', name: '开发工具', url: '/devtools' },
      { type: 'page', name: '多表单联动', url: '/multi-form' },
      { type: 'page', name: '同一 form 多 schema', url: '/multi-instance' },
      { type: 'page', name: '模态框示例', url: '/modal' },
      { type: 'page', name: '附带编辑器', url: '/side-effects' },
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
  if (path === '/benchmark') {
    return <BenchmarkPage />;
  }
  if (path === '/devtools') {
    return <DevToolsPage />;
  }
  if (path === '/multi-form') {
    return <MultiFormPage />;
  }
  if (path === '/multi-instance') {
    return <MultiInstancePage />;
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
  if (path === '/modal') {
    return <ModalPage />;
  }
  if (path === '/side-effects') {
    return <SideEffectsPage />;
  }
  if (path === '/designer') {
    return <DesignerPage />;
  }
  return <MdxDocsPage path={path.replace(/^\//, '') || 'index'} />;
}

function App() {
  const path = useHashPath();
  const isDesigner = path === '/designer';

  return (
    <>
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
    </>
  );
}

export default App;
