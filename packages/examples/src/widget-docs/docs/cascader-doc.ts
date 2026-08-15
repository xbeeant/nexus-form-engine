// ============================================================================
// cascader-doc — 级联选择组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

const cascaderTree = JSON.stringify([
  {
    value: 'zhejiang',
    label: '浙江',
    children: [
      { value: 'hangzhou', label: '杭州' },
      { value: 'ningbo', label: '宁波' },
    ],
  },
  {
    value: 'jiangsu',
    label: '江苏',
    children: [
      { value: 'nanjing', label: '南京' },
      { value: 'suzhou', label: '苏州' },
    ],
  },
  {
    value: 'guangdong',
    label: '广东',
    children: [
      { value: 'guangzhou', label: '广州' },
      { value: 'shenzhen', label: '深圳' },
    ],
  },
]);

export const cascaderDoc: WidgetDoc = {
  id: 'cascader',
  group: '复杂选择',
  title: '级联选择',
  english: 'Cascader',
  description:
    '多级联动选择，适合省市区、组织架构等层级数据。级联数据通过 cascaderData（JSON）声明；支持选中即提交、多选与搜索。',
  demos: [
    {
      title: '基础用法',
      description:
        'cascaderData 以 JSON 字符串声明多级数据（value/label/children 结构），值以路径数组保存（如 ["zhejiang","hangzhou"]）。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          region: {
            type: 'array',
            widget: 'cascader',
            title: '所在地区',
            required: true,
            props: { cascaderData: cascaderTree, allowClear: true },
          },
        },
      },
    },
    {
      title: '选中即提交与搜索',
      description:
        'changeOnSelect 允许选中父级即提交（不强制选到叶子）；showSearch 开启选项搜索；expandTrigger 切换展开触发方式（点击/悬停）。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          dept: {
            type: 'array',
            widget: 'cascader',
            title: '部门（父级可选）',
            props: {
              cascaderData: cascaderTree,
              changeOnSelect: true,
              showSearch: true,
            },
          },
          hoverRegion: {
            type: 'array',
            widget: 'cascader',
            title: '地区（悬停展开）',
            props: {
              cascaderData: cascaderTree,
              expandTrigger: 'hover',
            },
          },
        },
      },
    },
    {
      title: '多选模式',
      description:
        'multiple 开启多选，值保存为多条路径数组；同样可配合 showSearch 使用。',
      schema: {
        type: 'array',
        widget: 'cascader',
        title: '常驻地区（多选）',
        props: {
          cascaderData: cascaderTree,
          multiple: true,
        },
      },
    },
  ],
};
