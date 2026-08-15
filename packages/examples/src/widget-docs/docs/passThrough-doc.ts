// ============================================================================
// passThrough-doc — 透传布局组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const passThroughDoc: WidgetDoc = {
  id: 'passThrough',
  group: '布局',
  title: '透传',
  english: 'PassThrough',
  description:
    '透传容器，不做任何包裹，直接将子字段渲染到父级。用于需要语义化分组但不想引入视觉容器的场景。布局 Key 不进入数据路径。',
  demos: [
    {
      title: '透明分组',
      description:
        'passThrough 只做逻辑分组（如按「核心字段/扩展字段」组织 schema），渲染时子字段直接平铺在表单中。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          coreGroup: {
            type: 'passThrough',
            properties: {
              name: {
                type: 'string',
                widget: 'input',
                title: '姓名（核心）',
                required: true,
              },
              email: {
                type: 'string',
                widget: 'input',
                title: '邮箱（核心）',
              },
            },
          },
          extGroup: {
            type: 'passThrough',
            properties: {
              remark: {
                type: 'string',
                widget: 'textarea',
                title: '备注（扩展）',
              },
            },
          },
        },
      },
    },
  ],
  fallbackProps: [
  ],
};