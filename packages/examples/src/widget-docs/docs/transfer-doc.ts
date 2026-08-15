// ============================================================================
// transfer-doc — 穿梭框组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

const transferItems = JSON.stringify([
  { key: 'n1', title: '数据表 A' },
  { key: 'n2', title: '数据表 B' },
  { key: 'n3', title: '数据表 C' },
  { key: 'n4', title: '数据表 D' },
  { key: 'n5', title: '数据表 E' },
  { key: 'n6', title: '数据表 F' },
]);

export const transferDoc: WidgetDoc = {
  id: 'transfer',
  group: '复杂选择',
  title: '穿梭框',
  english: 'Transfer',
  description:
    '双列穿梭选择，用于批量授权、字段映射等场景。数据源通过 transferData（JSON）声明，值以 key 数组保存。',
  demos: [
    {
      title: '基础用法',
      description:
        'transferData 声明数据源（key/title 结构）；titles 通过逗号分隔设置左右列标题；值保存为已选 key 数组。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          permitted: {
            type: 'array',
            widget: 'transfer',
            title: '数据表授权',
            props: {
              transferData: transferItems,
              titles: '未授权,已授权',
            },
          },
        },
      },
    },
    {
      title: '可搜索与单向',
      description:
        'showSearch 开启两侧搜索；oneWay 限制只能从左侧移到右侧（单向授权场景）。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          granted: {
            type: 'array',
            widget: 'transfer',
            title: '字段映射（单向）',
            props: {
              transferData: transferItems,
              showSearch: true,
              oneWay: true,
              titles: '可选字段,已映射字段',
            },
          },
        },
      },
    },
  ],
};
