// ============================================================================
// autoComplete-doc — 自动完成组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const autoCompleteDoc: WidgetDoc = {
  id: 'autoComplete',
  group: '复杂选择',
  title: '自动完成',
  english: 'AutoComplete',
  description:
    '输入联想补全。enum 声明候选项，输入时按前缀过滤；支持键盘上下键选择、回车回填（backfill）与清除。',
  demos: [
    {
      title: '基础用法',
      description:
        'enum 声明候选项（label 展示、value 提交）；allowClear 开启清除按钮。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          product: {
            type: 'string',
            widget: 'autoComplete',
            title: '产品搜索',
            placeholder: '输入关键字自动补全',
            enum: ['Ant Design', 'AntV', 'ProComponents', 'Nexus Form'],
            props: { allowClear: true },
          },
          email: {
            type: 'string',
            widget: 'autoComplete',
            title: '邮箱域名补全',
            enum: ['@gmail.com', '@outlook.com', '@qq.com'],
          },
        },
      },
    },
    {
      title: '键盘回填与首项激活',
      description:
        'backfill 开启后键盘选中候选项时立即回填输入框；defaultActiveFirstOption 默认高亮第一个候选。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          framework: {
            type: 'string',
            widget: 'autoComplete',
            title: '技术栈（回填）',
            enum: ['React', 'Vue', 'Angular', 'Svelte'],
            props: {
              backfill: true,
              defaultActiveFirstOption: true,
            },
          },
        },
      },
    },
  ],
};
