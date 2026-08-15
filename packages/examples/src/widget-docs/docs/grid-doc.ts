// ============================================================================
// grid-doc — 栅格布局组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const gridDoc: WidgetDoc = {
  id: 'grid',
  group: '布局',
  title: '栅格',
  english: 'Grid',
  description:
    '栅格容器，按列数等宽排布子字段。column 声明列数、gap 声明间距；子字段可用 colSpan 跨列。布局 Key 不进入数据路径。',
  demos: [
    {
      title: '两列栅格',
      description:
        'column: 2 将子字段等宽分为两列；gap 控制列间距。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          profileGrid: {
            type: 'grid',
            column: 2,
            gap: 16,
            properties: {
              firstName: {
                type: 'string',
                widget: 'input',
                title: '名',
                required: true,
              },
              lastName: {
                type: 'string',
                widget: 'input',
                title: '姓',
                required: true,
              },
              phone: { type: 'string', widget: 'input', title: '手机号' },
              city: {
                type: 'string',
                widget: 'select',
                title: '城市',
                enum: ['beijing', 'shanghai', 'hangzhou'],
                enumNames: ['北京', '上海', '杭州'],
              },
            },
          },
        },
      },
    },
    {
      title: '三列与跨列',
      description:
        'column: 3 三列排布；子字段 colSpan: 2 跨两列；colSpan: 3 占满整行。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          teamGrid: {
            type: 'grid',
            column: 3,
            gap: 12,
            properties: {
              name: {
                type: 'string',
                widget: 'input',
                title: '团队名称（跨 3 列）',
                colSpan: 3,
                required: true,
              },
              leader: {
                type: 'string',
                widget: 'input',
                title: '负责人',
                colSpan: 2,
              },
              size: {
                type: 'number',
                widget: 'number',
                title: '人数',
              },
            },
          },
        },
      },
    },
  ],
  fallbackProps: [
    { name: 'column', description: '栅格列数（等宽分列）', type: 'number', defaultValue: '2' },
    { name: 'gap', description: '列间距（px）', type: 'number', defaultValue: '12' },
    { name: 'colSpan', description: '子字段跨列数（写在子字段节点上）', type: 'number', defaultValue: '-' },
  ],
};