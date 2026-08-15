// ============================================================================
// collapse-doc — 折叠面板布局组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const collapseDoc: WidgetDoc = {
  id: 'collapse',
  group: '布局',
  title: '折叠面板',
  english: 'Collapse',
  description:
    '折叠面板容器，将字段按面板收起/展开。子节点为 collapsePanel（title 即面板标题）。布局 Key 不进入数据路径。',
  demos: [
    {
      title: '基础用法',
      description:
        'collapse 下挂 collapsePanel 面板；默认展开状态展示全部字段，点击面板标题可收起。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          advancedCollapse: {
            type: 'collapse',
            properties: {
              panel1: {
                type: 'collapsePanel',
                title: '基础配置',
                properties: {
                  name: { type: 'string', widget: 'input', title: '名称' },
                  version: {
                    type: 'string',
                    widget: 'input',
                    title: '版本号',
                  },
                },
              },
              panel2: {
                type: 'collapsePanel',
                title: '高级配置',
                properties: {
                  retries: {
                    type: 'number',
                    widget: 'number',
                    title: '重试次数',
                  },
                  timeout: {
                    type: 'number',
                    widget: 'number',
                    title: '超时时间（秒）',
                  },
                  notify: {
                    type: 'boolean',
                    widget: 'switch',
                    title: '失败通知',
                  },
                },
              },
            },
          },
        },
      },
    },
  ],
  fallbackProps: [
    { name: 'title', description: '面板标题（写在 collapsePanel 子节点上）', type: 'string', defaultValue: '-' },
  ],
};