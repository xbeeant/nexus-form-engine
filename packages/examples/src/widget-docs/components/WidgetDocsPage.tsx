// ============================================================================
// WidgetDocsPage — 组件文档站（antd 风格）
// 左侧：分组组件导航；右侧：组件简介 + 示例实例列表 + 属性介绍表
// ============================================================================

import { Layout, Menu, Segmented, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { widgetDocs } from '../registry';
import type { DocGroup } from '../types';
import { DemoCard } from './DemoCard';
import { PropsTable } from './PropsTable';
import { MainArea } from '../../site/MainArea';

const { Sider, Content } = Layout;

const GROUP_ORDER: DocGroup[] = [
  '基础输入',
  '选择类',
  '复杂选择',
  '日期时间',
  '文件图片',
  '列表',
  '联动',
  '布局',
];

export function WidgetDocsPage() {
  const [selectedId, setSelectedId] = useState<string>(widgetDocs[0]?.id ?? '');
  const [readOnly, setReadOnly] = useState(false);

  const doc = widgetDocs.find((d) => d.id === selectedId) ?? widgetDocs[0];

  // 左侧导航：按分组组织
  const menuItems = useMemo(() => {
    return GROUP_ORDER.filter((group) =>
      widgetDocs.some((d) => d.group === group),
    ).map((group) => ({
      key: group,
      label: group,
      type: 'group' as const,
      children: widgetDocs
        .filter((d) => d.group === group)
        .map((d) => ({ key: d.id, label: d.title })),
    }));
  }, []);

  return (
    <MainArea>
      <Layout
        style={{
          height: 'calc(100dvh - var(--fd-docs-row-2, 0px))',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
      <Sider
        width={200}
        theme='light'
        style={{
          borderRight: '1px solid #f0f0f0',
          height: '100%',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'thin',
          scrollbarColor: '#d9d9d9 transparent',
        }}
      >
        <Menu
          mode='inline'
          selectedKeys={[doc.id]}
          defaultOpenKeys={GROUP_ORDER}
          items={menuItems}
          onClick={({ key }) => setSelectedId(key)}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>

      <Content
        style={{
          padding: '32px 48px 64px',
          overflowY: 'auto',
          overflowX: 'hidden',
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          scrollbarWidth: 'thin',
          scrollbarColor: '#d9d9d9 transparent',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            {doc.title}{' '}
            <Typography.Text type='secondary' style={{ fontWeight: 400 }}>
              {doc.english}
            </Typography.Text>
          </Typography.Title>
          <Segmented
            value={readOnly ? 'readonly' : 'edit'}
            onChange={(v) => setReadOnly(v === 'readonly')}
            options={[
              { label: '编辑', value: 'edit' },
              { label: '只读', value: 'readonly' },
            ]}
          />
        </div>
        <Typography.Paragraph type='secondary' style={{ maxWidth: 720 }}>
          {doc.description}
        </Typography.Paragraph>
        {readOnly && (
          <Typography.Paragraph type='secondary' style={{ fontSize: 12 }}>
            当前为只读模式：本页所有示例表单均以文本展示，切换回「编辑」可继续操作
          </Typography.Paragraph>
        )}

        {doc.demos.map((demo, index) => (
          <DemoCard
            key={`${doc.id}-demo-${index}`}
            demo={demo}
            readOnly={readOnly}
          />
        ))}

        <PropsTable doc={doc} />
      </Content>
      </Layout>
    </MainArea>
  );
}
