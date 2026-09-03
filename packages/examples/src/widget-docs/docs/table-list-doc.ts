// ============================================================================
// tableList-doc — 表格列表组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const tableListDoc: WidgetDoc = {
  id: 'tableList',
  group: '列表',
  title: '表格列表',
  english: 'TableList',
  description:
    '表格形态的动态列表，items 的每个字段即一列，适合财务明细、订单行等批量录入场景。支持行添加/删除与横向滚动。',
  demos: [
    {
      title: '基础用法',
      description:
        'items.properties 定义列（title 即列名）；支持多字段组合、默认值；addText 定制添加按钮文案。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          orders: {
            type: 'array',
            widget: 'tableList',
            title: '采购明细',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', widget: 'input', title: '商品' },
                price: {
                  type: 'number',
                  widget: 'number',
                  title: '单价',
                  default: 0,
                },
                quantity: {
                  type: 'number',
                  widget: 'number',
                  title: '数量',
                  default: 1,
                },
              },
            },
            props: { addText: '添加一行' },
          },
        },
      },
      initialValues: {
        orders: [
          { name: '机械键盘', price: 399, quantity: 2 },
          { name: '显示器', price: 1299, quantity: 1 },
        ],
      },
    },
    {
      title: '横向滚动与按钮控制',
      description:
        'scrollX 开启横向滚动（列多时）；hideAddButton/hideDeleteButton 控制按钮显隐。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          schedule: {
            type: 'array',
            widget: 'tableList',
            title: '排期表',
            items: {
              type: 'object',
              properties: {
                task: { type: 'string', widget: 'input', title: '任务' },
                owner: { type: 'string', widget: 'input', title: '负责人' },
                status: {
                  type: 'string',
                  widget: 'select',
                  title: '状态',
                  enum: ['todo', 'doing', 'done'],
                  enumNames: ['待办', '进行中', '已完成'],
                },
                due: { type: 'string', widget: 'date', title: '截止日期' },
              },
            },
            props: {
              scrollX: true,
              hideAddButton: false,
            },
          },
        },
      },
    },
  ],
};
