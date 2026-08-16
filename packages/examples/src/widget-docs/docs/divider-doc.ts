// ============================================================================
// divider-doc — 分隔线布局组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const dividerDoc: WidgetDoc = {
  id: 'divider',
  group: '布局',
  title: '分隔线',
  english: 'Divider',
  description:
    '水平分隔线，用于分区之间的视觉分隔。title 可显示在分隔线左侧；无子字段，Key 不进入数据路径。',
  demos: [
    {
      title: '分区分隔线',
      description:
        'title 显示在分隔线左侧；无 title 时为纯分隔线，可拆分表单区块。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          section1: {
            type: 'divider',
            title: '账号信息',
            properties: {},
          },
          username: {
            type: 'string',
            widget: 'input',
            title: '用户名',
            required: true,
          },
          plainDivider: {
            type: 'divider',
            properties: {},
          },
          section2: {
            type: 'divider',
            title: '安全设置',
            properties: {},
          },
          password: {
            type: 'string',
            widget: 'password',
            title: '密码',
            required: true,
          },
        },
      },
    },
  ],
  fallbackProps: [
    {
      name: 'title',
      description: '分隔线文字（显示在左侧）',
      type: 'string',
      defaultValue: '-',
    },
  ],
};
