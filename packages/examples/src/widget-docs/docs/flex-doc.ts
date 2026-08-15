// ============================================================================
// flex-doc — 弹性布局组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const flexDoc: WidgetDoc = {
  id: 'flex',
  group: '布局',
  title: '弹性布局',
  english: 'Flex',
  description:
    '弹性布局容器。direction 控制水平/垂直排布，gap 控制间距，align/justify 控制对齐；子字段可用 width 控制自身宽度。布局 Key 不进入数据路径。',
  demos: [
    {
      title: '水平排列',
      description:
        'direction: "row" 子字段横向排列；gap 控制间距；子字段 width 控制宽度占比。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          searchRow: {
            type: 'flex',
            direction: 'row',
            gap: 8,
            properties: {
              keyword: {
                type: 'string',
                widget: 'input',
                title: '关键词',
                width: '60%',
              },
              category: {
                type: 'string',
                widget: 'select',
                title: '分类',
                enum: ['all', 'docs', 'code'],
                enumNames: ['全部', '文档', '代码'],
              },
            },
          },
        },
      },
    },
    {
      title: '垂直排列',
      description:
        'direction: "column" 子字段纵向堆叠；justify 控制主轴对齐、align 控制交叉轴对齐。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          settings: {
            type: 'flex',
            direction: 'column',
            gap: 4,
            properties: {
              notify: {
                type: 'boolean',
                widget: 'switch',
                title: '开启通知',
              },
              autoUpdate: {
                type: 'boolean',
                widget: 'switch',
                title: '自动更新',
              },
              theme: {
                type: 'string',
                widget: 'segmented',
                title: '主题',
                enum: ['light', 'dark', 'auto'],
                enumNames: ['浅色', '深色', '跟随系统'],
              },
            },
          },
        },
      },
    },
  ],
  fallbackProps: [
    { name: 'direction', description: '主轴方向（row 水平 / column 垂直）', type: 'row | column', defaultValue: 'row' },
    { name: 'gap', description: '子项间距（px）', type: 'number', defaultValue: '8' },
    { name: 'align', description: '交叉轴对齐（start/center/end/baseline）', type: 'string', defaultValue: 'start' },
    { name: 'justify', description: '主轴对齐（flex-start/center/flex-end/space-between...）', type: 'string', defaultValue: 'flex-start' },
    { name: 'wrap', description: '是否自动换行', type: 'boolean', defaultValue: 'false' },
    { name: 'width', description: '子字段自身宽度（写在子字段节点上，如 60%）', type: 'string', defaultValue: '-' },
  ],
};