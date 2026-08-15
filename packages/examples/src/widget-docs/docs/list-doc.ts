// ============================================================================
// list-doc — 常规列表组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const listDoc: WidgetDoc = {
  id: 'list',
  group: '列表',
  title: '常规列表',
  english: 'List',
  description:
    '卡片式动态列表，适合字段较多、一条条录入的结构化数据（如成员、明细）。items 声明每一项的对象结构，值以数组保存；支持添加/删除/复制/移动。',
  demos: [
    {
      title: '基础用法',
      description:
        'items 为对象容器，其 properties 即列表项字段；addText 定制添加按钮文案；初始数据通过 initialValues 提供。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          members: {
            type: 'array',
            widget: 'list',
            title: '项目成员',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  widget: 'input',
                  title: '姓名',
                  required: true,
                },
                role: {
                  type: 'string',
                  widget: 'select',
                  title: '角色',
                  enum: ['dev', 'design', 'pm', 'qa'],
                  enumNames: ['开发', '设计', '产品', '测试'],
                },
              },
            },
            props: { addText: '添加成员' },
          },
        },
      },
      initialValues: {
        members: [{ name: '张三', role: 'dev' }],
      },
    },
    {
      title: '按钮控制与文案',
      description:
        'addText/removeText/copyText 定制按钮文案；hideAddButton/hideDeleteButton/hideMoveButton/hideCopyButton 控制按钮显隐。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          milestones: {
            type: 'array',
            widget: 'list',
            title: '里程碑（隐藏删除按钮）',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', widget: 'input', title: '名称' },
                date: { type: 'string', widget: 'date', title: '日期' },
              },
            },
            props: {
              addText: '新增里程碑',
              removeText: '移除',
              copyText: '复制',
              hideDeleteButton: true,
            },
          },
        },
      },
    },
  ],
};
