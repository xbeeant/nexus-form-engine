// ============================================================================
// mentions-doc — 提及组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const mentionsDoc: WidgetDoc = {
  id: 'mentions',
  group: '复杂选择',
  title: '提及',
  english: 'Mentions',
  description:
    '带 @ 触发候选的多行输入框，适合评论 @ 成员、周报 @ 同事等场景。候选通过 enum 声明，prefix 自定义触发前缀。',
  demos: [
    {
      title: '@ 成员提及',
      description:
        'enum 声明提及候选（显示 label、值可自定义）；输入 @ 后弹出候选列表；值以字符串保存（含 @ 前缀）。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          comment: {
            type: 'string',
            widget: 'mentions',
            title: '评论内容',
            placeholder: '输入 @ 提及成员',
            enum: ['alice', 'bob', 'charlie', 'dave'],
            enumNames: ['Alice 张', 'Bob 李', 'Charlie 王', 'Dave 赵'],
            props: {
              rows: 3,
              autoSize: true,
            },
          },
        },
      },
    },
    {
      title: '自定义触发前缀与行数',
      description:
        'prefix 替换默认 @ 触发前缀；rows 控制固定行数；allowClear 开启清除。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          taskRef: {
            type: 'string',
            widget: 'mentions',
            title: '关联需求',
            description: '输入 # 关联需求编号',
            enum: ['REQ-1001', 'REQ-1002', 'REQ-2001'],
            props: {
              prefix: '#',
              rows: 2,
              allowClear: true,
            },
          },
        },
      },
    },
  ],
};
