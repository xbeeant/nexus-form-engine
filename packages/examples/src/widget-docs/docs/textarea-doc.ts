// ============================================================================
// textarea-doc — 文本域组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const textareaDoc: WidgetDoc = {
  id: 'textarea',
  group: '基础输入',
  title: '文本域',
  english: 'TextArea',
  description:
    '多行文本输入框，适合长文本内容。支持固定行数、自适应高度（autoSize + minRows/maxRows）、字数统计与最大长度限制。',
  demos: [
    {
      title: '固定行数',
      description:
        'rows 控制文本域行数（默认 3 行）；allowClear 开启清除按钮，size 控制尺寸。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          address: {
            type: 'string',
            widget: 'textarea',
            title: '详细地址',
            placeholder: '请输入收货地址',
            required: true,
            props: { rows: 3, allowClear: true },
          },
          note: {
            type: 'string',
            widget: 'textarea',
            title: '备注',
            placeholder: '可填写 5 行',
            props: { rows: 5, size: 'small' },
          },
        },
      },
    },
    {
      title: '自适应高度',
      description:
        'autoSize 开启后高度随内容自动增长；配合 minRows/maxRows 约束最小/最大行数，内容超过 maxRows 后出现滚动条。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          bio: {
            type: 'string',
            widget: 'textarea',
            title: '个人简介',
            props: {
              autoSize: true,
              minRows: 2,
              maxRows: 6,
            },
          },
          suggestion: {
            type: 'string',
            widget: 'textarea',
            title: '建议反馈',
            props: {
              autoSize: true,
              minRows: 1,
              maxRows: 4,
            },
          },
        },
      },
    },
    {
      title: '字数统计与长度限制',
      description:
        'maxLength 限制最大字符数（字段级约束自动转为校验规则），showCount 实时展示已输入字数。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          summary: {
            type: 'string',
            widget: 'textarea',
            title: '摘要',
            description: '最多 50 字，超出无法输入并触发校验',
            max: 50,
            props: { showCount: true, maxLength: 50 },
          },
          comment: {
            type: 'string',
            widget: 'textarea',
            title: '评论',
            max: 200,
            props: {
              showCount: true,
              maxLength: 200,
              autoSize: true,
              minRows: 2,
            },
          },
        },
      },
    },
  ],
};
