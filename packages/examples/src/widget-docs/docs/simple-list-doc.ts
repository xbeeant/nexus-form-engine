// ============================================================================
// simpleList-doc — 简单列表组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const simpleListDoc: WidgetDoc = {
  id: 'simpleList',
  group: '列表',
  title: '简单列表',
  english: 'SimpleList',
  description:
    '轻量动态列表，适合单字段或短结构的数组录入（如标签、链接列表）。items 内的字段横向紧凑排列，支持添加/删除/复制/移动。',
  demos: [
    {
      title: '单字段列表',
      description:
        'items 中仅一个字段时渲染为紧凑的单行输入；值以数组保存；addText 定制添加按钮文案。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          tags: {
            type: 'array',
            widget: 'simpleList',
            title: '标签列表',
            items: {
              type: 'object',
              properties: {
                value: {
                  type: 'string',
                  widget: 'input',
                  title: '标签名',
                  placeholder: '输入标签',
                },
              },
            },
            props: { addText: '添加标签' },
          },
        },
      },
      initialValues: {
        tags: [{ value: 'form-engine' }, { value: 'schema' }],
      },
    },
    {
      title: '多字段与按钮控制',
      description:
        'items 含多个字段时并排展示；hideDeleteButton/hideMoveButton/hideCopyButton 控制按钮显隐。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          links: {
            type: 'array',
            widget: 'simpleList',
            title: '友情链接',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', widget: 'input', title: '名称' },
                url: { type: 'string', widget: 'urlInput', title: '地址' },
              },
            },
            props: {
              addText: '添加链接',
              hideMoveButton: true,
              hideCopyButton: true,
            },
          },
        },
      },
    },
  ],
};
