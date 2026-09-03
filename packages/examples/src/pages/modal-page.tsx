// ============================================================================
// ModalPage — Ant Design Table + Modal 交互演示
// 表格行内「详情」弹出详情模态框；模态框内「编辑」弹出编辑模态框；
// 详情模态框与编辑模态框共用同一个 NexusForm Schema，
// 其中 richText 字段使用 LexEditor 自定义 widget。
// ============================================================================

import type { NexusSchema } from '@xbeeant/form-engine';
import { Space, Table, Tag, Typography } from 'antd';
import type { ColumnType } from 'antd/es/table';
import { useState } from 'react';
import { MainArea } from '../site/main-area.tsx';
import DetailModal from './components/detail-modal.tsx';
import EditModal from './components/edit-modal.tsx';

const { Paragraph, Title } = Typography;

// ── 共享 Schema：详情模态框 & 编辑模态框共用（同一份）────────────────────────
export const articleSchema: NexusSchema = {
  type: 'object',
  displayType: 'row',
  labelWidth: 80,
  properties: {
    title: {
      type: 'string',
      widget: 'input',
      title: '标题',
      required: true,
      placeholder: '请输入文章标题',
    },
    category: {
      type: 'string',
      widget: 'select',
      title: '分类',
      required: true,
      enum: ['tech', 'product', 'marketing', 'design'],
      enumNames: ['技术', '产品', '营销', '设计'],
    },
    status: {
      type: 'string',
      widget: 'radio',
      title: '状态',
      enum: ['draft', 'published', 'archived'],
      enumNames: ['草稿', '已发布', '已归档'],
    },
    content: {
      type: 'string',
      widget: 'richText',
      title: '正文',
      description: '支持富文本编辑（LexEditor）',
    },
    tags: {
      type: 'array',
      widget: 'multiSelect',
      title: '标签',
      enum: ['前端', '后端', 'UI', '运维', 'AI', '数据'],
    },
    priority: {
      type: 'number',
      widget: 'rate',
      title: '优先级',
      default: 3,
      props: { count: 5 },
    },
  },
};

// ── 模拟表格数据 ──────────────────────────────────────────────────────────────
interface ArticleRecord {
  key: string;
  title: string;
  category: string;
  status: string;
  content: string;
  tags: string[];
  priority: number;
}

const mockData: ArticleRecord[] = [
  {
    key: '1',
    title: 'React Server Components 实战指南',
    category: 'tech',
    status: 'published',
    content: '<p>本文介绍 RSC 的</p><b>核心概念</b>与最佳实践...</p>',
    tags: ['前端', 'AI'],
    priority: 4,
  },
  {
    key: '2',
    title: 'Q3 产品路线图规划',
    category: 'product',
    status: 'draft',
    content:
      '<h3>产品规划摘要</h3><ul><li>新增 AI 驱动的分析模块</li><li>优化移动端体验</li></ul>',
    tags: ['产品', 'UI'],
    priority: 5,
  },
  {
    key: '3',
    title: '618 大促营销策略方案',
    category: 'marketing',
    status: 'published',
    content:
      '<p>本次大促主打</p><span style="color:red">限时折扣</span>，预计覆盖 500 万用户...</p>',
    tags: ['营销', '后端'],
    priority: 3,
  },
  {
    key: '4',
    title: 'Design System 2.0 重构计划',
    category: 'design',
    status: 'archived',
    content: '<p>新版设计系统基于</p><code>Ant Design 6</code> 构建...</p>',
    tags: ['UI', '前端'],
    priority: 2,
  },
  {
    key: '5',
    title: '微服务架构演进：从零到千万级 QPS',
    category: 'tech',
    status: 'draft',
    content: '<p>本文分享了我们的</p><b>服务拆分</b>历程与踩坑记录...</p>',
    tags: ['后端', '运维'],
    priority: 5,
  },
];

const categoryMap: Record<string, string> = {
  tech: '技术',
  product: '产品',
  marketing: '营销',
  design: '设计',
};

const statusTagMap: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  published: { color: 'success', label: '已发布' },
  archived: { color: 'error', label: '已归档' },
};

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function ModalPage() {
  const [tableData] = useState<ArticleRecord[]>(mockData);

  // ── 表格列定义 ────────────────────────────────────────────────────────────
  const columns: ColumnType<ArticleRecord>[] = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 260,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (v: string) => <Tag>{categoryMap[v]}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => (
        <Tag color={statusTagMap[v]?.color}>{statusTagMap[v]?.label}</Tag>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
      render: (tags: string[]) => (
        <Space wrap>
          {tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (v: number) => '⭐'.repeat(v) + '☆'.repeat(5 - v),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 120,
      render: (_: unknown, record: ArticleRecord) => (
        <Space>
          <DetailModal record={record} />
          <EditModal record={record} />
        </Space>
      ),
    },
  ];

  return (
    <MainArea>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 16px 48px' }}>
        <Title level={2} style={{ marginBottom: 4 }}>
          表格与模态框交互
        </Title>
        <Paragraph type='secondary' style={{ marginBottom: 24 }}>
          Ant Design Table 展示数据行；点击「详情」弹出详情模态框（包含
          NexusForm 表单 + richText 富文本预览）；点击「编辑」打开编辑模态框，
          使用同一 Schema 的 NexusForm 进行数据修改。
        </Paragraph>

        {/* ── 数据表格 ─────────────────────────────────────────────────────── */}
        <Table<ArticleRecord>
          columns={columns}
          dataSource={tableData}
          scroll={{ x: 800 }}
          pagination={{ pageSize: 10 }}
        />
      </div>
    </MainArea>
  );
}
