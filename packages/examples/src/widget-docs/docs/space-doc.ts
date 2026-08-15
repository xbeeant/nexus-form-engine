// ============================================================================
// space-doc — 间距布局组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const spaceDoc: WidgetDoc = {
  id: 'space',
  group: '布局',
  title: '间距',
  english: 'Space',
  description:
    '间距容器，统一控制子字段之间的间距与对齐方式。direction 切换水平/垂直，size 控制间距档位。布局 Key 不进入数据路径。',
  demos: [
    {
      title: '垂直间距',
      description:
        'direction: "vertical" 字段纵向堆叠；size 控制间距（small/middle/large）。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          stack: {
            type: 'space',
            props: { direction: 'vertical', size: 'middle' },
            properties: {
              nickname: {
                type: 'string',
                widget: 'input',
                title: '昵称',
              },
              motto: {
                type: 'string',
                widget: 'input',
                title: '个性签名',
              },
            },
          },
        },
      },
    },
    {
      title: '水平间距与对齐',
      description:
        'direction: "horizontal" 字段横向排布；align 控制对齐方式；wrap 允许换行。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          row: {
            type: 'space',
            props: {
              direction: 'horizontal',
              size: 'small',
              wrap: true,
            },
            properties: {
              keyword: {
                type: 'string',
                widget: 'input',
                title: '关键词',
              },
              range: {
                type: 'string',
                widget: 'select',
                title: '范围',
                enum: ['today', 'week', 'month'],
                enumNames: ['今日', '本周', '本月'],
              },
              sort: {
                type: 'string',
                widget: 'select',
                title: '排序',
                enum: ['time', 'hot'],
                enumNames: ['最新', '热门'],
              },
            },
          },
        },
      },
    },
  ],
};
