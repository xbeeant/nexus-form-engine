// ============================================================================
// treeSelect-doc — 树选择组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

const orgTree = JSON.stringify([
  {
    value: 'root',
    title: '总公司',
    children: [
      {
        value: 'tech',
        title: '技术部',
        children: [
          { value: 'fe', title: '前端组' },
          { value: 'be', title: '后端组' },
          { value: 'ai', title: 'AI 组' },
        ],
      },
      {
        value: 'ops',
        title: '运营部',
        children: [
          { value: 'market', title: '市场组' },
          { value: 'sale', title: '销售组' },
        ],
      },
    ],
  },
]);

export const treeSelectDoc: WidgetDoc = {
  id: 'treeSelect',
  group: '复杂选择',
  title: '树选择',
  english: 'TreeSelect',
  description:
    '树形结构选择器。props.treeData 声明静态树数据；也可配置 url 从接口异步加载（异步子节点、搜索、懒加载）。',
  demos: [
    {
      title: '静态树数据',
      description:
        'props.treeData 以 value/title/children 嵌套结构声明；treeDefaultExpandAll 默认展开全部节点；allowClear 允许清除。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          department: {
            type: 'string',
            widget: 'treeSelect',
            title: '所属部门',
            props: {
              treeData: JSON.parse(orgTree) as unknown,
              treeDefaultExpandAll: true,
              allowClear: true,
            },
          },
        },
      },
    },
    {
      title: '多选与复选框',
      description:
        'multiple + treeCheckable 渲染带复选框的树；showCheckedStrategy 控制选中回填策略（仅子节点/仅父节点/全部）；maxTagCount 限制标签数。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          teams: {
            type: 'array',
            widget: 'treeSelect',
            title: '参与团队（多选）',
            props: {
              treeData: JSON.parse(orgTree) as unknown,
              multiple: true,
              treeCheckable: true,
              showCheckedStrategy: 'SHOW_CHILD',
              maxTagCount: 3,
              treeDefaultExpandAll: true,
            },
          },
        },
      },
    },
  ],
};
