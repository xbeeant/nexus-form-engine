// ============================================================================
// steps-doc — 步骤条布局组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const stepsDoc: WidgetDoc = {
  id: 'steps',
  group: '布局',
  title: '步骤条',
  english: 'Steps',
  description:
    '步骤条容器，将表单拆分为多步流程。子节点为 step（title 即步骤名），按顺序展示当前步骤的表单字段。布局 Key 不进入数据路径。',
  demos: [
    {
      title: '三步流程',
      description:
        'steps 下挂 step 面板（title 为步骤名）；当前步骤展示其 properties 字段；所有步骤字段数据路径均为根级。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          applySteps: {
            type: 'steps',
            properties: {
              step1: {
                type: 'step',
                title: '基本信息',
                properties: {
                  name: {
                    type: 'string',
                    widget: 'input',
                    title: '姓名',
                    required: true,
                  },
                  email: {
                    type: 'string',
                    widget: 'input',
                    title: '邮箱',
                    required: true,
                  },
                },
              },
              step2: {
                type: 'step',
                title: '职业信息',
                properties: {
                  occupation: {
                    type: 'string',
                    widget: 'input',
                    title: '职业',
                  },
                  company: {
                    type: 'string',
                    widget: 'input',
                    title: '公司',
                  },
                },
              },
              step3: {
                type: 'step',
                title: '完成确认',
                properties: {
                  agreed: {
                    type: 'boolean',
                    widget: 'checkbox',
                    title: '我已确认以上信息属实',
                    required: true,
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
    {
      name: 'title',
      description: '步骤名（写在 step 子节点上）',
      type: 'string',
      defaultValue: '-',
    },
  ],
};
