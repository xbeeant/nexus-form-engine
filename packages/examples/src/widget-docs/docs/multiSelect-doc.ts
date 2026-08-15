// ============================================================================
// multiSelect-doc — 多选组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const multiSelectDoc: WidgetDoc = {
  id: 'multiSelect',
  group: '选择类',
  title: '多选',
  english: 'MultiSelect',
  description:
    '多选下拉，值以数组存储。支持多选（multiple）与标签（tags，可自由输入）两种模式，可限制最大选中数与展示标签数。',
  demos: [
    {
      title: '多选模式',
      description:
        '字段类型为 array，值以数组存储。maxCount 限制最大选中数；maxTagCount 限制已选标签展示数（超出显示 +N）。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          tags: {
            type: 'array',
            widget: 'multiSelect',
            title: '兴趣标签',
            enum: ['frontend', 'backend', 'ai', 'design', 'ops', 'data'],
            enumNames: ['前端', '后端', 'AI', '设计', '运维', '数据'],
            props: {
              mode: 'multiple',
              maxTagCount: 2,
              allowClear: true,
            },
          },
          limit: {
            type: 'array',
            widget: 'multiSelect',
            title: '限定选 3 项',
            enum: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'],
            enumNames: ['选项 1', '选项 2', '选项 3', '选项 4', '选项 5', '选项 6'],
            props: { mode: 'multiple', maxCount: 3 },
          },
        },
      },
    },
    {
      title: '标签模式（可自由输入）',
      description:
        'mode: "tags" 允许输入不存在的选项并作为标签保存；tokenSeparators 声明分隔符，输入时自动分词成多个标签。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          keywords: {
            type: 'array',
            widget: 'multiSelect',
            title: '关键词',
            enum: ['nexus', 'schema', 'form'],
            props: {
              mode: 'tags',
              tokenSeparators: [',', ';'],
              placeholder: '输入后回车，逗号/分号自动分词',
            },
          },
          langs: {
            type: 'array',
            widget: 'multiSelect',
            title: '编程语言',
            enum: ['typescript', 'javascript', 'rust', 'go', 'python'],
            props: { mode: 'tags', maxTagCount: 3 },
          },
        },
      },
    },
    {
      title: '可搜索多选',
      description:
        'showSearch 开启后可从长列表中快速过滤选择。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          frameworks: {
            type: 'array',
            widget: 'multiSelect',
            title: '常用框架',
            showSearch: true,
            enum: Array.from({ length: 16 }, (_, i) => `fw-${i + 1}`),
            enumNames: Array.from(
              { length: 16 },
              (_, i) => `框架/库选项 ${i + 1}`,
            ),
            props: { mode: 'multiple', listHeight: 160 },
          },
        },
      },
    },
  ],
};
