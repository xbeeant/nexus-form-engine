// ============================================================================
// checkbox-doc — 复选框组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const checkboxDoc: WidgetDoc = {
  id: 'checkbox',
  group: '选择类',
  title: '复选框',
  english: 'Checkbox',
  description:
    '布尔型勾选框，值为 true/false。indeterminate 可展示半选状态（如「全选」按钮的中间态）。',
  demos: [
    {
      title: '基础用法',
      description:
        '字段类型为 boolean，选中值为 true。required 校验「必须勾选」（如同意协议）。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          agreed: {
            type: 'boolean',
            widget: 'checkbox',
            title: '我已阅读并同意《用户协议》',
            required: true,
            bind: 'agreed',
          },
          subscribe: {
            type: 'boolean',
            widget: 'checkbox',
            title: '订阅产品动态',
            default: true,
          },
        },
      },
    },
    {
      title: '半选状态（indeterminate）',
      description:
        'indeterminate 声明组件处于不确定（半选）状态，常用于「全选」的中间态展示；初始值可通过 default 设置。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          selectAll: {
            type: 'boolean',
            widget: 'checkbox',
            title: '全选（当前为半选状态）',
            props: { indeterminate: true },
            bind: false,
          },
          itemA: {
            type: 'boolean',
            widget: 'checkbox',
            title: '条款 A',
            default: true,
          },
          itemB: {
            type: 'boolean',
            widget: 'checkbox',
            title: '条款 B',
          },
        },
      },
    },
  ],
};
