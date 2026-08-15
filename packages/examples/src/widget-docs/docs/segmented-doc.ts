// ============================================================================
// segmented-doc — 分段控制器组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const segmentedDoc: WidgetDoc = {
  id: 'segmented',
  group: '选择类',
  title: '分段控制器',
  english: 'Segmented',
  description:
    '分段选择器，选项紧凑横排，适合 Tab 切换/视图模式等场景。block 开启整行宽度，size/variant 沿用公共属性。',
  demos: [
    {
      title: '基础用法',
      description:
        'enum + enumNames 声明分段选项，值以 string 保存；size 控制尺寸。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          viewMode: {
            type: 'string',
            widget: 'segmented',
            title: '视图模式',
            enum: ['list', 'grid', 'calendar'],
            enumNames: ['列表', '网格', '日历'],
          },
          density: {
            type: 'string',
            widget: 'segmented',
            title: '密度（小尺寸）',
            enum: ['compact', 'comfortable', 'loose'],
            enumNames: ['紧凑', '舒适', '宽松'],
            props: { size: 'small' },
          },
        },
      },
    },
    {
      title: '整行宽度',
      description:
        'block 开启后分段控制器占满整行，左右拉伸至等宽；适合作为表单工具条分组控件。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          timeRange: {
            type: 'string',
            widget: 'segmented',
            title: '时间范围（整行）',
            enum: ['today', 'week', 'month', 'quarter', 'year'],
            enumNames: ['今日', '本周', '本月', '本季度', '全年'],
            props: { block: true },
          },
        },
      },
    },
  ],
};
