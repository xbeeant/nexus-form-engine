// ============================================================================
// @nexus/form-engine — 项目介绍站点（GitHub Pages）
// 结构：核心机制 / 扩展介绍 / 使用示例 / 设计器
// ============================================================================

import { Layout, Menu, Typography } from 'antd';
import { useState } from 'react';
import DesignerPage from './pages/DesignerPage';
import ExamplesPage from './pages/ExamplesPage';
import ExtensionsPage from './pages/ExtensionsPage';
import HomePage from './pages/HomePage';

const { Header, Content, Footer } = Layout;

type PageKey = 'home' | 'extensions' | 'examples' | 'designer';

const NAV_ITEMS = [
  { key: 'home', label: '核心机制' },
  { key: 'extensions', label: '扩展介绍' },
  { key: 'examples', label: '使用示例' },
  { key: 'designer', label: '设计器' },
];

function App() {
  const [page, setPage] = useState<PageKey>('home');

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          background: '#001529',
          paddingInline: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 22 }}>🧩</span>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>
            @nexus/form-engine
          </span>
        </div>
        <Menu
          theme='dark'
          mode='horizontal'
          selectedKeys={[page]}
          items={NAV_ITEMS}
          onClick={({ key }) => setPage(key as PageKey)}
          style={{ flex: 1, minWidth: 0, background: 'transparent' }}
        />
        <a
          href='https://github.com/xbeeant/nexus-form-engine'
          target='_blank'
          rel='noreferrer'
          style={{
            color: 'rgba(255,255,255,0.65)',
            fontSize: 13,
            whiteSpace: 'nowrap',
          }}
        >
          GitHub ↗
        </a>
      </Header>

      <Content
        style={
          page === 'designer'
            ? {
                height: 'calc(100vh - 64px)',
                background: '#f5f5f5',
                overflow: 'hidden',
              }
            : { background: '#fff', overflow: 'auto' }
        }
      >
        {page === 'home' && <HomePage />}
        {page === 'extensions' && <ExtensionsPage />}
        {page === 'examples' && <ExamplesPage />}
        {page === 'designer' && <DesignerPage />}
      </Content>

      <Footer style={{ textAlign: 'center', padding: '16px 24px' }}>
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          @nexus/form-engine — Schema 驱动的表单引擎 · core 纯 TypeScript 零 UI
          依赖
        </Typography.Text>
      </Footer>
    </Layout>
  );
}

export default App;
